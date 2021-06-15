// const SOCKET_ADDRESS 			= "https://goldgamecdn.com/";
//const SOCKET_ADDRESS 			= "http://1goldgame360.com:3335";
const SOCKET_ADDRESS 			= "http://192.168.1.128:3331";
//const SOCKET_ADDRESS 			= "http://21987368.ngrok.io:3334";
//const SOCKET_ADDRESS 			= "http://144.217.73.197:3334";

const EVENT_ERROR               = 'errorBg';


var $ = window.jQuery;
var op_discon_timer 			= null;
var my_discon_timer				= null;

var connect_num = 0;
var room;
var constants = {};

window.initBoard = function(room, cont) {
    constants = cont;
    var html = getGameBody(room);
    $('#board_container').empty();
    $('#board_container').html(html);
    
    this.room = room;
    window.backgammon_room = room;
    window.screenFor = this.room.owner;
    window.screenAgainst = this.room.partner;
    window.curPlayer = this.room.curPlayer;
    window.passivePlayer = this.room.passivePlayer;
    window.puls = this.room.puls;
    window.puls_temp =  window.jQuery.extend(true, {}, window.puls);

    window.game_zar_at =this.room.zar_at;
    window.userEmail = this.room.userEmail;
    window.roomId = this.room.roomId;
    window.kadi = this.room.user.username;
    window.userId = this.room.user.id;
    
    window.sound = room.sound;
    
    window.is_admin = room.is_admin;
    
    window.translate = {};
    window.translate['Accepted'] = 'Accepted';
    window.translate['Declined'] = 'Declined';
    window.translate['Waiting response.'] = 'Waiting response.';
    
    window.opReconStr = 'Your opponent reconnected';
    window.opDisconStr = 'Your opponent disconnected';
    window.myReconStr = 'You are reconnected';
    window.myDisconStr = 'You are disconnected';
    window.waitingStr = 'Waiting your opponent';
    window.rollDiceAgainStr = 'Rolling the dice again.';
    window.meStartStr = 'You will start to play.';
    window.opStartStr = 'Your opponent will start to play.';
    
    window.opNotConStr = "Your opponent couldn't connect to the room.";
    window.meNotConStr = "You couldn't connect to the room.";
    
    console.log("load_event");
    window.window_h  = $(window).height();
    
    window.line_width = $('.line-1').width();
    window.line_height = $('.line-1').height();
    window.pul_height = window.line_width;
    
    orientation_test();
    
    $('body, html').height(window.innerHeight);
    $('.game-container').height(window.innerHeight);
    $('.game-board, .game-menu').height(window.innerHeight);
    
    $('.gb-main').css("margin-top", ((window.window_h * 3 / 100).toFixed(2))+'px' );
    
    window.div_game_board = $('#game_board');
    
    window.div_lines = []; window.div_pul_conts = [];
    for(var i=0; i<=25; i++){
        window.div_lines[i] = $('#line_'+i);
        window.div_pul_conts[i] = $('>.pul-cont', window.div_lines[i]);
    }
    
    window.div_dices = [];
    window.div_dices[1] = $('#dice_1 > img');
    window.div_dices[2] = $('#dice_2 > img');
    
    window.div_line = $('.line');
    window.div_pul_cont = $('.line > .pul-cont, .kirik_line .pul-cont');
    
    window.pul_html = [];
    window.pul_html[1] = '<img class="pul pul-white" src="images/white_pawn.png" draggable="false" />';
    window.pul_html[2] = '<img class="pul pul-black" src="images/black_pawn.png" draggable="false" />';
    
    set_board();
    
    setTimeout( function(){ $(window).resize(); }, constants.TIME_RESIZE_WINDOW );
    
    window.moves = {};
    
    $(document).on("click", '.line > .pul-cont > img.ui-draggable', function(){
        var tas = $(this);
        var parentLine = tas.closest('.line');
        var tos = JSON.parse(parentLine.attr("data-moves"));
        
        window.sorted_di = Object.keys(window.playableDice).sort(function(a, b){
            return window.playableDice[b] - window.playableDice[a];
        });
        
        $.each(window.sorted_di, function(i, sdi){
            if( typeof tos[sdi] != 'undefined' ){
                
                tas.remove();
                pul_drop(false, parentLine.attr("data-id"), tos[sdi], sdi);
                tas.attr("style","");
                
                return false;
            }
        });
    });
    
    
    $(document).on("click", '.kirik_line > .pul-cont > img.ui-draggable', function(){
        var tas = $(this);
        var parentLine = tas.closest('.kirik_line');
        var tos = JSON.parse(parentLine.attr("data-moves"));
        
        window.sorted_di = Object.keys(window.playableDice).sort(function(a, b){
            return window.playableDice[b] - window.playableDice[a];
        });
        
        $.each(window.sorted_di, function(i, sdi){
            if( typeof tos[sdi] != 'undefined' ){
                tas.remove();
                pul_drop(false, 99, tos[sdi], sdi);
                tas.attr("style","");
                
                return false;
            }
        });
    });
    
    window.socket.on('connect', onConnected);
    window.socket.on('disconnect', onDisconnected);
    window.socket.on('connect_failed', function() {
        console.log("connect_failed");
        connect_num++;
        if (connect_num == 5) {
            window.location.reload();
        }
    });
    
    window.socket.on('connect_error', function() {
        console.log("connect_error");
        connect_num++;
        if (connect_num == 5) {
            window.location.reload();
        }
    });
    
    window.socket.on('error', function() {
        console.log("error");
        console.log("Socket.io reported a generic error");
        connect_num++;
        if (connect_num == 5) {
            window.location.reload();
        }
    });
    
    window.socket.on(constants.EVENT_CREATE_BACKGAMMON_GAME, 	onEventCreateRoom);
    window.socket.on(constants.EVENT_ANSWER_JOIN_BACKGAMMON_GAME, 		onEventJoinRoom);
    window.socket.on(constants.EVENT_CAN_ROLL_DICE_BACKGAMMON, 			onCanRollDice);
    window.socket.on(constants.EVENT_BACKGAMMON_START_ROLL_DICE, 		onEventStartRollDice);
    window.socket.on(constants.EVENT_BACKGAMMON_RESULT_ROLL_DICE, 		onEventResultRollDice);
    window.socket.on(constants.EVENT_BACKGAMMON_START_PLAYING_DICE, 	onEventStartPlayingDice);
    window.socket.on(constants.EVENT_BACKGAMMON_RESULT_PLAYING_DICE, 	onEventResultPlayingDice);
    window.socket.on(constants.EVENT_BACKGAMMON_RESULT_MOVE_CHECKER, 	onEventResultMoveChecker);
    window.socket.on(constants.EVENT_BACKGAMMON_CHAT_MESSAGE,			onEventChatMessage);
    window.socket.on(constants.EVENT_BACKGAMMON_REQUEST_DOUBLE_BET, 	onEventdoubleBet);
    window.socket.on(constants.EVENT_BACKGAMMON_ANSWER_DOUBLE_BET,		onEventAnswerDoubleBet);
    window.socket.on(constants.EVENT_BACKGAMMON_END_GAME,				onGameEnded);
    window.socket.on(constants.EVENT_DISCONNECT_USER,		            onEventDisconnectUser);
    window.socket.on(constants.EVENT_RECONNECT_USER_BACKGAMMON, 		onEventReconnectUser);
    window.socket.on(constants.EVENT_ANSWER_GAME_STATUS,		        onEventAnswerGameStatus);
    window.socket.on(constants.EVENT_ERROR, 					        onEventError);
    window.socket.on(constants.EVENT_CHANGE_WAITING_BACKGAMMON_ROOMS,	onEventWaitUser);
    window.socket.on(constants.EVENT_BACKGAMMON_NOTCONNECT_OPPONENT,	onEventNotConnectOpponent);
    
    $('#chat').click(function(){
        if( $('#chat-cont').hasClass('open') ){
            $('#chat-cont').hide('slide', {direction: 'right'}, 300).removeClass('open');
        }else{
            $('#chat-cont').show('slide', {direction: 'right'}, 300).addClass('open');
        }
        if( $('#chat-cont').hasClass('open') ){ $('#chat').removeClass('unread'); }
    });
    
    $('button#zar_at').click(function() {
        window.socket.emit(constants.EVENT_BACKGAMMON_START_ROLL_DICE, {});
        $(this).remove();
        //$.get( homeUrl+'/backgammon/ajax/zar_at.php' );
    });
    
    $('form#chat-form').submit(function(event){
        event.preventDefault();
        
        var m = $('input', this).val();
        if(m.length > 0) {
            $('input', this).val('');
            window.socket.emit(constants.EVENT_BACKGAMMON_CHAT_MESSAGE, {username: window.kadi, message: m});
        }
    });
    
    $(document).on("click", "#double:not('.accepted'):not('.declined')", function(){
        $('#double_container').addClass("offerer");
        $('#double_container > span#inf').html(window.translate['Waiting response.']).show();
        
        window.socket.emit(constants.EVENT_BACKGAMMON_REQUEST_DOUBLE_BET, {roomName: window.backgammon_room.roomName});
    });
    
    $('#double_container > span > button').click(function(){
        clearTimeout(window.declinetimeout);
        
        $('#double_container > span').hide();
        $('#double_container').removeClass('request');
        
        var r = $(this).attr("data-r");
        window.socket.emit(constants.EVENT_BACKGAMMON_ANSWER_DOUBLE_BET, {roomName: window.backgammon_room.roomName, answer: r});
    });
    
    $('button#zar_at').hide();
    
    $('.abandon').click(function() {
        $.fancybox({content:'<div style="white-space: nowrap;overflow:hidden;"><h3>You will lose if you exit now! <br />Are you sure?</h3><br /><div><button class="yes">Yes</button><button style="margin-left:5px;" class="btn-grey" onclick="$.fancybox.close()">Cancel</button></div></div>', modal:true});
        
        $('.yes').click(function(){
            $.fancybox({content:'<div style="min-width:200px;max-width:300px;height:100px;text-align:center"><br /><img src="/images/dice.png" class="loader" /><br />Exiting game...</div>', modal:true});
            forceExitGame();
        });
    });
    
    $('#undo').click(function() {
        undo();
    });
    
    $('.sound').click(function () {
        if(window.sound == 1) {
            window.sound = 0;
            $('.sound').removeClass('on').addClass('off');
        }
        else {
            window.sound = 1;
            $('.sound').removeClass('off').addClass('on');
        }
    });
    
    $(window).resize(function(){
        orientation_test();
        if (! $('#chat-form input').is(":focus")) {
            $('.game-container').height(window.innerHeight);
            window.window_h = $(window).height();
            $('.game-board, .game-menu').height( window.innerHeight );
            $('.gb-main').css("margin-top", ((window.window_h * 3 / 100).toFixed(2))+'px' );
            
            window.line_width = $('.line-1').width();
            window.line_height = $('.line-1').height();
            window.pul_height = window.line_width;
            
            setPulMargins();
        }
    });
    
    //=============== admin cheat =================
    $('.set_dice').click(function(){
        if(window.is_admin) {
            $.fancybox({ content:'<div class="set_dice_form" style="width:110px"><select id="cheat_dice_1" style="width:50px;margin:0 5px 5px 0"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select> <select id="cheat_dice_2" style="width:50px"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select><br /><br /><button onclick="set_dice_confirm(this)">Set</button> <button class="btn-grey" onclick="$.fancybox.close()">Cancel</button></div>', modal:true });
        }
    });
}

