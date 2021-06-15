/*
 npm modules ===================================================
 */
var crypto = require('crypto');
var fs = require("fs");
var _ = require('underscore');
var request = require("request");
var mysql = require("mysql");
var TOTP = require('onceler').TOTP;
var moment = require("moment");
var cronJob = require('cron').CronJob;
var Random = require("random-js");
var random = new Random(Random.engines.mt19937().autoSeed());

var fn, mysqlConn, io;
var ioConfig = require('./ioConfig');
/*
 variants for game ==========================================================
 */
var totp = new TOTP(ioConfig.BIT_SKINS_SECRET); //TOTP('BIT_SKINS_SECRET');
var bitAPI= ioConfig.bitAPI; //bitskins api
var accesspw = ioConfig.accesspw; //set this to whatever you want as long as it is matching the same variable in config.php (this is used to safely access endgame.php and cost.php) //

var gametime=31;
var closebetstime=gametime-1;

var connections = 0;
var timer=null;
var bets = 0;
var low_cached = 0;
var high_cached = 0;
var zero_cached = 0;
var activeDeposits = 0;
var gameStatus = 'active';
var round = null;

var userCache={};
var gameBalance={red: 0, black: 0, green: 0};

var betsCache={};
var giveawayCache={};
var g_cache = {};

var last_g_check = null;
var last_s_check = null;

var alert;
var canUpdateOnline=true;
var connectedUsers={};
var unique={};
var depositQueue={};
var gameQueries=[];

var last_items_json;

var maxLogins=1600;
var req_dep_active2 = 0;
var max_active_dep = 30;

var priceList;
var chatLimit = 25000;
var gQPass=0;
var previousmessages = {};
var chatcooldown = {};
var maxItemsDeposit = 25;
var maxDepositsQueue = 35;
var locks = {};
var activeloadings = {};
var intervals = {};

/*
 common functions
 */
var reload_prices_from_file = function(){
    priceList=JSON.parse(fs.readFileSync('prices_sa.db','utf-8'));
    console.log('Re-loaded '+Object.keys(priceList).length+' priced items.');
};

var refreshChatLimit = function(){
    var connUsers=Object.keys(connectedUsers).length;
    if(connUsers<200){
        chatLimit=10000;
    }else if(connUsers>=200 && connUsers<350){
        chatLimit=30000;
    }else if(connUsers>=350 && connUsers<500){
        chatLimit=50000;
    }else if(connUsers>=500 && connUsers<1000){
        chatLimit=75000;
    }else if(connUsers>=1000){
        chatLimit=125000;
    }
    console.log('Chat limit: '+chatLimit);
};

var fetch_prices_new = function(){
    //Open DB connection
    var mysqlConn2 = mysql.createConnection(ioConfig.mysql2);
    mysqlConn2.connect(function(err) {
        if (err) {
            fn.myConsoleLog('MYSQL ERROR. err.code: ' + err.code + ' (err.fatal: ' + err.fatal + ')');
            fn.myConsoleLog('MYSQL ERROR. err.stack: ' + err.stack);
            return;
        }
        fn.myConsoleLog('Connected to MySQL database "' + ioConfig.mysql2['database'] + '" on host "' + ioConfig.mysql2['host'] + '". Connection id: ' + mysqlConn.threadId);
    });

    var fileURL='prices_sa.db';
    var toSave={};
    request({
        'url': 'http://api.steamanalyst.com/apiV2.php?key='+ ioConfig.requestKey,
        'json': true
    },function(err,res,body){
        if(err){
            var errMsg='[FETCH PRICES] Requesting steamanalyst price database failed. Error: '+err;
            console.log(errMsg);
            return;
        }else{
            if(typeof body.results === 'undefined' || body.results.length<1000 || res.statusCode != 200){
                reload_prices_from_file();
                return;
            }
            console.log('[FETCH PRICES] Received body.results.length: '+body.results.length);
            var i=0;
            for(var iC=0; iC<body.results.length; iC++){
                var queryD='SELECT * FROM `price_overwrites` WHERE `item`="'+body.results[iC].market_name+'"';
                mysqlConn2.query(queryD,function(err,res2,fields){
                    if(err)
                        console.log('ERROR: '+err);
                    if(body.results[i].market_name=='? StatTrak™ Butterfly Knife | Blue Steel (Factory New)'){
                    }
                    if(res2.length!=0){
                        if(res2[0].price!=""){
                            console.log('[FETCH PRICES] Custom price for '+body.results[i].market_name+' = '+res2[0].price);
                            toSave[body.results[i].market_name]=res2[0].price;
                        }
                    }else{
                        if(typeof body.results[i].suggested_amount_min !== 'undefined'){
                            toSave[body.results[i].market_name]=body.results[i].suggested_amount_min;
                        }else{
                            toSave[body.results[i].market_name]=body.results[i].avg_price_7_days;
                        }
                    }
                    i++;
                    if(i==(body.results.length)){
                        console.log(i+'=='+body.results.length);
                        fs.writeFile(fileURL, JSON.stringify(toSave), function(err) {
                            if(err) {
                                return console.log(err);
                            }
                            console.log('[FETCH PRICES] '+fileURL+' saved ('+body.results.length+' items)');
                            reload_prices_from_file();
                            mysqlConn2.close();
                        });
                    }
                });
            }
        }
    });
};

var checkLogin = function(user, key, wsid, cache, callback){
    if(typeof user === 'undefined' || typeof key === 'undefined' || typeof wsid === 'undefined'){
        callback('Malformed checkLogin call.',false);
        return;
    }

    var cache= cache || false;
    if(typeof userCache[user] !== 'undefined' && typeof userCache[user].login_key !== 'undefined' && cache===true){
        if(userCache[user].login_key==key){
            if(typeof userCache[user].socketid !== 'undefined' && userCache[user].socketid != wsid){
                if(io.sockets.connected[userCache[user].socketid]){
                    //io.sockets.connected[userCache[user].socketid].disconnect();
                }
            }
            userCache[user].socketid=wsid;
            callback(false,userCache[user]);
        }else{
            //User can login and logout - so we need to check if their login key changed..
            mysqlConn.query('SELECT * FROM `users` WHERE `steamid`="'+ fn.addslashes(user)+'" AND `login_key`="'+ fn.addslashes(key)+'"', function(user_err, user_res, user_fields) {
                if(user_res.length>0){
                    userCache[user]=user_res[0];
                    callback(false,userCache[user]);
                } else {
                    callback('Cache exists, but login key is not valid',false);
                }
            });
        }
    } else {
        mysqlConn.query('SELECT * FROM `users` WHERE `steamid`="'+ fn.addslashes(user)+'" AND `login_key`="' + fn.addslashes(key)+'"', function(user_err, user_res, user_fields) {
            if(user_err){
                callback('Database error: '+user_err,false);
                return;
            }
            if(user_res.length==0){
                //callback('Not logged in / does not exist in database.',false);
                return;
            }
            userCache[user]=user_res[0];
            if(typeof userCache[user].socketid !== 'undefined' && userCache[user].socketid != wsid){
                if(io.sockets.connected[userCache[user].socketid]){
                    //io.sockets.connected[userCache[user].socketid].disconnect();
                    //console.log('disconnected '+userCache[user].socketid+' socket id from user '+user);
                }
            }
            userCache[user].socketid=wsid;
            callback(false,userCache[user]);
        });
    }
};

var getGiveaways = function(reload,callback){
    var now = (new Date).getTime();
    var checkFor = last_g_check + 30 * 1000;
    if (last_g_check == 30000 || now > checkFor) {
        last_g_check = (new Date).getTime();
        mysqlConn.query('SELECT * FROM `giveaways` WHERE `status`="active" OR `status`="cooldown" ORDER BY id DESC', function(user_err, user_res, user_fields) {
            if(user_res.length>0){
                for (var i in user_res) {
                    var id = user_res[i].id;
                    g_cache[id] = user_res[i];
                }
                callback(false,g_cache);
            } else {
                g_cache = {};
                last_g_check = 30000;
                callback(true,g_cache);
            }
        });
    } else {
        callback(false,g_cache);
    }
};

var getSponsored = function(reload,callback){
    var now = (new Date).getTime();
    var checkFor = last_s_check + 60 * 1000;
    if (last_s_check == 60000 || now > checkFor) {
        giveawayCache = {};
        last_s_check = (new Date).getTime();
        mysqlConn.query('SELECT * FROM `giveaways` WHERE `status`="active" OR `status`="cooldown" ORDER BY id DESC', function(user_err, user_res, user_fields) {
            if(user_res.length>0){
                var id = user_res[0].id;
                var endtime =  user_res[0].endtime;
                //Get the number of entries in the giveaway
                mysqlConn.query('SELECT * FROM `giveaway_'+id+'`', function(user_err, giveaway_res, user_fields) {
                    var entries = giveaway_res.length;
                    //Get the username of the person who started
                    var user = user_res[0].steamid;
                    mysqlConn.query('SELECT * FROM `users` WHERE `steamid`='+user_res[0].steamid+'', function(user_err, user_res2, user_fields) {
                        //There's an active giveaway YUP
                        giveawayCache[0]=user_res[0];
                        giveawayCache[0].username = user_res2[0].name;
                        giveawayCache[0].avatar = user_res2[0].avatar;
                        giveawayCache[0].entries = entries;
                        //var timestamp = moment.unix(endtime);
                        giveawayCache[0].endtime = endtime;
                        callback(false,giveawayCache);
                    });
                });
            } else {
                //console.log('No giveaways found..')
                last_s_check = 60000;
                giveawayCache = {};
                callback(true,giveawayCache);
            }
        });
    } else {
        //console.log('Sponsored cache has been found/Time not elapsed');
        if (!giveawayCache[0]) {
            giveawayCache = {};
            callback(true,giveawayCache);
        }
        else
            callback(false,giveawayCache);
    }
};

var closebets = function() {
    if(typeof betsCache[round] !== 'undefined'){
        var totalBets=betsCache[round].length;
    }else{
        var totalBets=0;
    }
    io.emit('closebets',totalBets);
    fn.myConsoleLog('Bets are closing.'+totalBets);
    gameStatus = 'ended';
};

var newendgame = function(roundd,callback){
    console.log('newendgame: '+roundd);
    console.log(gQPass+' game queries processed');
    gameQueries=[];
    mysqlConn.query('SELECT * FROM `games` WHERE `id`="'+roundd+'"',function(err,res){
        if(res.length==0){
            console.log('Game '+roundd+' is not in the database');
            return;
        }
        var gameinfo=res[0];
        var croll=gameinfo.roll;
        var crolltext=fn.rolltotext(croll);
        var cwobble=gameinfo.wobble;
        console.log('got gameinfo');
        if(typeof betsCache[roundd]==='undefined' || betsCache[roundd].length==0){
            console.log('Game '+roundd+' has no deposits (how has it started?)');
            return;
        }
        var deposits=betsCache[roundd];
        var totaldepositsvalue=0;
        var totalpaid=0;
        var totalprofit=0;
        var confirmeddeposits=0;
        var alldeposits=deposits.length;
        var allplayers={};
        var allplayersno=0;
        var shit=0;
        var pass=0;
        gQPass=0;

        // start cron
        var endGameCron = new cronJob('*/1 * * * * *', function(){
            pass++;
            if(shit!=(deposits.length)){
                console.log(shit+' / '+deposits.length+' confirmed for round '+roundd+' // try #'+pass);
                return;
            }else{
                console.log('all '+deposits.length+' deposits confirmed for round '+roundd+' (after '+pass+' tries)');
                endGameCron.stop();

                totalprofit=totaldepositsvalue-totalpaid;
                mysqlConn.query('UPDATE `games` SET `playersno`="'+allplayersno+'", `deposits`="'+totaldepositsvalue+'", `paid`="'+totalpaid+'", `profit`="'+totalprofit+'", `status`="finished" WHERE `id`="'+roundd+'"',function(err){ if(err) console.log(err); });

                var newgame=parseInt(roundd)+1;
                var newroll_old=Math.floor(0 + (1+36-0)*Math.random());
                var newroll = random.integer(0, 36);
                console.log('New random roll: '+newroll);
                var newsalt=crypto.createHash('md5').update((Date.now()).toString()+'asdiasfuag7h23'+Math.random()).digest("hex");
                var newhash=crypto.createHash('sha256').update(newsalt+'-'+newroll).digest("hex");
                var newwobble=fn.randomfloat();
                mysqlConn.query('INSERT INTO `games` (`id`,`playersno`,`roll`,`deposits`,`paid`,`profit`,`status`,`starttime`,`salt`,`hash`,`wobble`) VALUES ("'+newgame+'","0","'+newroll+'",0,0,0,"pending",0,"'+newsalt+'","'+newhash+'","'+newwobble+'")',
                    function(err){
                        console.log(err);
                    });
                mysqlConn.query('UPDATE `settings` SET `value`="'+newgame+'" WHERE `name`="current_game"',function(err){ if(err) console.log(err)});

                var endgameinfo={
                    'roll':croll,
                    'rolltext':crolltext,
                    'wobble':cwobble,
                    'newgame':newgame,
                    'newwobble':newwobble,
                    'newhash':newhash
                };

                round = newgame;
                console.log('triggering the game history inserts and calling back, game history: '+gameQueries.length);
                for(var i=0;i<gameQueries.length;i++){
                    if(typeof gameQueries[i] !== 'undefined'){
                        console.log('processing gameQueries['+i+']');
                        mysqlConn.query(gameQueries[i],function(err){
                            if(err){
                                console.log('game history query threw an error: '); //logging the query may not work because i changes before query finishes
                                console.log(err);
                            }
                            gQPass++;
                        });
                        delete gameQueries[i];
                    }else{
                        console.log('gameQueries['+i+'] is undefined');
                    }
                }
                callback(endgameinfo);
            }
        },null, true);

        for (var q=0; q < deposits.length; q++) {
            //console.log('qqqq: '+q);
            (function () {
                var qCopy=q;
                var totalbetaftercode;
                if(typeof userCache[deposits[qCopy].steamid]!=='undefined' && userCache[deposits[qCopy].steamid].referredby!==null && userCache[deposits[qCopy].steamid].referredby!=='' && userCache[deposits[qCopy].steamid].referredby!=='null'){
                    totalbetaftercode=',`totalbet_aftercode`=`totalbet_aftercode`+'+deposits[qCopy].value;
                }else{
                    totalbetaftercode='';
                }
                mysqlConn.query('UPDATE `users` SET `credits`=`credits`-'+deposits[qCopy].value+',`totalbet`=`totalbet`+'+deposits[qCopy].value+''+totalbetaftercode+' WHERE `steamid`="'+deposits[qCopy].steamid+'" AND `credits`>='+deposits[qCopy].value,function(err,res,fields){
                    if(err){
                        console.log(q+'mysql failed updating users credits (subtracting) at game end.');
                        console.log(err);
                        shit++;
                    }else{
                        allplayersno++;
                        totaldepositsvalue=totaldepositsvalue + deposits[qCopy].value;
                        if(typeof allplayers[deposits[qCopy].steamid]==='undefined'){
                            allplayers[deposits[qCopy].steamid]=deposits[qCopy].value;
                        }
                        if(crolltext==deposits[qCopy].type){
                            var winamount = (crolltext=='zero') ? parseInt(deposits[qCopy].value) * 11 : parseInt(deposits[qCopy].value) * 2;
                            totalpaid = totalpaid + (winamount - deposits[qCopy].value);
                            if(res.changedRows==0){
                                shit++;
                                totaldepositsvalue=totaldepositsvalue - deposits[qCopy].value;
                                console.log('[SECURITY WARNING?] Bet not confirmed because the user no longer has enough credits. Clearing userCache. Skipping this bet');
                                userCache[deposits[qCopy].steamid]=undefined;
                                allplayers[deposits[qCopy].steamid]=undefined;
                                allplayersno--;
                            }else{
                                confirmeddeposits++;
                                mysqlConn.query('UPDATE `users` SET `credits`=`credits`+'+winamount+' WHERE `steamid`="'+deposits[qCopy].steamid+'"',function(err,updateres){ if(err) console.log(err); });
                                if(typeof userCache[deposits[qCopy].steamid] !== 'undefined' && typeof userCache[deposits[qCopy].steamid].login_key !== 'undefined'){
                                    userCache[deposits[qCopy].steamid].credits=userCache[deposits[qCopy].steamid].credits+winamount;
                                    userCache[deposits[qCopy].steamid].totalbet=userCache[deposits[qCopy].steamid].totalbet+deposits[qCopy].value;
                                }
                                var queryToPush='INSERT INTO `game_deposits` (`gameid`,`roll`,`steamid`,`value`,`type`,`time`) VALUES ("'+roundd+'","'+gameinfo.roll+'","'+deposits[qCopy].steamid+'","'+deposits[qCopy].value+'","'+deposits[qCopy].type+'","'+deposits[qCopy].time+'")';
                                gameQueries.push(queryToPush);
                                shit++;
                            }
                        }else{
                            if(res.changedRows==0){
                                shit++;
                                console.log('[SECURITY WARNING?] Bet not confirmed because the user no longer has enough credits. Clearing userCache. Skipping this bet (loss)');
                                userCache[deposits[qCopy].steamid]=undefined;
                            }else{
                                mysqlConn.query('INSERT INTO `game_deposits` (`gameid`,`roll`,`steamid`,`value`,`type`,`time`) VALUES ("'+roundd+'","'+gameinfo.roll+'","'+deposits[qCopy].steamid+'","'+deposits[qCopy].value+'","'+deposits[qCopy].type+'","'+deposits[qCopy].time+'")'
                                    ,function(err){
                                        if(err){
                                            console.log('error inserting into game deposits for round '+roundd+':');
                                            console.log(err);
                                        }
                                    });
                                shit++;
                            }
                        }
                    }
                });
            }());
        }
    });
};