function set_dice_confirm(obj) {
    var dice1 = $('#cheat_dice_1').val();
    var dice2 = $('#cheat_dice_2').val();
    
    window.socket.emit(constants.EVENT_BACKGAMMON_ADMIN_CHEAT, {1: dice1, 2: dice2});
    $.fancybox.close();
}

function onEventNotConnectOpponent() {
    console.log("================ not connect opponent =======================")
    $.fancybox.close();
    $.fancybox({content:'<div style="min-width:350px;height:25px;text-align:center">' + window.opNotConStr + '</div>', modal:false, height:50, helpers: {overlay : true}});
}

function onEventWaitUser() {
    console.log('========= event wait user ========');
    $.fancybox.close();
    $.fancybox({content:'<div style="min-width:250px;height:25px;text-align:center">' + window.waitingStr + '</div>', modal:false, height:50, helpers: {overlay : true}});
}

function forceExitGame() {
    window.socket.emit(constants.EVENT_FORCE_OUT_ROOM, {});
}

function onEventError(data) {
    console.log(data.message);
    // if (data.error == constants.ERROR_CANNOT_FIND_ROOM) {
    //     $.fancybox.close();
    //     $.fancybox({content:'<div style="min-width:350px;height:25px;text-align:center">' + window.meNotConStr + '</div>', modal:false, height:50, helpers: {overlay : true},
    //         afterLoad: function(){
    //             setTimeout( function() {$.fancybox.close(); },2000); // 3000 = 3 secs
    //         }
    //     });
    //     window.location.reload();
    // } else if (data.message == "can not found room."){
    //     $.fancybox.close();
    //     $.fancybox({content:'<div style="min-width:350px;height:25px;text-align:center">' + window.meNotConStr + '</div>', modal:false, height:50, helpers: {overlay : true},
    //         afterLoad: function(){
    //             setTimeout( function() {$.fancybox.close(); },2000); // 3000 = 3 secs
    //         }
    //     });
    //     window.location.reload();
    // }
}