var endgame = function() {
    fn.myConsoleLog('endgame called');
    newendgame(round,function(result){
        low_cached=0;
        high_cached=0;
        zero_cached=0;
        //Set the new round after the game is over
        mysqlConn.query('SELECT `value` FROM `settings` WHERE `name`="server_down"', function(server_down_err, server_down, server_down_fields) {
            if(server_down_err){
                throw server_down_err;
                return;
            }

            fn.myConsoleLog('Game ended');
            JSON.stringify(result);
            io.emit('endgame',JSON.stringify(result));
            if(server_down[0].value==1){
                console.log('Server is down in the database. Shutting down in 8 seconds');
                setTimeout(function(){
                    console.log('Server is shutting down now...');
                    process.exit();
                },8000);
                return;
            }

            clearTimeout(timer);
            timer=null;
            bets = 0;
            setTimeout(function(){
                gameStatus = 'active';
            },12000); //12 seconds before game becomes active again (to account for rolling time etc)
            gameBalance.red=0;
            gameBalance.black=0;
            gameBalance.green=0;
        });
    });
};

var userlog = function(steamid, action, message){
    var unixtime = Math.round(new Date().getTime() / 1000.0);
    mysqlConn.query('INSERT INTO `admin_logs` SET `type`="user", `steamid`="'+steamid+'", `action`="'+action+'", `message`="'+addslashes(message)+'", `time`="'+unixtime+'"',function(err,res,fields){
        if(err)
            console.log(err);
    });
};

var getPrice = function(items,callback){
    var returnPrices={};
    for(var i=0; i<items.length; i++){
        if(typeof items[i] === 'undefined' || typeof priceList[items[i]] === 'undefined'){
            returnPrices[items[i]]=0;
        }else{
            var thisprice=priceList[items[i]];
            var newprice=0;
            if((items[i]).indexOf("Key") == -1){
                if(thisprice<5){
                    newprice=thisprice * 0.8;
                }else if(thisprice>=5 && thisprice<10){
                    newprice=thisprice * 0.9;
                }else{
                    newprice=thisprice * 1;
                }
            }else{
                newprice=thisprice;
            }
            returnPrices[items[i]]=newprice;
        }
    }
    callback(null,returnPrices);
};

var botornot = function(sid,callback){
    if(sid<1000){
        mysqlConn.query('SELECT * FROM `bots` WHERE `id`="'+sid+'"',function(err,res){
            if(err || res.length==0){
                if(err){
                    callback('MySQL error while selecting the bot: '+err);
                }else{
                    callback('Bot does not exist in the database.');
                }
            }else{
                callback(null,{'bot':true,'steamid':res[0].steamid});
            }
        });
    }else{
        callback(null,{'bot':false,'steamid':sid});
    }
};

var getInventory = function(sid, forcerefresh, callback) {
    var forcerefresh = forcerefresh || false;
    botornot(sid, function (boterr, botres) {
        if (boterr) {
            console.log(boterr);
            callback('[getInventory()] Bot error: ' + boterr, null);
            return;
        }
        var steamid = botres.steamid;
        var cacheurl = 'html/inventorycache/' + steamid + '.txt';
        var errorToReturn;

        fs.access(cacheurl, fs.F_OK, function (err) {
            //if an error is returned, then the file does not exist. no error = file exists
            if (!err && forcerefresh === false) { //file exists and we dont want to get a fresh inventory
                //todo: maybe save the result from readfilesync locally so it doesnt read from server? idk
                fs.readFile(cacheurl, function (err, cachedInv) {
                    if (err) {
                        callback('Error loading inventory from cache. ' + err);
                        return;
                    } else {
                        if (!fn.IsJsonString(cachedInv)) {
                            fs.unlink(cacheurl, function () {
                                callback('Could not parse cached inventory. Deleting it.');
                            });
                        } else {
                            callback(null, JSON.parse(cachedInv));
                        }
                        return;
                    }
                });
            } else { //file does not exist OR we want a fresh inventory
                if (err) { //file does not exist
                    //callback('[getInventory()] fs.access error: '+err,null);
                    //return;
                }
                console.log('Current Dep queue: ' + req_dep_active2);
                if (req_dep_active2 > max_active_dep && botres.bot === false) {
                    console.log('The bots are busy loading other inventories right now. Please retry in 60 seconds. req_dep_active2: ' + req_dep_active2);
                }

                //Increase number of active deposits
                if (botres.bot === false) {
                    req_dep_active2++;
                    setTimeout(function () {
                        console.log('Current Dep queue: ' + req_dep_active2)
                    }, 15000)
                }
                var steamInvUrl = 'http://steamcommunity.com/profiles/' + steamid + '/inventory/json/730/2/';
                var invUrls = [];
                invUrls.push(steamInvUrl);
                invUrls.push('http://dayz.ro/2x/?' + steamInvUrl);
                invUrls.push('http://top123.biz/2x/?' + steamInvUrl);
                invUrls.push('http://45.63.13.47/index.php?' + steamInvUrl);
                invUrls.push('http://45.63.17.225/index.php?' + steamInvUrl);
                invUrls.push('http://45.63.17.175/index.php?' + steamInvUrl);
                invUrls.push('http://45.63.12.171/index.php?' + steamInvUrl);
                invUrls.push('http://45.63.0.242/index.php?' + steamInvUrl);
                invUrls.push('http://104.207.134.20/index.php?' + steamInvUrl);

                var invUrl = invUrls[Math.floor(Math.random() * invUrls.length)];
                request({
                    url: invUrl,
                    json: true
                }, function (error, response, body) {
                    if (error || response.statusCode != 200) {
                        if (botres.bot === false) req_dep_active2--;
                        if (error) {
                            console.log('[getInventory()] Error loading inventory (may be private?): ' + error + ' // invUrl=' + invUrl);
                            callback(error + '. Please try again in 60 seconds.');
                        } else {
                            console.log('[getInventory()] Erorr loading inventory (status code != 200) (may be private?): ' + response.statusCode + ' // invUrl=' + invUrl);
                            callback('Status code: ' + response.statusCode + '. Please try again in 60 seconds.');
                        }
                        return;
                    }
                    if (body.success !== true) {
                        console.log('[getInventory()] body.success === false. (may be private?). invUrl=' + invUrl);
                        if (botres.bot === false) req_dep_active2--;
                        callback('privateprofile');
                        return;
                    } else {
                        if (body.rgInventory.length == 0) {
                            if (botres.bot === false) req_dep_active2--;
                            callback('emptyinventory');
                            return;
                        }

                        var invIDs = body.rgInventory;
                        var invDesc = body.rgDescriptions;
                        var finalInventory = [];
                        var toPrice = [];
                        var loopCount = 0;
                        var assetidArray = [];
                        var assetidIteration = 0;

                        for (var assetidC in invIDs) {
                            assetidArray.push(assetidC); //we add it to the array but only add to assetidIteration IN the query result, so it's kinda not async anymore
                            mysqlConn.query('SELECT * FROM `withdraw_queue` WHERE (`status`="sent" OR `status`="active" OR `status`="pending" OR `status`="accepted" OR `status`="PendingAdminApproval") AND `items_json` LIKE "%' + assetidC + '%"'
                                , function (err, res) {
                                    if (err) {
                                        console.log('[getInventory()] MySQL error: ' + err);
                                        if (botres.bot === false) req_dep_active2--;
                                        callback(err, null);
                                        return;
                                    }
                                    var assetid = assetidArray[assetidIteration];
                                    assetidIteration++;
                                    var key = invIDs[assetid].classid + '_' + invIDs[assetid].instanceid;
                                    var toPush = {
                                        'id': assetid,
                                        'key': key,
                                        'name': invDesc[key].market_hash_name,
                                        'image': invDesc[key].icon_url,
                                        'tradable': invDesc[key].tradable,
                                        'marketable': invDesc[key].marketable,
                                        'inspectlink': null,
                                        'stickerimgs': null,
                                        'stickernames': null
                                    };

                                    var tags = invDesc[key].tags;
                                    for (var tag in tags) {
                                        if (typeof tags[tag].color !== 'undefined') {
                                            toPush.color = tags[tag].color;
                                        }
                                        if (tags[tag].category_name == 'Quality') {
                                            toPush.quality = (tags[tag].category_name).replace(' ', '', tags[tag].name);
                                            toPush.quality_raw = tags[tag].name;
                                        }
                                    }
                                    var descriptions = invDesc[key].descriptions;
                                    var stickers;
                                    for (var di in descriptions) {
                                        var description = descriptions[di].value;
                                        if (fn.strmatch('sticker_info', description)) {
                                            var stickerImages = description.match(/<center>(.+)<br>Sticker/);
                                            var stickerNames = description.match(/Sticker: (.+)<\/center>/);
                                            toPush.stickerimgs = stickerImages[1].replace(/width=64 height=48/g, 'width="26" height="24"');
                                            toPush.stickernames = stickerNames[1];
                                        }
                                    }
                                    var actions = invDesc[key].actions;
                                    for (action in actions) {
                                        if (typeof actions[action].link !== 'undefined') {
                                            toPush.inspectlink = actions[action].link;
                                            toPush.inspectlink = toPush.inspectlink.replace('%owner_steamid%', steamid);
                                            toPush.inspectlink = toPush.inspectlink.replace('%assetid%', assetid);
                                        }
                                    }
                                    toPrice.push(toPush.name);

                                    if (toPush.marketable == 0 || toPush.tradable == 0 || (botres.bot === true && res.length != 0) || typeof invDesc[key] === 'undefined' || typeof invDesc[key].market_hash_name === 'undefined' || ((invDesc[key].market_hash_name).indexOf("Souvenir") != -1 && botres.bot === false) || ((invDesc[key].market_hash_name).indexOf("Wildfire Case") != -1 && botres.bot === false) || ((invDesc[key].market_hash_name).indexOf("Sticker") != -1 && botres.bot === false)) {
                                        toPush.available = 0;
                                    } else {
                                        toPush.available = 1;
                                    }
                                    finalInventory.push(toPush);

                                    loopCount++;
                                    if (loopCount == Object.keys(invIDs).length) {
                                        getPrice(toPrice, function (err, priceRes) {
                                            if (err) {
                                                if (botres.bot === false) req_dep_active2--;
                                                callback('pricingerror', null);
                                                return;
                                            }
                                            for (var i = 0; i < finalInventory.length; i++) {
                                                if (typeof finalInventory[i].name !== 'undefined') {
                                                    if (typeof priceRes[finalInventory[i].name] !== 'undefined' && priceRes[finalInventory[i].name] !== null && priceRes[finalInventory[i].name] != 'null')
                                                        var priceCredits = Math.floor(priceRes[finalInventory[i].name] * 1000);
                                                    else
                                                        var priceCredits = 0;

                                                    if (priceCredits < 500 && botres.bot === false) {
                                                        finalInventory[i].available = 0;
                                                    }
                                                    var newPriceCredits;
                                                    if (botres.bot !== false) {
                                                        if (priceCredits < 5000) {
                                                            newPriceCredits = priceCredits * 1.05;
                                                        } else if (priceCredits > 5000 && priceCredits < 10000) {
                                                            newPriceCredits = priceCredits * 1.04;
                                                        } else {
                                                            newPriceCredits = priceCredits * 1.02;
                                                        }
                                                    } else {
                                                        if ((finalInventory[i].name).indexOf("Music Kit") != -1 || (finalInventory[i].name).indexOf("Sticker") != -1) {
                                                            newPriceCredits = priceCredits * 0.9;
                                                        } else {
                                                            newPriceCredits = priceCredits;
                                                        }
                                                    }
                                                    finalInventory[i].credits = Math.ceil(newPriceCredits);
                                                    if (i == (finalInventory.length - 1)) {
                                                        fs.writeFile(cacheurl, JSON.stringify(finalInventory), function (err) {
                                                            if (err) {
                                                                return console.log(err);
                                                            }
                                                        });
                                                        if (botres.bot === false) req_dep_active2--;
                                                        callback(null, finalInventory); //getinventory callback
                                                    }
                                                }
                                            }
                                        });
                                    }
                                }
                            );
                        }
                    }
                });

            }
        });
    });
};

/*
  socket events
*/

exports.init = function(app, pio){
    fn = app.get('fn'); mysqlConn = app.get('db'); io = pio;
    // init rount
    mysqlConn.query('SELECT `value` FROM `settings` WHERE `name`="current_game"', function(current_game_err, current_game, current_game_fields) {
        round = parseInt(current_game[0].value);
    });
    // loading and crons
    console.log('Loading prices...');
    reload_prices_from_file();
    var reloadPricesFromFileCron = new cronJob('0 0 * * * *', reload_prices_from_file, null, false);
    refreshChatLimit();
    var refreshChatLimitCron = new cronJob('0 */5 * * * *', refreshChatLimit, null, false);
    fetch_prices_new();
    var fetchPricesNewCron = new cronJob('0 0 */6 * * *', fetch_prices_new, null, false);

    new cronJob('0 * * * * *', function(){
        console.log('================ getSpnsored cron : connections - ' + connections);
        getSponsored(true,function(err,user_res){
            if (!err) {
                io.emit('showSponsored',JSON.stringify(user_res));
            } else {
                io.emit('showSponsored','none');
            }

        });
    }, null, true);

    new cronJob('*/30 * * * * *', function(){
        console.log('================ getGiveaways cron : connections - ' + connections);
        getGiveaways(true,function(err,user_res){
            if (!err) {
                io.emit('sendGiveaways',JSON.stringify(user_res));
            } else {
                io.emit('sendGiveaways','none');
            }

        });
    }, null, true);
    reloadPricesFromFileCron.start();
    refreshChatLimitCron.start();
    fetchPricesNewCron.start();
};

exports.connect = function(ws){
    connections = connections + 1;
    ws.emit('online', connections);
    if(canUpdateOnline){
        io.emit('online', connections);
        canUpdateOnline=false;
        setTimeout(function(){
            canUpdateOnline=true;
        },15000);
    }
    // init params per each socket
    previousmessages[ws.id] = {};
    chatcooldown[ws.id] = 5;
    locks[ws.id] = {};
    activeloadings[ws.id] = 0;
    intervals[ws.id] = {};
};

exports.disconnect = function(ws){
    //destory all params per socket
    delete previousmessages[ws.id];
    delete chatcooldown[ws.id];
    delete locks[ws.id];
    delete activeloadings[ws.id];
    delete connectedUsers[ws.id];
    // stop crons
    for (var key in intervals[ws.id]){
        try{
            if (intervals[ws.id][key] != null)
                intervals[ws.id][key].stop();
        } catch(e){}
    }
    delete intervals[ws.id];
    connections = connections - 1;
};

exports.updateGiveaways = function(ws, rawdata){
    getSponsored(true, function(err, user_res){
        if (!err) {
            io.emit('showSponsored',JSON.stringify(user_res));
        } else {
            io.emit('showSponsored','none');
        }
    });
};

exports.getGiveaways = function(ws, rawdata){
    getGiveaways(true,function(err,user_res){
        if (!err) {
            io.emit('sendGiveaways',JSON.stringify(user_res));
        } else {
            io.emit('sendGiveaways','none');
        }
    });
};

exports.getGameState = function(ws, rawdata){
    var data=JSON.parse(rawdata);
    var sendback={'low':0,'high':0,'zero':0,'credits':0};
    var subtractme=0;
    checkLogin(data.steamid, data.login_key, ws.id, false, function(err, user_res){
        if(err){
            console.log('getGameState error: '+err);
            console.log('rawdata:'+rawdata);
        }else{
            if(typeof betsCache[round] !== 'undefined'){
                for(var i=0; i<betsCache[round].length; i++){
                    if(betsCache[round][i].steamid == data.steamid){
                        sendback[betsCache[round][i].type] += betsCache[round][i].value;
                        subtractme += betsCache[round][i].value;
                    }
                    if(i==(betsCache[round].length-1)){
                        sendback.credits += user_res.credits-subtractme;
                        ws.emit('gameState',JSON.stringify(sendback));
                    }
                }
            }else
                ws.emit('newBalance',user_res.credits);
        }
    });
    getSponsored(false,function(err,user_res){
        if (!err)
            ws.emit('showSponsored',JSON.stringify(user_res));
        else
            ws.emit('showSponsored','none');
    });
};