function onConnected() {
    console.log("connected");
    connect_num = 0;
    
    window.socket.emit(constants.EVENT_RECONNECT_USER_BACKGAMMON, {});
}

function onDisconnected(message) {
    console.log("disconnected");
    $('.me').find('>img').css({'border': 'solid 3px grey'});
    showMyDisconnectAlert();
}

function createRoom() {
    //window.socket.emit(constants.EVENT_CREATE_BACKGAMMON_GAME, {userEmail: window.userEmail, roomId: window.roomId});
}

function joinRoom() {
    //window.socket.emit(constants.EVENT_JOIN_BACKGAMMON_GAME, {userEmail: window.userEmail, roomId: window.roomId});
}

function onEventCreateRoom(data) {
    console.log('========= event create room ========');
    localStorage.setItem('backgammon_roomId', data.roomId);
}

function onEventJoinRoom(data) {
    console.log('========= event join room ========');
    localStorage.setItem('backgammon_roomId', data.roomId);
}

function onCanRollDice(data) {
    console.log('========= event can roll dice ========');
    $.fancybox.close();
    $('button#zar_at').show();
}

function onEventStartRollDice(data) {
    console.log('========= event start roll dice ========');
    $('button#zar_at').remove();
}

function onEventResultRollDice(data) {
    console.log('========= event result roll dice ========');
    if( window.game_zar_at.creator != data.zar_at.creator  ||  window.game_zar_at.partner != data.zar_at.partner ){
        if(data.zar_at.creator == 1 && window.game_zar_at.creator==0){
            baslangic_zari(data.zar, undefined, undefined, 1 );
        }
        
        if(data.zar_at.partner == 1 && window.game_zar_at.partner==0){
            baslangic_zari(data.zar, undefined, undefined, 2 );
        }
        
        window.game_zar_at = data.zar_at;
    }
    
    if( window.game_zar_at.creator == 1 && window.game_zar_at.partner==1 ) {
        $('button#zar_at').remove();
        setTimeout(function() {
            if (data.player_turn == 0) {
                modal_splash(window.rollDiceAgainStr);
                window.game_zar_at.creator = 0;
                window.game_zar_at.partner = 0;
            } else {
                modal_splash(window.screenFor==data.player_turn ? window.meStartStr : window.opStartStr);
            }
            $('.bzar1, .bzar2').remove();
        }, 2000);
    }
}

function onEventStartPlayingDice(data) {
    console.log('========= event start playing dice ========');
}

function onEventResultPlayingDice(data) {
    console.log('========= event result playing dice ========');
    window.curPlayer = data.player_turn;
    window.passivePlayer = window.curPlayer == 1 ? 2 : 1;
    
    data.remaining_time = constants.TIME_REMAINING;
    $('.turn_countdown').css("background","none").html('');
    zar_at(data.zar.creator, data.zar.partner, (data.remaining_time < 23000 ? false : true), turn_countdown_start, data.remaining_time);
    
    if(data.player_turn == window.screenFor){
        setTimeout(function(){ calculate_moves(); }, 1200);
    }
}

function onEventResultMoveChecker(data) {
    console.log('========= event result move checker ========');
    console.log("------------ result move --------------");
    console.log(JSON.stringify(window.moves));
    console.log(JSON.stringify(data.hamle));
    console.log(JSON.stringify(data.pullar));
    console.log("------------ result move --------------");
    
    if( data.pullar != undefined ){
        if(data.hamle!=undefined && data.hamle!=''){
            var hamle = [];
            var i = 0;
            for (var key in data.hamle) {
                hamle[i] = data.hamle[key];
                i++;
            }
            if (data.player_last != window.screenFor) {
                undo(); set_board();
                animate_move(hamle, data.player_last, window.puls_temp, data.pullar);
            } else {
                if (JSON.stringify(window.moves) != JSON.stringify(data.hamle)) {
                    undo(); set_board();
                    animate_move(hamle, data.player_last, window.puls_temp, data.pullar);
                }
            }
        }else{
            window.puls_temp 	= window.jQuery.extend(true, {}, data.pullar);
            window.puls 		= window.jQuery.extend(true, {}, data.pullar);
        }
    }
    setPulMargins();
    window.moves = {};
    $('#zar').hide();
    $('#clock').hide();
}

function onEventChatMessage(data) {
    console.log('========= event chat message ========');
    var html = '<li><span>' + data.username + ':</span> ' + data.message + '</li>';
    $('#chat-cont #history ul').append(html).scrollTop( 9999999 );
    if(! $('#chat-cont').hasClass('open')){
        $('#chat').addClass('unread');
    }
}

function onEventdoubleBet(data) {
    console.log('========= request double bet ========');
    if (window.backgammon_room.opponent.id == data.userId) {
        $('#double_container:not(.offerer)').addClass('request');
        window.declinetimeout = setTimeout(function(){	$('#double_container span button#double_decline').click();	}, 10000);
    }
}

function onEventAnswerDoubleBet(data) {
    console.log('========= event answer double bet ========');
    if( data.answer == constants.DOUBLE_BET_APPROVED ){
        $('#double_container > span').hide();
        $('#double_container').removeClass('offerer request');
        $('#double_container > span#inf').html(window.translate['Accepted']).show();
        $('#double_container button#double').addClass('accepted');
        setTimeout(function(){ $('#double_container > span#inf').hide(); }, 1500);
    } else if( data.answer == constants.DOUBLE_BET_REJECTED ){
        $('#double_container').removeClass('offerer request');
        $('#double_container > span').hide();
        $('#double_container > span#inf').html(window.translate['Declined']).show();
        $('#double_container button#double').addClass('declined').show();
        setTimeout(function(){ $('#double_container > span#inf').hide(); }, 1500);
    }
}

function onGameEnded(data) {
    console.log('========= event game ended ========');
    $.fancybox.close();
    var loseUserId = data.loseUserId;
    if (loseUserId == "") {
        window.location.href = '/backgammon';
    } else {
        var message = "";
        if (loseUserId == window.userId) {
            message = "you lost <br />Click OK to continue.<br /><button id='btn_loser' class='bc'>OK</button>";
        } else {
            message = "Congratulations, you win! <br />Click OK to continue.<br /><button id='btn_winner' class='bc'>OK</button>";
        }
        $('#alert-message').html('<span>' + message + '</span>');
        $('#overlay').show();
        
        $('#btn_loser').click(function () {
            window.location.href = '/backgammon';
        });
    
        $('#btn_winner').click(function () {
            window.location.href = '/backgammon';
        });
    }
}