exports.getBalance = function(ws, rawdata){
    var data=JSON.parse(rawdata);
    if(typeof data.steamid === 'undefined' || typeof data.login_key === 'undefined' || rawdata==""){
        console.log('[ws.on getBalance] Malformed request: '+rawdata);
        return;
    }

    var tosubtract=0;
    checkLogin(data.steamid, data.login_key, ws.id, false, function(err, user_res){
        if(err){
            console.log('getBalance error: '+err);
            console.log('rawdata:'+rawdata);
        } else {
            if(typeof betsCache[round] !== 'undefined'){
                for(var i=0;i<betsCache[round].length;i++){
                    if(betsCache[round][i].steamid==data.steamid)
                        tosubtract+=betsCache[round][i].value;
                    if(i==(betsCache[round].length-1)){
                        mysqlConn.query('SELECT * FROM `users` WHERE `steamid`="'+fn.addslashes(data.steamid)+'"',function(err, user_res2){
                            if(user_res2.length == 0){
                                return;
                            }else{
                                userCache[data.steamid]=user_res2[0];
                                userCache[data.steamid].credits=user_res2[0].credits-tosubtract;
                                ws.emit('newBalance',userCache[data.steamid].credits);
                            }
                        });
                    }
                }
            }else{
                mysqlConn.query('SELECT * FROM `users` WHERE `steamid`="'+fn.addslashes(data.steamid)+'"',function(err,user_res2){
                    if(user_res.length==0){
                        return;
                    }else{
                        userCache[data.steamid]=user_res2[0];
                        ws.emit('newBalance',userCache[data.steamid].credits);
                    }
                });
            }
        }
    });
};

exports.getMyDeposits = function(ws, rawdata){
    var data=JSON.parse(rawdata);
    if(typeof data.steamid === 'undefined' || typeof data.login_key === 'undefined' || rawdata==""){
        console.log('[ws.on getMyDeposits] Malformed request: '+rawdata);
        return;
    }
    var sendback={'low':0,'high':0,'zero':0};
    checkLogin(data.steamid,data.login_key,ws.id,true,function(err,user_res){
        if(err){
            console.log('getMyDeposits error: '+err);
            console.log('rawdata:'+rawdata);
        }else{
            if(typeof betsCache[round] !== 'undefined'){
                for(var i=0;i<betsCache[round].length;i++){
                    if(betsCache[round][i].steamid==data.steamid){
                        sendback[betsCache[round][i].type]+=betsCache[round][i].value;
                    }
                    if(i==(betsCache[round].length-1)){
                        console.log('emited myDeposits for '+data.steamid);
                        ws.emit('myDeposits',JSON.stringify(sendback));
                    }
                }
            }else{
                //console.log('betsCache for this round doesnt exist yet.');
            }
        }
    });
};

exports.getAllDeposits = function(ws, rawdata){
    var data=JSON.parse(rawdata);
    if(typeof data.steamid === 'undefined' || typeof data.login_key === 'undefined' || rawdata==""){
        console.log('[ws.on getAllDeposits] Malformed request: '+rawdata);
        return;
    }
    var sendback={'low':0,'high':0,'zero':0};
    checkLogin(data.steamid,data.login_key,ws.id,true,function(err,user_res){
        if(err){
            console.log('getAllDeposits error: '+err);
            console.log('rawdata:'+rawdata);
        }else{
            if(typeof betsCache[round] !== 'undefined'){
                for(var i=0;i<betsCache[round].length;i++){
                    sendback[betsCache[round][i].type]+=betsCache[round][i].value;
                    if(i==(betsCache[round].length-1)){
                        console.log('emited myDeposits for '+data.steamid);
                        ws.emit('allDeposits',JSON.stringify(sendback));
                    }
                }
            }else{
                //console.log('betsCache for this round doesnt exist yet.');
            }
        }
    });
};

exports.reqw = function(ws, rawdata){
    return;
};

exports.acc = function(ws, rawdata){
    if(typeof userCache[rawdata] !== 'undefined'){
        delete userCache[rawdata];
    }
};

exports.cc = function(ws, rawdata){
    var data=JSON.parse(rawdata);
    if(typeof data.steamid === 'undefined' || typeof data.login_key === 'undefined' || rawdata==""){
        console.log('[ws.on cc] Malformed request: '+rawdata);
        return;
    }
    for(var connSocketID in connectedUsers){
        if(!io.sockets.connected[connSocketID]){
            if(typeof userCache[data.steamid] !== 'undefined')
                delete userCache[data.steamid];
            delete connectedUsers[connSocketID];
        }
    }

    if(typeof connectedUsers[ws.id]==='undefined' && Object.keys(connectedUsers).length>maxLogins && typeof userCache[data.steamid] === 'undefined'){
        ws.emit('maxLogins','Maximum numbers of connections reached ('+maxLogins+'). Please try again later.');
        ws.disconnect();
        return;
    }

    if(typeof connectedUsers[ws.id]==='undefined'){
        connectedUsers[ws.id]=data.steamid;
    }
};

exports.bet = function(ws, rawdata){
    var data = JSON.parse(rawdata);
    if(typeof data.steamid === 'undefined' || typeof data.login_key === 'undefined' || typeof data.betamount === 'undefined' || typeof data.bettype === 'undefined' || rawdata==""){
        console.log('[ws.on bet] Malformed request: '+rawdata);
        return;
    }

    if (gameStatus != 'active') {
        fn.myConsoleLog('[BETS] '+data.steamid+' tried to bet '+data.betamount+' on '+data.bettype+' but bets are closing (gameStatus == '+gameStatus+')');
        ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'Your bet didn\'t go through because the current game is being processed. Try to be faster next time.'}));
        return;
    }

    if (data.betamount <= 0) {
        ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'Invalid bet amount. Your amount must be over 0.'}));
        return;
    }

    if (data.betamount > 2000000){
        ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You cannot bet more than 2 000 000 credits'}));
        return;
    }

    if(!fn.isNumeric(data.betamount) || !fn.isInt(data.betamount)){ //check if the bet amount is a number
        ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'Invalid bet amount. Only whole numbers allowed (integers).'}));
        return;
    }

    if(data.bettype!='low' && data.bettype!='zero' && data.bettype!='high'){ //check if bettype is valid (low,zero or high)
        fn.myConsoleLog('[BETS] [SECURITY WARNING?] '+data.steamid+' tried to bet '+data.betamount+' on an invalid bet type: '+data.bettype);
        ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'Invalid bet. What are you trying to do?'}));
        return;
    }

    checkLogin(data.steamid, data.login_key, ws.id, false, function(err,user_res){
        if(err){
            console.log('login error on bet '+err);
            return;
        }
        if(!fn.strmatch('admin',user_res.accType)){
            //ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'Site is undergoing maintenance. Bets are disabled.'}));
            //return;
        }

        if(user_res.steamid!=data.steamid){
            fn.myConsoleLog('[BETS] [SECURITY WARNING?] Not logged in: '+data.steamid+' / '+data.login_key+' tried to bet '+data.betamount+' on '+data.bettype);
            ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You are not logged in. Please log in to bet.'}));
            return;
        }

        if(user_res.canbet==0){
            ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You can not bet while you have an active withdraw request. Accept or deny it before betting.'}));
            userCache[data.steamid]=undefined;
            return;
        }

        if(data.betamount>user_res.credits){
            fn.myConsoleLog('[BETS] [SECURITY WARNING?] '+data.steamid+' tried to bet '+data.betamount+' but only has '+user_res.credits+' in wallet. He may have also bypassed the client-side checks from app.js or the #balance amount is buggy.');
            ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You don\'t have so many credits to bet. Please try again.'}));
            return;
        }

        if (gameStatus != 'active') {
            fn.myConsoleLog('[BETS] '+data.steamid+' tried to bet '+data.betamount+' on '+data.bettype+' but bets are closing (gameStatus == '+gameStatus+') [ERROR TYPE 2!]');
            ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'Your bet didn\'t go through because the current game is being processed. Try to be faster next time. [ERR CODE: 2]'}));
            return;
        }
        //all is good, process bet
        //Add to the number of bets
        bets++;
        var todb_steamid=fn.addslashes(data.steamid);
        var todb_betamount=parseInt(data.betamount);
        var todb_bettype=fn.addslashes(data.bettype);
        var todb_accType=fn.addslashes(user_res.accType);
        var unixtime = Math.round(new Date().getTime() / 1000.0);

        var varToPush={
            'steamid':todb_steamid,
            'value':todb_betamount,
            'type':todb_bettype,
            'time':unixtime,
            'accType':todb_accType
        };
        if(typeof betsCache[round] === 'undefined'){
            console.log('betsCache['+round+'] not set. setting it now...');
            betsCache[round]=[];
        }
        betsCache[round].push(varToPush);
        userCache[data.steamid].credits=userCache[data.steamid].credits-data.betamount;

        var propperbet = {};
        if(data.betamount<50){
            if (data.bettype == "low") {
                low_cached += parseInt(data.betamount);
            } else if(data.bettype == "high") {
                high_cached += parseInt(data.betamount);
            } else {
                zero_cached += parseInt(data.betamount);
            }
            propperbet={
                'steamid':data.steamid,
                'name':user_res.name,
                'avatar':user_res.avatar,
                'profile':user_res.profileimg,
                'amount':data.betamount,
                'accType': user_res.accType,
                'type':data.bettype,
                'ps':user_res.profilestatus,
                'displayed': 'no'
            };
        } else {
            propperbet={
                'steamid':data.steamid,
                'name':user_res.name,
                'avatar':user_res.avatar,
                'cachedpoints' : { 'low': low_cached, 'high': high_cached, 'zero': zero_cached },
                'amount':data.betamount,
                'profile':user_res.profileimg,
                'accType': user_res.accType,
                'type':data.bettype,
                'ps':user_res.profilestatus,
                'displayed': 'yes'
            };
        }

        if(user_res.banned==1 && user_res.accType!='admin')
            propperbet.displayed='no';

        if(propperbet.displayed=='yes'){ //io.emit emits to everyone
            io.emit('newbet',JSON.stringify(propperbet));
            low_cached = 0;
            high_cached = 0;
            zero_cached = 0;
        }else{ //ws.emits only to the sender
            ws.emit('newbet',JSON.stringify(propperbet));
        }

        if(timer===null){ //if the countdown that triggers endgame isn't set (is null) start it
            timer=setTimeout(endgame, gametime * 1000); //this is in miliseconds, so *1000
            setTimeout(closebets, closebetstime * 1000);
            var newunix=Math.round(new Date().getTime() / 1000.0);
            mysqlConn.query('UPDATE `games` SET `status`="running", `starttime`="'+newunix+'" WHERE `id`="'+round+'"', function(startgame_err, startgame_res, startgame_fields){
                if(startgame_err)
                    console.log(startgame_err);
                else{
                    var logmsg='[BETS] Started the game countdown. It will end in '+gametime+' seconds. Bets closing in '+closebetstime+' seconds.';
                    mysqlConn.query('SELECT * FROM `games` WHERE `id`="'+round+'"',function(starterr,startinfo,startfields){
                        var startGameInfo={
                            'id': 		round,
                            'hash': 	startinfo[0].hash
                        };
                        io.emit('startgame', JSON.stringify(startGameInfo));
                    });
                }
            });
        }
    });
};