window.goLobby = function() {
    window.location.href = 'backgammon';
}

function onEventDisconnectUser(data) {
    console.log('========= event disconnect user ========');
    console.log(data.userId + " was disconnected.");
    $('.him').find('>img').css({'border': 'solid 3px grey'});
    
    showOpDisconnectAlert();
    //reset_drags();
}

function onEventReconnectUser(data) {
    console.log('========= event reconnect user ========');
    console.log("onEventReconnectUser: " + JSON.stringify(data));
    console.log("onEventReconnectUser: " + window.curPlayer + "," + window.screenFor);
    if (data.userId == window.userId) {
        $('.me').find('>img').css({'border': 'solid 3px green'});
    } else {
        $('.him').find('>img').css({'border': 'solid 3px green'});
    }
    if(window.curPlayer == window.screenFor) {
        //	setTimeout(function(){ calculate_moves(); }, 1200);
    }
    
    showOpReconnectAlert();
}

function onEventAnswerGameStatus(data) {
    console.log("onEventAnswerGameStatus: " + JSON.stringify(data));
    
    window.curPlayer = data.player_turn;
    window.passivePlayer = window.curPlayer == 1 ? 2 : 1;
    
    var remainingTime = constants.TIMEOUT_AUTO_MOVE_CHECKER - data.remainingTime;
    
    $('.me').find('>img').css({'border': 'solid 3px green'});
    $('.turn_countdown').css("background","none").html('');
    
    console.log("")
    if (data.status.creator.presence == constants.USER_STATUS_ONLINE && data.status.creator.userId != window.userId) {
        $('.him').find('>img').css({'border': 'solid 3px grey'});
        showOpDisconnectAlert();
    }
    
    if (data.status.partner.presence == constants.USER_STATUS_ONLINE && data.status.partner.userId != window.userId) {
        
        $('.him').find('>img').css({'border': 'solid 3px grey'});
        $.fancybox.close();
        showOpDisconnectAlert();
    }
    
    showMyReconnectAlert();
    
    if (data.status.doubleBet == constants.DOUBLE_BET_REQUIRED) {
        if (window.userId != data.status.doubleBeUserId) {
            $('#double_container:not(.offerer)').addClass('request');
            window.declinetimeout = setTimeout(function(){	$('#double_container span button#double_decline').click();	}, 10000);
        }
    }
    
    if (data.status.status == constants.GAME_STATUS_READY) {
        $('button#zar_at').show();
    } else if(data.status.status == constants.GAME_STATUS_WAITING_MOVE_CHECKER) {
        if (data.status.zar != undefined && data.status.zar != null) {
            zar_at(data.status.zar.creator, data.status.zar.partner, false/*(remainingTime<18000 ? false : true)*/, turn_countdown_start, remainingTime);
            
            if(data.player_turn == window.screenFor){
                setTimeout(function(){ calculate_moves(); }, 1200);
            }
        }
        $('.bzar1, .bzar2').remove();
    } else if (data.status.status == constants.GAME_STATUS_DICE) {
        
        if( window.game_zar_at.creator != data.status.zar_at.creator  ||  window.game_zar_at.partner != data.status.zar_at.partner ){
            if(data.status.zar_at.creator == 1 && window.game_zar_at.creator==0) {
                baslangic_zari(data.status.zar, undefined, undefined, 1 );
            }
            
            if(data.status.zar_at.partner == 1 && window.game_zar_at.partner==0){
                baslangic_zari(data.status.zar, undefined, undefined, 2 );
            }
            
            window.game_zar_at = data.status.zar_at;
            
            if( window.game_zar_at.creator==1 && window.game_zar_at.partner==1 ) {
                $('button#zar_at').remove();
                setTimeout(function() {
                    if (data.status.player_turn == 0) {
                        modal_splash(window.rollDiceAgainStr);
                        window.game_zar_at.creator = 0;
                        window.game_zar_at.partner = 0;
                    } else {
                        modal_splash(window.screenFor==data.status.player_turn ? window.meStartStr : window.opStartStr);
                    }
                }, 2000);
            }
        }
        
        if (data.status.zar_at.creator == 0 && window.screenFor == 1) {
            $('button#zar_at').show();
        } else if (data.status.zar_at.partner == 0 && window.screenFor == 2) {
            $('button#zar_at').show();
        }
    } else {
        $('.bzar1, .bzar2').remove();
    }
}

function showMyReconnectAlert() {
    if (my_discon_timer != null) {
        clearTimeout(my_discon_timer);
        my_discon_timer = null;
    } else {
        $.fancybox.close();
        $.fancybox({content:'<div style="min-width:250px;height:25px;text-align:center">' + window.myReconStr + '</div>', modal:false, height:50, helpers: {overlay : true},
            afterLoad: function(){
                setTimeout( function() {$.fancybox.close(); },constants.TIME_ALERT); // 3000 = 3 secs
            }
        });
    }
}

function showMyDisconnectAlert() {
    my_discon_timer = setTimeout(function() {
        $.fancybox.close();
        $.fancybox({content:'<div style="min-width:250px;height:25px;text-align:center">' + window.myDisconStr + '</div>', modal:false, height:50, helpers: {overlay : true},
            afterLoad: function(){
                setTimeout( function() {$.fancybox.close(); },2000); // 3000 = 3 secs
            }
        });
        my_discon_timer = null;
    }, constants.TIME_DISCON_ALERT);
}

function showOpDisconnectAlert() {
    op_discon_timer = setTimeout(function() {
        $.fancybox.close();
        $.fancybox({content:'<div style="min-width:250px;height:25px;text-align:center">' + window.opDisconStr + '</div>', modal:false, height:50, helpers: {overlay : true},
            afterLoad: function(){
                setTimeout( function() {$.fancybox.close(); },2000); // 3000 = 3 secs
            }
        });
        op_discon_timer = null;
    }, constants.TIME_DISCON_ALERT);
}

function showOpReconnectAlert() {
    if (op_discon_timer != null) {
        clearTimeout(op_discon_timer);
        op_discon_timer = null;
    } else {
        $.fancybox.close();
        $.fancybox({content:'<div style="min-width:250px;height:25px;text-align:center">' + window.opReconStr + '</div>', modal:false, height:50, helpers: {overlay : true},
            afterLoad: function(){
                setTimeout( function() {$.fancybox.close(); },2000); // 3000 = 3 secs
            }
        });
    }
}

function hamle_onay(){
    console.log(" ==== sent move event ====");
    window.moves = $.isEmptyObject(window.moves) ? " " : window.moves;
    window.gameBoardCompoente.move_checker(window.moves);
    // window.socket.emit(constants.EVENT_BACKGAMMON_MOVE_CHECKER, window.moves);
    console.log(" ==== End sent move event ====");
}