exports.chatmessage = function(ws, rawdata){
    var data = JSON.parse(rawdata);
    if(typeof data.steamid === 'undefined' || typeof data.login_key === 'undefined' || typeof data.msg === 'undefined' || typeof data.room === 'undefined' || rawdata==""){
        console.log('[ws.on chatmessage] Malformed request: '+rawdata);
        return;
    }
    data.msg= fn.myTrim(data.msg);

    if(typeof data.steamid === 'undefined' || data.steamid == 0){
        fn.myConsoleLog('undefined or empty steamid');
        return;
    }

    if(typeof previousmessages[ws.id][data.steamid] === 'undefined'){
        previousmessages[ws.id][data.steamid]={
            'msg'	:	'',
            'time'	: 	0
        }
    }

    if(data.msg.length<2){
        fn.myConsoleLog('[CHAT] '+data.steamid+' tried posting a short/empty message on chat: '+data.msg);
        ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'Can\'t post empty or short messages (less than 2 characters).'}));
        return;
    }

    if(data.msg.length>300){
        fn.myConsoleLog('[CHAT] '+data.steamid+' tried posting a long message on chat ('+data.msg.length+' characters): '+data.msg);
        ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'Message too long (max 300 characters).'}));
        return;
    }

    if(data.msg==previousmessages[ws.id][data.steamid].msg){ //user's last message is the same as this one
        ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You already said that. Don\'t send the same message two times (one after the other).'}));
        return;
    }

    if((Math.floor(new Date() / 1000) - chatcooldown[ws.id]) < previousmessages[ws.id][data.steamid].lastmsgtime){
        fn.myConsoleLog('[CHAT] '+data.steamid+' tried posting too fast: '+data.msg);
        ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'Slow down there! You\'re sending messages too fast. Wait at least '+chatcooldown+' seconds between messages.'}));
        return;
    }

    checkLogin(data.steamid, data.login_key, ws.id, true, function(err,user_res){
        if(err){
            console.log('chatmessage login error '+err);
            return;
        }

        var myString = data.msg;
        var myRegexp = /\/send (\d{17}) (\d+)/g;
        var myMatch = myRegexp.exec(myString);
        if(myMatch !== null){
            var sendAmount=parseInt(myMatch[2]);
            var sendTo=myMatch[1];
            var userCredits=parseInt(user_res.credits);
            var userTotalBet=parseInt(user_res.totalbet);
            if((fn.strmatch('twitch',user_res.accType) || fn.strmatch('mod',user_res.accType) || fn.strmatch('pro',user_res.accType)) && sendAmount>5000){
                ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You can not send more than 5000 credits.'}));
                return;
            }
            if(sendAmount>userCredits){
                ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You don\'t have so many credits to send [ERR CODE 1]'}));
                return;
            }
            if(sendTo==data.steamid){
                ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You can\'t send credits to yourself.'}));
                return;
            }

            if(sendAmount<100){
                ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You can\'t send less than 100 credits.'+sendAmount}));
                return;
            }

            if(userTotalBet<10000){
                ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You can use /send after you\'ve bet at least 10 000 credits (currently at '+user_res.totalbet+').'}));
                return;
            }

            if(sendAmount>100000){
                ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You can\'t send more than 100 000 credits at a time.'}));
                return;
            }

            //Check if user has pending withdrawl
            mysqlConn.query('SELECT * FROM `withdraw_queue` WHERE `steamid`="'+data.steamid+'" AND (`status`="pending" OR `status`="sent" OR `status`="PendingAdminApproval" /*OR (`status`="partnerholderror" AND `creditsreturned`="0")*/)',function(toErr,toResW,toFields){
                if(toResW.length>0){
                    ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You cannot send credits with a pending withdrawl.'}));
                    return;
                }
                //do database stuff
                mysqlConn.query('SELECT `name`,`steamid`,`credits` FROM `users` WHERE `steamid`="'+data.steamid+'"',function(fromErr,fromRes,fromFields){
                    if(typeof fromRes==='undefined' || fromRes.length==0){
                        fn.myConsoleLog('[CHAT] '+data.steamid+' DOES NOT EXIST and tried to send credits ('+sendAmount+') to '+sendTo+'');
                        ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'Your action has been logged.'}));
                        return;
                    }
                    var userCreditsAgain=fromRes[0].credits;
                    mysqlConn.query('SELECT `name`,`steamid` FROM `users` WHERE `steamid`="'+sendTo+'"',function(toErr,toRes,toFields){
                        if(typeof toRes==='undefined' || toRes.length==0){
                            ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'The user you are trying to send credits to is not in our database.'}));
                            return;
                        }
                        if(sendAmount>userCreditsAgain){
                            ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You don\'t have so many credits to send [ERR CODE 3].'}));
                            return;
                        }
                        if(userCreditsAgain<100){
                            ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You don\'t have so many credits to send [ERR CODE 4].'}));
                            return;
                        }
                        mysqlConn.query('UPDATE `users` SET `credits`=`credits`-'+sendAmount+' WHERE `steamid`="'+data.steamid+'" AND `credits`>='+sendAmount+'',function(substr_err,substr_res,substr_fields){
                            if(substr_err) {
                                console.log(substr_err);
                                return;
                            }
                            if(substr_res.changedRows==0){
                                fn.myConsoleLog('[CHAT] '+data.steamid+' no longer has that many credits ('+sendAmount+') to send to '+sendTo+'');
                                ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'Your action has been logged [ERR CODE 5]'}));
                                return;
                            }
                            userCache[data.steamid].credits=userCache[data.steamid].credits-sendAmount;
                            //no err, add credits to receiver
                            mysqlConn.query('UPDATE `users` SET `credits`=`credits`+'+sendAmount+' WHERE `steamid`="'+sendTo+'"',function(add_err,add_res,add_fields){
                                if(add_err){
                                    fn.myConsoleLog('Error attempting to send '+sendAmount+' from '+data.steamid+' to '+sendTo+' // message: '+data.msg);
                                    fn.myConsoleLog('Trying to revert the first query');
                                    mysqlConn.query('UPDATE `users` SET `credits`=`credits`+'+sendAmount+' WHERE `steamid`="'+data.steamid+'"',function(dmgcntrl_err,dmgcntrl_res,dmgcntrl_fields){
                                        if(dmgcntrl_err){
                                            fn.myConsoleLog('Could not add '+sendAmount+' credits back to '+data.steamid+', throing error now.');
                                            fn.myConsoleLog('Original error: '+add_err);
                                            throw dmgcntrl_err;
                                            return;
                                        }
                                        userCache[data.steamid].credits=userCache[data.steamid].credits+sendAmount;
                                    });
                                    return;
                                }
                                if(typeof userCache[sendTo] !== 'undefined' && typeof userCache[sendTo].socketid !== 'undefined' && io.sockets.connected[userCache[sendTo].socketid]){
                                    userCache[sendTo].credits=userCache[sendTo].credits+sendAmount;
                                }
                                userlog(data.steamid,'send credits',fn.htmlspecialchars(user_res.name)+' ('+data.steamid+') sent '+sendAmount+' credits to '+sendTo);

                                ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You successfully sent '+sendAmount+' credits to '+ fn.addslashes(toRes[0].name)+' ('+sendTo+')'}));
                                ws.emit('exec',JSON.stringify({'to': data.steamid,'type':'balance','action':'subtract','info':sendAmount}));

                                if(typeof userCache[sendTo] !== 'undefined' && typeof userCache[sendTo].socketid !== 'undefined' && io.sockets.connected[userCache[sendTo].socketid]){
                                    io.to(userCache[sendTo].socketid).emit('alert',JSON.stringify({'to':sendTo,'msg':'Received '+sendAmount+' credits from '+user_res.name+' ('+data.steamid+')'}));
                                    io.to(userCache[sendTo].socketid).emit('exec',JSON.stringify({'to':sendTo,'type':'balance','action':'add','info':sendAmount}));
                                }else{
                                    //	io.emit('alert',JSON.stringify({'to':sendTo,'msg':'Received '+sendAmount+' credits from '+user_res.name+' ('+data.steamid+')'}));
                                    //	io.emit('exec',JSON.stringify({'to':sendTo,'type':'balance','action':'add','info':sendAmount}));
                                }
                                return;
                            });
                        });
                        return;
                    });
                    return;
                });
                return;
            });
            return;
        }else{
            var myRegexp2 = /\/send/g;
            var myMatch2 = myRegexp2.exec(myString);
            if(myString == '/send'){
                ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'/send steamid64 amount '+"\n\n"+'Example: /send 76561198042996771 1000'}));
                return;
            }
            if(user_res.totalbet<chatLimit && !fn.strmatch('admin',user_res.accType) && !fn.strmatch('mod',user_res.accType) && !fn.strmatch('twitch',user_res.accType)){
                ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':''+chatLimit+'/'+user_res.totalbet+' total credits bet to be able to chat. This amount changes with the numbers of players online (more players > higher limit).'}));
                return;
            }
            if(user_res.totaldeposited==0 && !fn.strmatch('admin',user_res.accType) && !fn.strmatch('mod',user_res.accType) && !fn.strmatch('twitch',user_res.accType)){
                ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You have to deposit at least once (any amount) to be able to chat.'}));
                return;
            }
            if(fn.strmatch('admin',user_res.accType) && data.msg=='/rp'){
                console.log('Admin '+user_res.steamid+' requested prices reload...');
                priceList=JSON.parse(fs.readFileSync('prices_sa.db','utf-8'));
                console.log('Loaded '+Object.keys(priceList).length+' priced items.');
                ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'Loaded '+Object.keys(priceList).length+' priced items.'}));
                return;
            }

            if(user_res.muted==1 && (user_res.mutedtime>Math.floor(new Date() / 1000)) && user_res.accType!='admin'){
                var mutedforhowlong=fn.secondsToTime(parseInt(user_res.mutedtime)-Math.floor(new Date() / 1000));
                fn.myConsoleLog('[CHAT] [IS MUTED] '+data.steamid+' tried to chat but is muted by '+user_res.mutedby+' (expires in '+mutedforhowlong+' with reason '+user_res.mutedreason+'). Message: '+data.msg);
                ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'You have been temporarely muted from chat. Reason: '+user_res.mutedreason+'. Expires in: '+mutedforhowlong}));
                return;
            }

            if(fn.strmatch('admin',user_res.accType) && data.msg=='/cl'){
                refreshChatLimit();
                ws.emit('alert',JSON.stringify({'to': data.steamid,'msg':'Chat limit is currently '+chatLimit+' total bet.'}));
                return;
            }
        }

        //all good, process message
        previousmessages[ws.id][data.steamid]={
            'msg'		:	data.msg,
            'lastmsgtime'	: 	Math.floor(new Date() / 1000)
        };

        //accType is so we can style the user's name accordingly (admin, twitch streamer, youtuber, etc)
        var sLink = "";
        if (user_res.accType.indexOf("twitch") !=-1)
            sLink = user_res.social_url;
        else
            sLink = 'null';

        var msgdata={
            'steamid':data.steamid,
            'name':user_res.name,
            'avatar':user_res.avatar,
            'profile':user_res.profileimg,
            'accType': user_res.accType,
            'sLink': sLink,
            'msg': data.msg,
            'room': data.room,
            'ps':user_res.profilestatus
        };

        if(user_res.banned==1 && user_res.accType!='admin'){
            msgdata.displayed='no';
        }else{
            msgdata.displayed='yes';
        }

        io.emit('chatmessage',JSON.stringify(msgdata));
    });
};

exports.reqD = function(ws, rawdata){
    //TODO: send back to the user all possible errors (not logged in/too many items etc)
    var randKey=Math.floor(Math.random()*90000) + 10000;
    var data=JSON.parse(rawdata);

    if(typeof data.steamid === 'undefined' || typeof data.login_key === 'undefined' || typeof data.items === 'undefined'){
        console.log('ws.on reqD malformed request: '+rawdata);
        ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'badrequest'}));
        return;
    }

    var reqItems=JSON.parse(data.items);
    reqItems=reqItems.data;
    checkLogin(data.steamid, data.login_key, ws.id, false, function(err,user_res){
        if(err){
            console.log('[reqD] invalid login data: '+err);
            ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'badlogin'}));
            return;
        }

        if(reqItems.length>maxItemsDeposit){
            ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'You can only deposit '+maxItemsDeposit+' at a time.'}));
            return;
        }

        if(reqItems.length==0){
            ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'selectitemsfirst'}));
            return;
        }

        mysqlConn.query('SELECT * FROM `deposit_queue` WHERE (`status`="pending" OR `status`="sent" OR `status`="PendingAdminApproval") AND `steamid`="'+data.steamid+'"',function(derr,dres){
            if(derr){
                console.log('deposit queue for user error: '+derr);
                return;
            }
            if(dres.length>0){
                ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'activedeposit'}));
                return;
            }
            mysqlConn.query('SELECT * FROM `deposit_queue` WHERE `status`="pending"',function(d2err,d2res){
                if(d2err){
                    console.log('deposit queue error: '+d2err);
                    return;
                }

                if(d2res.length>maxDepositsQueue){
                    ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'fullqueue'}));
                    return;
                }

                var steamInvUrl='http://steamcommunity.com/profiles/'+data.steamid+'/inventory/json/730/2';
                var invUrls=[];
                invUrls.push(steamInvUrl);
                invUrls.push('http://dayz.ro/2x/?'+steamInvUrl);
                invUrls.push('http://top123.biz/2x/?'+steamInvUrl);
                invUrls.push('http://45.63.13.47/index.php?'+steamInvUrl);
                invUrls.push('http://45.63.17.225/index.php?'+steamInvUrl);
                invUrls.push('http://45.63.17.175/index.php?'+steamInvUrl);
                invUrls.push('http://45.63.12.171/index.php?'+steamInvUrl);
                invUrls.push('http://45.63.0.242/index.php?'+steamInvUrl);
                invUrls.push('http://104.207.134.20/index.php?'+steamInvUrl);

                var invUrl = invUrls[Math.floor(Math.random()*invUrls.length)];
                request({
                    url: invUrl,
                    json: true
                }, function (error, response, body) {
                    if(error || response.statusCode != 200){
                        if(error){
                            ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'seamdownorprivateinventory'}));
                        }else{
                            ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'seamdownorprivateinventory'}));
                        }
                        return;
                    }
                    if(body.success!==true){
                        ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'privateprofile'}));
                        return;
                    }

                    var invIDs=body.rgInventory;
                    var invDesc=body.rgDescriptions;
                    var finalInventoryD=[];
                    var toPriceD=[];
                    var loopCount=0;
                    var assetidArray=[];
                    var assetidIteration=0;
                    var validItems=0;

                    for (var assetidC in invIDs){
                        //go through all the inventory, assetidC is the assetid of items
                        //assetidArray.push(assetidC); //we add it to the array but only add to assetidIteration IN the query result, so it's kinda not async anymore
                        var assetid=assetidC;
                        assetidIteration++;
                        var key=invIDs[assetid].classid+'_'+invIDs[assetid].instanceid;
                        for(var iK in reqItems){
                            //go through every requested item
                            if(reqItems[iK].id==assetid && invDesc[key].tradable!=0 && invDesc[key].marketable!=0){
                                var toPush={
                                    'id': 		assetid,
                                    'name': 	fn.addslashes(invDesc[key].market_hash_name),
                                    'image': 	invDesc[key].icon_url
                                };

                                toPriceD.push(toPush.name);
                                finalInventoryD.push(toPush);
                                loopCount++;

                                if((invDesc[key].market_hash_name).indexOf("Souvenir") != -1){
                                    console.log('[getInventory()] souvenir detected');
                                    ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'Souvenir items are not accepted.'}));
                                    return;
                                }

                                if((invDesc[key].market_hash_name).indexOf("Sticker") != -1){
                                    console.log('[getInventory()] sticker detected');
                                    ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'Stickers and sticker capsules are not accepted.'}));
                                    return;
                                }

                                if(loopCount==reqItems.length){
                                    getPrice(toPriceD,function(err,priceRes){
                                        if(err){
                                            console.log('[getInventory()] getPrice callback err: '+err);
                                            ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'pricingerror'}));
                                            return;
                                        }

                                        var totalForD=0;
                                        for (var i=0; i<finalInventoryD.length; i++){
                                            var priceCredits=Math.floor(priceRes[finalInventoryD[i].name] * 1000);
                                            if(priceCredits < 1000){
                                                //finalInventoryD[i].available=0;
                                            }
                                            if((finalInventoryD[i].name).indexOf("Music Kit") != -1 || (finalInventoryD[i].name).indexOf("Sticker") != -1){
                                                priceCredits=priceCredits*0.9;
                                            }else{
                                                priceCredits=priceCredits;
                                            }
                                            totalForD+=priceCredits;
                                            finalInventoryD[i].credits=priceCredits;
                                            if(i==(finalInventoryD.length-1) && finalInventoryD.length==reqItems.length){
                                                var finalFinalInventoryD;
                                                finalFinalInventoryD={
                                                    'total': 	totalForD,
                                                    'data': 	finalInventoryD
                                                };
                                                mysqlConn.query('SELECT * FROM `bots` ORDER BY RAND()',function(botErr,botRes){
                                                    if(botErr){
                                                        console.log('bot select error: '+botErr);
                                                        return;
                                                    }
                                                    if(botRes.length==0){
                                                        console.log('bot doesnt exist in the database');
                                                        return;
                                                    }
                                                    var tradeLink=user_res.tradelink;
                                                    if(tradeLink==''){
                                                        ws.emit('dError',JSON.stringify({'to':data.steamid,'error':'invalidtradelink'}));
                                                        return;
                                                    }
                                                    var tradePieces = tradeLink.split(/[=]+/);
                                                    var tradeToken = fn.addslashes(tradePieces[tradePieces.length-1]);
                                                    var unixShit=Math.floor(Date.now() / 1000);
                                                    var itemsToDB=JSON.stringify(finalFinalInventoryD);
                                                    var checksum=crypto.createHash('md5').update(unixShit+'/'+itemsToDB).digest("hex");
                                                    var statusToDB;
                                                    if(totalForD>=200000){
                                                        statusToDB='PendingAdminApproval';
                                                    }else{
                                                        statusToDB='pending';
                                                    }
                                                    var queryToDB="INSERT INTO `deposit_queue` (`bot`,`steamid`,`token`,`items_json`,`value`,`timestamp`,`status`,`securitykey`,`checksum`) VALUES"+
                                                        "('"+botRes[0].id+"' ,'"+data.steamid+"', '"+tradeToken+"','"+itemsToDB+"', "+totalForD+", "+unixShit+", '"+statusToDB+"','"+randKey+"','"+checksum+"')";
                                                    //Check to see if the last trade had the same items
                                                    if (!(last_items_json == itemsToDB))
                                                        last_items_json = itemsToDB;
                                                    else
                                                        return;

                                                    mysqlConn.query(queryToDB,function(finErr,finRes){
                                                        if(finErr){
                                                            console.log(queryToDB);
                                                            console.log('error inserting into deposit_queue: '+finErr);
                                                            return;
                                                        }
                                                        ws.emit('dSuccess',JSON.stringify({'to':data.steamid,'msg':'success'}));
                                                    });
                                                });
                                            }
                                        }
                                    });
                                }
                                validItems++;
                            }
                        }
                    }
                });
            });
        });
    });
};

exports.reqInvD = function(ws, rawdata){
    var data=JSON.parse(rawdata);
    checkLogin(data.steamid, data.login_key, ws.id, true, function(err,user_res){
        if(err){
            console.log('[reqInvD] invalid login data: '+err);
            ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'badlogin'}));
            return;
        }
        var forcerefresh = false;
        if(data.forcerefresh===true)
            forcerefresh=true;

        if(intervals[ws.id][data.steamid]==null){
            activeloadings[ws.id]++;
            intervals[ws.id][data.steamid] = new cronJob('*/1 * * * * *', function(){
                if(activeloadings[ws.id] < 5){
                    activeloadings[ws.id]--;
                    intervals[ws.id][data.steamid].stop();
                    intervals[ws.id][data.steamid]=null;

                    getInventory(data.steamid, forcerefresh, function(err,inventory){
                        var toSend={
                            'error': 	false,
                            'inventory': 	inventory
                        };
                        if(err){
                            if(err=='privateprofile'){
                                ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'privateprofile'}));
                                toSend.error='privateprofile';
                            }else if(err=='pricingerror'){
                                ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'pricingerror'}));
                                toSend.error='pricingerror';
                            } else if(err=='toomanyrequests'){
                                ws.emit('dError',JSON.stringify({'to': data.steamid,'error':'toomanyrequests'}));
                                toSend.error='toomanyrequests';
                            }else{
                                ws.emit('dError',JSON.stringify({'to': data.steamid,'error':err}));
                                toSend.error=err;
                            }
                            console.log('[reqInvD] getInventory() error: '+err);
                            return;
                        }
                        ws.emit('itemsD',JSON.stringify(toSend));
                    });
                }
            }, null, true);
        }
    });
};

exports.reqInvW = function(ws, rawdata){
    var data=JSON.parse(rawdata);
    checkLogin(data.steamid, data.login_key, ws.id, true, function(err,user_res){
        if(err){
            console.log('[reqInvW] invalid login data: '+err);
            return;
        }
        var forcerefresh=false;
        if(data.forcerefresh===true)
            forcerefresh=true;
        getInventory(data.botid, forcerefresh, function(err,inventory){
            var toSend={
                'error': 	false,
                'inventory': 	inventory
            };
            if(err){
                if(err=='privateprofile'){
                    toSend.error='privateprofile';
                }else if(err=='emptyinventory'){
                    toSend.error='emptyinventory';
                }else{
                    toSend.error='error';
                }
                console.log('[reqInvW] getInventory() error: '+err);
                ws.emit('itemsW',JSON.stringify(toSend));
            }else{
                ws.emit('itemsW',JSON.stringify(toSend));
            }
        });
    });
};