function orientation_test(){
    if($(window).width() < $(window).height()){
        $('#orientation-warning').show();
    }else{
        $('#orientation-warning').hide();
    }
}

if(Audio!=undefined){
    window.audio=[];
    window.audio['dice'] = new Audio('images/dice.wav');
    window.audio['pawn'] = new Audio('images/pawn.wav');
}

function update_line(line_no, amount){
    if( typeof window.puls_temp[window.screenFor][line_no] == 'undefined' ){
        window.puls_temp[window.screenFor][line_no] = 0 + parseInt(amount);
    }else{
        window.puls_temp[window.screenFor][line_no] = parseInt(window.puls_temp[window.screenFor][line_no]) + parseInt(amount);
    }
    
    if(window.puls_temp[window.screenFor][line_no] <= 0 ){
        delete window.puls_temp[window.screenFor][line_no];
    }
    
    setPulMargins();
}

function pul_drop(ui, from, to, dice_index){
    if(window.audio!=undefined && window.sound==1){
        window.audio['pawn'].play();
    }
    
    if(ui!=false){ $(ui.draggable[0]).attr("style",""); }
    
    if(window.puls_temp[window.passivePlayer][to] != undefined ){
        kir(to);
    }
    
    add_pul(to, 1, window.curPlayer);
    if( ui != false ){
        ui.draggable.remove();
    }
    
    window.div_line.removeClass('ui-droppable-active');
    
    update_line(from,-1);
    update_line(to, 1);
    
    window.moves[Object.keys(window.moves).length] = {};
    window.moves[Object.keys(window.moves).length-1][dice_index] = {};
    window.moves[Object.keys(window.moves).length-1][dice_index][from] = to;
    
    delete window.playableDice[dice_index];
    setPulMargins();
    
    calculate_moves();
}

function drag_start(obj, l){
    var tos = JSON.parse(window.div_lines[l].attr("data-moves"));
    
    $.each(tos, function(di, to){
        window.div_lines[to].droppable({accept:'.line-'+l+' img', disabled:false, drop: function( event, ui ){event.preventDefault(); pul_drop(ui, l, to, di); } });
    });
}

function is_topluyor(player){
    player = typeof player == 'undefined' ? window.curPlayer : player;
    var ret = true;
    if(window.curPlayer==1){
        $.each(window.puls_temp[player], function(i,p){
            if(i > 6){ ret = false;}
        });
    }else{
        $.each( window.puls_temp[player], function(i,p){
            if(i < 19){ ret = false;}
        });
    }
    
    return  ret;
}

function is_line_available( to, dice_index, from ){
    if( to == 0 || to==25 ){
        if( ! is_topluyor() ){
            return false;
        }else{
            if(from==window.dice_temp[dice_index] || from==25-parseInt(window.dice_temp[dice_index]) ){
                return true;
            }else{
                if(to==0){
                    for(var i=parseInt(from)+1; i<=6; i++){
                        if( undefined != window.puls_temp[window.curPlayer][i] ){
                            return false;
                        }
                    }
                }else{
                    for(var i=19; i<parseInt(from); i++){
                        if( undefined != window.puls_temp[window.curPlayer][i] ){
                            return false;
                        }
                    }
                }
                
                return true;
            }
        }
    }else{
        if( window.puls_temp[window.passivePlayer][to] == undefined || window.puls_temp[window.passivePlayer][to] < 2){
            return true;
        }else{
            return false;
        }
    }
}

function undo () {
    if(window.curPlayer==window.screenFor){
        window.moves = {};
        window.puls_temp = window.jQuery.extend(true, {}, window.puls);
        
        zar_at(window.curdice[1], window.curdice[2], false);
        set_board();
        calculate_moves();
    }
}

function set_board(){
    $(window.div_pul_cont).find('>img').remove();
    
    $.each(window.puls_temp[window.screenFor], function(l, p){
        for (var i = 1; i <= p; i++) {
            window.div_pul_conts[l].append(window.pul_html[window.screenFor]);
        }
    });
    
    if( object_sum(window.puls_temp[window.screenFor]) < 15 ){
        for (var i = 1; i <= 15-object_sum(window.puls_temp[window.screenFor]); i++) {
            $('.kirik_line_'+window.screenFor+'>.pul-cont').append(window.pul_html[window.screenFor]);
        }
    }
    
    $.each(window.puls_temp[window.screenAgainst], function(l, p){
        for (var i = 1; i <= p; i++) {
            window.div_pul_conts[l].append(window.pul_html[window.screenAgainst]);
        }
    });
    
    if( object_sum(window.puls_temp[window.screenAgainst]) < 15 ){
        for (var i = 1; i <= 15-object_sum(window.puls_temp[window.screenAgainst]); i++) {
            $('.kirik_line_'+window.screenAgainst+'>.pul-cont').append(window.pul_html[window.screenAgainst]);
        }
    }
    
    setPulMargins();
}

function reset_drags(){
    $('>img', window.div_pul_cont).each(function(){
        if( typeof $(this).draggable( "instance" ) != 'undefined' ){
            $(this).draggable("destroy").removeClass("ui-draggable");
        }
        
        $(this).unbind();
    });
    
    $('.line').each(function(){
        if( typeof $(this).droppable( "instance" ) != 'undefined' ){
            $(this).droppable("destroy").removeClass("ui-droppable");
        }
        
        $(this).attr("data-moves", "");
    });
}

function kir(line_no){
    $('>img', window.div_pul_conts[line_no]).remove();
    $('.kirik_line_'+window.passivePlayer+'>.pul-cont').append(window.pul_html[window.passivePlayer]);
    delete window.puls_temp[window.passivePlayer][line_no];
}

function add_pul(line_no, amount, color){
    window.div_pul_conts[line_no].append(window.pul_html[color]);
}

function is_finished(){
    return window.puls_temp[window.curPlayer][(window.curPlayer==1?0:25)] == 15  ? true : false;
}

function setPulMargins(pullar){
    var pullar = pullar==undefined ? window.puls_temp : pullar;
    console.log("pullar = " + pullar);
    window.div_pul_cont.find('img').attr('style','');
    
    for(var i=1; i<=2; i++){
        $.each(pullar[i], function(l,p){
            if(l!=0 && l!=25){
                var sumHeight = window.pul_height * p;
                if(sumHeight > window.line_height){
                    var marginBot = (sumHeight - window.line_height) / (p-1);
                    window.div_pul_conts[l].find('>img:not(:last-child)').css("margin-bottom", -marginBot+"px" );
                }
            }
            
        });
    }
}

function turn_countdown_start(cur_time){
    if( typeof window.turnTimeout != 'undefined' ){ clearTimeout(window.turnTimeout); }
    
    $('#clock span').html('');
    $('#clock').removeClass('cu-time ou-time').addClass( (window.curPlayer == window.screenFor ? 'cu-time' : 'ou-time') ).show();
    
    turn_countdown( (cur_time!=undefined ? cur_time : constants.TIMEOUT_AUTO_MOVE_CHECKER), constants.TIMEOUT_AUTO_MOVE_CHECKER);
}

function turn_countdown(current_time, max_time){
    var perc =  Math.round( current_time / 1000 );
    if(perc > 0){
        $('#clock span').html(perc);
        window.turnTimeout = setTimeout( function(){ turn_countdown(current_time-1000, max_time)}, 1000 );
    }else{
        $('#clock').hide();
    }
}

function zar_at(d1,d2, anim, callback, rt){
    window.curdice = {1:d1, 2:d2};
    window.playableDice = d1==d2 ? {1:d1, 2:d1, 3:d1, 4:d1} : {1:d1, 2:d2};
    window.dice_temp = d1==d2 ? {1:d1, 2:d1, 3:d1, 4:d1} : {1:d1, 2:d2};
    
    if( anim == undefined || anim==true ){
        if(window.audio!=undefined && window.sound==1){
            window.audio['dice'].play();
        }
        
        $('#zar').hide();
        $('#clock').hide();
        $('#rolling_stones').show();
        roll_dices([d1,d2], 20, callback, rt);
    }else{
        if( callback!=undefined ){ callback(rt); }
    }
    
    $('#zar').html('<img src="images/'+d1+'.png" /> <img src="images/'+d2+'.png" />');
}

function roll_dices(s, t, callback, rt){
    window.d1 = Math.floor(Math.random() * 6) + 1;
    window.d2 = Math.floor(Math.random() * 6) + 1;
    
    window.div_dices[1].attr("src", "images/"+window.d1+".png");
    window.div_dices[2].attr("src", "images/"+window.d2+".png");
    
    // console.log('window.d1: ' + window.d1 + ' window.d2: ' + window.d2);
    
    setTimeout(
        function(){
            if( t>0){
                t--;
                roll_dices(s,t,callback, rt);
            }else{
                window.div_dices[1].attr("src", "images/"+s[0]+".png");
                window.div_dices[2].attr("src", "images/"+s[1]+".png");
                
                // console.log('s0: ' + s[0] + ' s1: ' + s[1]);
                
                setTimeout(function(){
                    $('#rolling_stones').hide();
                    $('#zar').show();
                    
                    if(callback!=undefined){
                        callback(rt);
                    }
                },300);
            }
        },
        50 );
}

function baslangic_zari(bas_zar, t, i, player){
    var t=t==undefined?15:t;
    var i=i==undefined?0:i;
    if(i==0){
        window.div_game_board.append('<img class="bzar'+player+'" src="images/1.png">');
    }
    
    if( i==t ){
        var img_number = 0;
        if(player == 1) {
            img_number = bas_zar['creator'];
        }
        else if(player == 2) {
            img_number = bas_zar['partner'];
        }
        $('img.bzar'+player, window.div_game_board).attr("src", "images/" + img_number + ".png");
        console.log('bas_zar_player: ' + bas_zar[player]);
    }else{
        setTimeout(function(){
            window.d1 = Math.floor(Math.random() * 6) + 1;
            
            $('img.bzar'+player, window.div_game_board).attr("src", "images/" + window.d1 + ".png");
            console.log('window.d1: ' + window.d1);
            
            i++;
            baslangic_zari(bas_zar, t, i, player)
        }, 100);
    }
    
}

function calculate_moves(){
    reset_drags();
    
    if( window.curPlayer==window.screenFor ){
        
        if( is_finished() ){
            hamle_onay();
        }else if( object_sum(window.puls_temp[window.curPlayer]) < 15 ){
            
            var tos = {};
            $.each(window.playableDice, function(i, d){
                var to = window.curPlayer == 1 ? 25-parseInt(d) : parseInt(d);
                
                if( is_line_available(to) ){ tos[i] = to; }
            });
            
            
            if( ! $.isEmptyObject(tos) ){
                $('.kirik_line_'+window.curPlayer).attr({"data-moves":JSON.stringify(tos)});
                $('.kirik_line_'+window.curPlayer+' .pul-cont>img').draggable({revert: "invalid", containment:'.game-board', snap:'.line', snapMode:'inner', zIndex: 999, disabled:false});
                
                $.each(tos, function(i, to){
                    window.div_lines[to].droppable({accept:'.kirik_line_'+window.curPlayer+' .pul-cont>img', disabled:false, drop: function( event, ui ) {event.preventDefault();	pul_drop(ui, 99, to, i); } });
                });
            }else{
                modal_splash("You dont have any moves.");
                setTimeout(hamle_onay, 700);
            }
            
            
        }else{
            var found_tos = false;
            
            
            $.each( window.puls_temp[window.curPlayer], function(l, p){
                var tos = {};
                
                $.each(window.playableDice, function(di, d){
                    
                    var to = window.curPlayer == 1 ? parseInt(l) - parseInt(d) : parseInt(l) + parseInt(d);
                    to = to < 0 ? 0 : to;
                    to = to > 25 ? 25 : to;
                    
                    if( is_line_available(to, di, l) ){ tos[di] = to; }
                });
                
                
                if( ! $.isEmptyObject(tos) ){
                    found_tos = true;
                    var snapClass = "";
                    
                    $.each( tos, function(di, to){
                        snapClass =  snapClass != "" ? snapClass+', .line-'+to : '.line-'+to;
                    });
    
                    window.div_lines[l].attr({"data-moves":JSON.stringify(tos)});
                    window.div_pul_conts[l].find('>img').draggable({ start: function(){ drag_start(this, l);  },  revert: "invalid", containment:'.game-board', snap:snapClass, snapMode:'inner', zIndex: 999, disabled:false});
                }
            });
            
            if( ! found_tos ){
                if( Object.keys(window.playableDice).length > 0){
                    modal_splash("You dont have any moves.");
                    setTimeout(hamle_onay, 700);
                }else{
                    hamle_onay();
                }
            }
        }
    }
}


function animate_move(hamle, player, pullar, data_pullar){
    
    var i 		= Object.keys(hamle)[0];
    var m 		= hamle[i];
    var di 		= Object.keys(m)[0]
    var from 	= Object.keys(m[di])[0];
    var to   	= m[di][from];
    
    var player_passive = player == 1 ? 2 : 1;
    var toLine 		= window.div_pul_conts[to];
    var toLinePos 	= toLine.offset();
    
    
    if(to==0 || to==25){
        var toLinePart 	= toLine;
    }else{
        var toLinePart 	= toLine.closest('.partition');
    }
    
    if(from==99){
        var tas = $('.kirik_line_'+player+'>.pul-cont').find('>img');
    }else{
        var tas = window.div_pul_conts[from].find('>img');
    }
    
    if( toLinePart.position().top == 0 ){
        tas = tas.last();
        toLinePos.top = toLinePos.top + toLine.height();
    }else{
        tas = tas.first();
        toLinePos.top = toLinePos.top - toLine.height() - tas.height();
    }
    
    var tasPos = tas.offset();
    
    if(tasPos==undefined){window.location.reload();}
    
    tas.css({width:tas.width(),position:'absolute', top:tasPos.top, left:tasPos.left}).detach().appendTo('body');
    
    tas.animate({
        top:toLinePos.top, left:toLinePos.left
    }, 500, "linear", function(){
        
        
        if( typeof pullar[player_passive][to] != 'undefined' && pullar[player_passive][to] == 1 ){
            $('>img', window.div_pul_conts[to]).remove();
            $('.kirik_line_'+player_passive+'>.pul-cont').append( window.pul_html[player_passive] );
            delete pullar[player_passive][to];
        }
        
        tas.detach().appendTo( window.div_pul_conts[to] ).css({position:"relative", top:"", left:"", width:'100%'});
        
        hamle.splice(0, 1);
        
        if( hamle.length > 0 ){
            setPulMargins();
            setTimeout(function(){animate_move(hamle, player, pullar, data_pullar);}, 50);
        }else{
            window.puls_temp 	= window.jQuery.extend(true, {}, data_pullar);
            window.puls 		= window.jQuery.extend(true, {}, data_pullar);
            setPulMargins(data_pullar);
        }
    });
}

function modal_splash(message){
    $('#game_board').append('<div class="modal_splash">'+message+'</div>');
    setTimeout(function(){ $('#game_board').find('.modal_splash').remove(); }, 2000)
}

function object_sum( obj ){
    var sum = 0;
    for( var el in obj ) {
        if( obj.hasOwnProperty( el ) ) {
            sum += parseFloat( obj[el] );
        }
    }
    return sum;
}

window.blockMenuHeaderScroll = false;
$(window).on('touchstart', function(e){
    if ($(e.target).closest('.game-board , .gb-main').length == 1){
        window.blockMenuHeaderScroll = true;
    }
});
$(window).on('touchend', function(){
    window.blockMenuHeaderScroll = false;
});
$(window).on('touchmove', function(e){
    if (window.blockMenuHeaderScroll){
        e.preventDefault();
        //$('.chat').hide();
    }
});

(function($) {
    $.fn.nodoubletapzoom = function() {
        $(this).bind('touchstart', function preventZoom(e) {
            var t2 = e.timeStamp
                , t1 = $(this).data('lastTouch') || t2
                , dt = t2 - t1
                , fingers = e.originalEvent.touches.length;
            $(this).data('lastTouch', t2);
            if (!dt || dt > 500 || fingers > 1) return; // not double-tap
            
            e.preventDefault(); // double tap - prevent the zoom
            // also synthesize click events we just swallowed up
            $(this).trigger('click').trigger('click');
        });
    };
})(window.jQuery)

function getGameBody (room) {
    var html = '';
    /*
    if (room.step == 0 || room.step == 1) {
        html = html +
            '<div id="game_starting" class="game_starting">Get ready, game starting...</div>';
    }
    */
    html = html +
        '                <div id="fixer"></div>\n' +
        '                <div class="game-container clearfix">\n' +
        '                    <div id="overlay">\n' +
        '                        <div id="alert">\n' +
        '                            <div id="alert-message">\n' +
        '                            </div>\n' +
        '                        </div>\n' +
        '                    </div>\n' +
        '                    <div class="left-bar">\n' +
        '                        <div class="profiles">\n' +
        '                            <div class="profile him">\n' +
        '                                <img class="img_profile" src="/images/profile.png"/>\n' +
        '                                <span>\n';
    html = html + room.opponent.username +
        '                                </span>\n' +
        '                            </div>\n' +
        '                            <div class="profile me">\n';
    if (room.user.profileImageURL == '') {
        html = html + '<img class="img_profile" src="/images/profile.png">\n';
    }
    else {
        html = html + '<img class="img_profile" src="/images/profile.png"/>\n';
    }
    
    html = html +
        '                                <span>\n' +
        '                                    ' + room.user.username + '\n' +
        '                                </span>\n' +
        '                            </div>\n' +
        '                        </div>\n' +
        '                    </div>\n' +
        '                    <div id="game_board" class="game-board">\n' +
        '                        <img class="board-image" src="images/board.png" />\n' +
        '                        <div id="clock" class="bc"><span></span></div>\n' +
        '                        <div id="zar"></div>\n' +
        '                        <button id="exit" class="bc abandon"></button>\n' +
        '                        <button id="undo" class="bc"></button>\n' +
        '                        <button id="chat" class="bc"></button>\n';
    
    if (room.user.walletAmount > room.bet * 2 && room.user.walletAmount > room.bet * 2) {
        if(room.doubleStatus == constants.DOUBLE_BET_REQUIRED) {
            html = html + '<div id="double_container" class="request">\n';
        }
        else {
            html = html + '<div id="double_container" class="">\n';
        }
    
        if (room.doubleStatus == constants.DOUBLE_BET_REJECTED) {
            html = html + '<button id="double" class="bc declined"></button>';
        }
        else if(room.doubleStatus == constants.DOUBLE_BET_APPROVED) {
            html = html + '<button id="double" class="bc accepted"></button>';
        }
        else {
            html = html + '<button id="double" class="bc"></button>';
        }
        
        html = html +
        '                            <span id="confirm_form">\n' +
        '                                <button id="double_decline" data-r="' + constants.DOUBLE_BET_REJECTED + '"></button>\n' +
        '                                <button id="double_accept" data-r="' + constants.DOUBLE_BET_APPROVED + '"></button>\n' +
        '                                <span>\n' +
        '                                    Double bet?\n' +
        '                                </span>\n' +
        '                            </span>\n' +
        '                            <span id="inf"></span>\n' +
        '                        </div>\n';
    }
    
    if(room.zar_at.creator == 0 || room.zar_at.partner == 0) {
        if(room.zar_at.creator == 0 && room.zar_at.partner == 0) {
            html = html + '<button id="zar_at" style="display:block">Roll Dice</button>\n';
        }
        else {
            html = html + '<button id="zar_at" ' + room.step + '>Roll Dice</button>';
        }
    }
    
    if(room.step == 1) {
        if(room.zar_at.creator == 1) {
            html = html + '<img class="bzar1" src="images/"' + room.zar.creator + '".png" />';
        }
        if(room.zar_at.partner == 1) {
            html = html + '<img class="bzar2" src="images/"' + room.zar.partner + '".png" />';
        }
    }
    
    if(room.sound == 1) {
        html = html + '<button class="sound bc on"></button>\n';
    }
    else {
        html = html + '<button class="sound bc off"></button>\n';
    }
    
    html = html +
        '                        <div id="chat-cont" class="bc">\n' +
        '                            <div id="history"><ul></ul></div>\n' +
        '                            <form id="chat-form"><input name="message" class="bc" autocomplete="off" /><button class="bc"></button></form>\n' +
        '                        </div>\n' +
        '                        <div id="gb_main" class="gb-main">\n' +
        '                            <div class="partition partition-4">\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][24] + '" class="line line-' + room.lineNumbers[room.owner][24] + '" data-id="' + room.lineNumbers[room.owner][24] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][23] + '" class="line line-' + room.lineNumbers[room.owner][23] + '" data-id="' + room.lineNumbers[room.owner][23] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][22] + '" class="line line-' + room.lineNumbers[room.owner][22] + '" data-id="' + room.lineNumbers[room.owner][22] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][21] + '" class="line line-' + room.lineNumbers[room.owner][21] + '" data-id="' + room.lineNumbers[room.owner][21] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][20] + '" class="line line-' + room.lineNumbers[room.owner][20] + '" data-id="' + room.lineNumbers[room.owner][20] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][19] + '" class="line line-' + room.lineNumbers[room.owner][19] + '" data-id="' + room.lineNumbers[room.owner][19] + '"><div class="pul-cont"></div></div>\n' +
        '                            </div>\n' +
        '                            <div class="kirik_line kirik_line_' + room.partner + ' kirik_top"><div class="pul-cont"></div></div>\n' +
        '                            <div class="partition partition-3">\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][18] + '" class="line line-' + room.lineNumbers[room.owner][18] + '" data-id="' + room.lineNumbers[room.owner][18] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][17] + '" class="line line-' + room.lineNumbers[room.owner][17] + '" data-id="' + room.lineNumbers[room.owner][17] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][16] + '" class="line line-' + room.lineNumbers[room.owner][16] + '" data-id="' + room.lineNumbers[room.owner][16] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][15] + '" class="line line-' + room.lineNumbers[room.owner][15] + '" data-id="' + room.lineNumbers[room.owner][15] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][14] + '" class="line line-' + room.lineNumbers[room.owner][14] + '" data-id="' + room.lineNumbers[room.owner][14] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][13] + '" class="line line-' + room.lineNumbers[room.owner][13] + '" data-id="' + room.lineNumbers[room.owner][13] + '"><div class="pul-cont"></div></div>\n' +
        '                            </div>\n' +
        '                            <div class="partition partition-2">\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][7] + '" class="line line-' + room.lineNumbers[room.owner][7] + '" data-id="' + room.lineNumbers[room.owner][7] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][8] + '" class="line line-' + room.lineNumbers[room.owner][8] + '" data-id="' + room.lineNumbers[room.owner][8] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][9] + '" class="line line-' + room.lineNumbers[room.owner][9] + '" data-id="' + room.lineNumbers[room.owner][9] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][10]+ '" class="line line-' + room.lineNumbers[room.owner][10]+ '" data-id="' + room.lineNumbers[room.owner][10] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][11]+ '" class="line line-' + room.lineNumbers[room.owner][11]+ '" data-id="' + room.lineNumbers[room.owner][11] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][12]+ '" class="line line-' + room.lineNumbers[room.owner][12]+ '" data-id="' + room.lineNumbers[room.owner][12] + '"><div class="pul-cont"></div></div>\n' +
        '                            </div>\n' +
        '                            <div class="kirik_line kirik_line_' + room.owner + ' kirik_top"><div class="pul-cont"></div></div>\n' +
        '                            <div class="partition partition-1">\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][1] + '" class="line line-' + room.lineNumbers[room.owner][1] + '" data-id="' + room.lineNumbers[room.owner][1] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][2] + '" class="line line-' + room.lineNumbers[room.owner][2] + '" data-id="' + room.lineNumbers[room.owner][2] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][3] + '" class="line line-' + room.lineNumbers[room.owner][3] + '" data-id="' + room.lineNumbers[room.owner][3] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][4] + '" class="line line-' + room.lineNumbers[room.owner][4] + '" data-id="' + room.lineNumbers[room.owner][4] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][5] + '" class="line line-' + room.lineNumbers[room.owner][5] + '" data-id="' + room.lineNumbers[room.owner][5] + '"><div class="pul-cont"></div></div>\n' +
        '                                <div id="line_' + room.lineNumbers[room.owner][6] + '" class="line line-' + room.lineNumbers[room.owner][6] + '" data-id="' + room.lineNumbers[room.owner][6] + '"><div class="pul-cont"></div></div>\n' +
        '                            </div>\n' +
        '                        </div>\n' +
        '                        <div class="partition-5">\n' +
        '                            <div id="line_' + room.lineNumbers[room.partner][0] + '" class="line line-' + room.lineNumbers[room.partner][0] + ' line-top" data-id="' + room.lineNumbers[room.partner][0] + '"><div class="pul-cont"></div></div>\n' +
        '                            <div id="line_' + room.lineNumbers[room.owner][0] + '" class="line line-' + room.lineNumbers[room.owner][0] + ' line-bottom" data-id="' + room.lineNumbers[room.owner][0] + '"><div class="pul-cont"></div></div>\n' +
        '                        </div>\n' +
        '                        <div id="rolling_stones" class="rolling-stones clearfix">\n' +
        '                            <div id="dice_1" class="dice_1"><img src="" /></div>\n' +
        '                            <div id="dice_2" class="dice_2"><img src="" /></div>\n' +
        '                        </div>\n' +
        '                    </div>\n' +
        '                </div>\n' +
        '                <div id="orientation-warning"><img src="/images/landscape.png" width="50%" /><br />\n' +
        '                    Please set your device on landscape mode.\n' +
        '                </div>\n' +
        '                <audio id="sound_dice" controls="controls" class="hidden"><source src="images/dice.wav" type="audio/mpeg" /></audio>\n' +
        '                <audio id="sound_pawn" controls="controls" class="hidden"><source src="images/pawn.wav" type="audio/mpeg" /></audio>\n';
    if(room.is_admin) {
        html = html + '<button class="set_dice" style="position:absolute;z-index:89;right:0;width:9vw;bottom:15%;box-sizing:border-box;background:rgba(0,0,0,.7);border:0;outline:0;height:3%;padding:3vw 0;font-size:11px;line-height:0">Dice</button>'
    }
    
    return html;
}
