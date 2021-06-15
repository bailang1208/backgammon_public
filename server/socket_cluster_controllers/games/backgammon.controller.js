// npm libraries
const async = require('async');
const mongoose = require('mongoose');
const path = require('path');

// constants
const constants = require(path.resolve('./config/constants'));
const gameSettings = require(path.resolve('./config/default_setting_variables.json'));

var moment = require('moment');

// db Models
var BackgammonModel = mongoose.model('Backgammon');
var BackgammonHistoryModel = mongoose.model('BackgammonHistory');
var UserModel = mongoose.model('AppUser');

// controllers
var gameCore = require('./backgammon.gamecore');
var commonCtrl = require('./_common.controller');
var timeoutsCtrl = require('./_timeouts.controller');
var errHandler = require(path.resolve('./server/controllers/errors.server.controller'));

// socket.io object
var timeObjs = {};

// init data structure
var initGameData = {
    roomId: "",
    roomName: "",
    creator: {
        userId: '',
        username: '',
        status: constants.USER_STATUS_OFFLINE,
        presence: constants.USER_STATUS_OFFLINE,
        profileImageURL: '',
        walletAmount: 0,
        connected: constants.ST_NO_CONNECTED
    },
    partner: {
        userId: '',
        username: '',
        status: constants.USER_STATUS_OFFLINE,
        presence: constants.USER_STATUS_OFFLINE,
        profileImageURL: '',
        walletAmount: 0,
        connected: constants.ST_NO_CONNECTED
    },
    zar: {creator: 0, partner: 0},
    zar_at: {creator: 0, partner: 0},
    nz: null,
    startAutoAt: null,
    bet: 0,
    doubleBet: constants.DOUBLE_BET_NONE,
    step: 0,
    gameArea: gameCore.initGameArea(),
    hamle: "",
    player_last: "",
    preStatus: constants.GAME_STATUS_READY,
    status: constants.GAME_STATUS_READY,
    lastMessage: "",
    startRollDiceTimer: null
};

var initRoomData = {
    roomId: '',
    roomName: '',
    owner: 0,
    partner: 0,
    curPlayer: 0,
    passivePlayer: 0,
    step: 0,
    zar: {creator: 0, partner: 0},
    zar_at: {creator: 0, partner: 0},
    puls: gameCore.initGameArea(),
    doubleBet : constants.DOUBLE_BET_NONE,
    bet: 0,
    user: {
        id: '',
        username: "",
        profileImageURL: 'images/profile.png',
        walletAmount: 0
    },
    opponent: {
        id: '',
        username: "",
        profileImageURL: 'images/profile.png',
        walletAmount: 0
    },
    lineNumbers: {
        1: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25],
        2: [25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0]
    },
    sound: 1,
    is_admin: true
};

/**
 * get waiting rooms from mongo database
 * @param cb
 * @private
 */
function _get_waiting_rooms(cb){
    BackgammonModel.find({status: constants.GAME_STATUS_WAIT_MATCHING}).populate('creator', '-password -salt')
        .then(function (result) {
            cb(null, result);
            return null;
        })
        .catch(function (err) {
            cb(err);
        })
}

/**
 * ================== destroy game when timeout or cancel by creator
 * @param socket
 * @param redisClient
 * @param reason
 * @private
 */
function _destroyGame(socket, redisClient, reason){
    console.log("=============== destroy game ===============");
    var gameData = socket.handshake.session.game;
    if (gameData.roomName){
        // leave room
        socket.leave(gameData.roomName);
        
        // send event
        commonCtrl.broadcast_common_message(socket, constants.EVENT_REMOVE_A_BACKGAMMON_ROOM, {game: gameData});
        commonCtrl.send_direct_message(socket, constants.EVENT_REMOVE_A_BACKGAMMON_ROOM, {game: gameData});
        
        // delete data from redis db
        redisClient.del(gameData.roomName, function (res) {});
        
        // update mongo database
        BackgammonModel.deleteOne({_id: gameData._id}, {status: constants.GAME_STATUS_ENDED})
        .then(function (result) {
            // next();
        })
        .catch(function (err) {
            // next(err);
        });
        
        // remove session data
        socket.handshake.session.game = {};
        socket.handshake.session.save();
        
    }
}

/**
 * ============== when visit lobby page =============
 * response waiting rooms to user
 * @param socket : visit user
 * @param data : request data ( not used )
 */
function visit_lobby_page(socket, data){
    console.log("=============== visit lobby page ===============");
    _get_waiting_rooms(function (err, rooms) {
        commonCtrl.send_direct_message(socket, constants.EVENT_CHANGE_WAITING_BACKGAMMON_ROOMS, rooms || []);
    })
}

/**
 * ============== create a game =============
 * @param io
 * @param socket
 * @param data : game data : {gameName: '', gameAmount: number, gameTime: number or null, winPoints: number or null ... ...}
 * @param redisClient
 */
function create_a_game(io, socket, data, redisClient) {
    console.log("=============== create game ===============");
    var user = socket.request.user;
    var gameName = data.gameName;
    var gameRoom;
    async.waterfall([
        function (next) {
            // check game amount and wallet
            if (data.gameAmount){
                if (user.walletAmount >= data.gameAmount) {
                    // create game to mongodb
                    var newGame = {
                        //creator: mongoose.Types.ObjectId(socket.request.user._id),
                        creator: user._id,
                        roomName: data.gameName || '',
                        betAmount: data.gameAmount,
                        winPoints: data.winPoints || 1
                    };
    
                    BackgammonModel.create(newGame)
                    .then(function (room) {
                        next(null, room);
                    })
                    .catch(function (err) {
                        next({errCode: 3, message: errHandler.getErrorMessage(err), err: err});
                    })
                } else {
                    next({errCode: 2, message: 'your wallet is not enough to create game'});
                }
            } else {
                next ({errCode: 1, message: 'amount is required.'});
            }
        },
        function (room, next) {
            var roomName = constants.BASE_GAMENAME_BACKGAMMON + '-' + room._id;
            
            timeObjs[roomName] = {
                startRollDiceTimer: null,
                checkerTimeout: null,
                autoWinTimeout: {}
            };
    
            gameRoom = initGameData;
    
            gameRoom.roomId = room._id;
            gameRoom.roomName = roomName;
            gameRoom.creator = {
                userId: user._id,
                username: user.username,
                status: constants.USER_STATUS_READY,
                presence: constants.USER_STATUS_ONLINE,
                profileImageURL: user.profileImageURL,
                walletAmount: user.walletAmount,
                connected: constants.ST_NO_CONNECTED
            }
            gameRoom.bet = data.gameAmount;
            
            var roomObj = JSON.stringify(gameRoom);
            redisClient.set(roomName, roomObj);
    
            // save to session
            socket.handshake.session.game = {type:  constants.BASE_GAMENAME_BACKGAMMON, _id: room._id, roomName: roomName, role: 'creator'};
            socket.handshake.session.save();
    
            // join to room
            socket.join(roomName);
    
            // make a timeout for auto close
            timeoutsCtrl.auto_end_miss_match_game_timeout(socket, redisClient, roomName, _destroyGame, function (instanceId) {
                socket.request.timeoutInstance = instanceId;
                next(null, room);
            });
        }
    ], function (err, room) {
        if (err) {
            commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
        } else {
            var roomInfo = {
                _id: gameRoom.roomId,
                roomName: room.roomName,
                betAmount: room.betAmount,
                creator: {
                    username: gameRoom.creator.username
                }
            }
            
            commonCtrl.send_direct_message(socket, constants.EVENT_ANSWER_CREATE_BACKGAMMON_GAME, {message: 'created successfully.'});
            commonCtrl.broadcast_common_message(socket, constants.EVENT_CREATE_A_NEW_BACKGAMMON_ROOM, {game: roomInfo, user: user});
        }
    })
}

/**
 * ============= join to a game =============
 * @param io
 * @param socket
 * @param data : {_id: gameId, roomName: room-name}
 * @param redisClient
 */
function join_to_a_game(io, socket, data, redisClient) {
    console.log("=============== join game ===============");
    
    const gameId = data._id;
    const roomName = constants.BASE_GAMENAME_BACKGAMMON + '-' + gameId;
    var user = socket.request.user;
    var gameRoom = null;

    async.waterfall([
        function (next) {
            // detect game from mongodb and user amount
            if (gameId) {
                BackgammonModel.findOne({_id: gameId})
                    .then(function (gameData) {
                        if (gameData.status == constants.GAME_STATUS_WAIT_MATCHING){
                            if (socket.request.user.walletAmount >= gameData.betAmount){
                                next(null, gameData);
                            } else {
                                next({errCode: 3, message: 'your wallet is not enough for join to this game.'});
                            }
                        } else {
                            next({errCode: 2, message: 'another user was joined to this game, already.'});
                        }
                    })
                    .catch(function (err) {
                        next({errCode: 1, message: 'can not find game room from main database'});
                    });
            } else {
                next({errCode: 0, message: 'game Id is required.'});
            }
        },
        function (room, next) {
            redisClient.get(roomName, function (err, data) {
                if (!err && data){
                    next(null, data, room);
                }
                else {
                    next({errCode: 1, message: 'can not find the living game room.'});
                }
            });
        },
        function (redisData, room, next) {
            // update mongodb
            var query = {_id: room._id};
            var update_values = {
                status: constants.GAME_STATUS_PLAYING,
                partner: user._id
            };
            BackgammonModel.update(query, update_values)
            .then(function (res) {
                next(null, redisData, room);
            })
            .catch(function (err) {
                console.log(err);
                next({erroCode: 5, message: 'fail update room roll dice status', err: err});
            });
        },
        function (redisData, room, next) {
            gameRoom = JSON.parse(redisData);
            gameRoom.partner = {
                status: constants.USER_STATUS_READY,
                userId: user._id,
                username: user.username,
                presence: constants.USER_STATUS_ONLINE,
                profileImageURL: user.profileImageURL,
                walletAmount: user.walletAmount,
                connected: constants.ST_NO_CONNECTED
            };
            gameRoom.step = 1;
            
            var roomObj = JSON.stringify(gameRoom);
            redisClient.set(roomName, roomObj);
    
            // save to session
            socket.handshake.session.game = {type:  constants.BASE_GAMENAME_BACKGAMMON, _id: gameId, roomName: roomName, role: 'partner'};
            socket.handshake.session.save();
    
            console.log(roomName + ": Joined room");
            socket.join(roomName);
            
            next();
        }
    ], function (err) {
        if(err) {
            commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
        } else {
            
            if(gameRoom) {
                var join_game = {
                    roomId: gameId,
                    userId: user._id,
                    message: 'Join a user to room, successfully.'
                }
    
                commonCtrl.send_room_message(io, roomName, constants.EVENT_ANSWER_JOIN_BACKGAMMON_GAME, join_game);
            }
        }
    })
}

function waitUser(socket) {
    console.log("=============== wait user ===============");
    var roomName = socket.request.room;
    if (roomName && gameRoom) {
        gameRoom.waitUserTimer = setTimeout(function () {
            commonCtrl.send_room_message(ioObj, roomName, constants.EVENT_BACKGAMMON_NOTCONNECT_OPPONENT, {});
            autoForceOutRoom(socket);
        }, constants.TIMEOUT_WAIT_USER);
    }
}

function autoForceOutRoom(socket) {
    console.log("=============== auto force out room ===============");
    setTimeout(function() {
        forcOutRoom(socket, null);
    }, 2000);
}

function forcOutRoom(io, socket, data, redisClient) {
    console.log("=============== force out room ===============");
    const gameData = socket.handshake.session.game;
    const roomName = gameData.roomName;
    const user = socket.request.user;
    var loseUserId = user._id;
    console.log("ForceOut loseUserID = " + loseUserId);
    
    if (!roomName) {
        commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 10, message: 'invalid request'});
        // commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 11, message: 'can not find room. it may ended automatically.'});
    } else {
        async.waterfall([
            function (next) {
                redisClient.get(roomName, function (err, data) {
                    if (err) {
                        next({errorCode: 4, message: 'not found game room.'});
                    }
                    else {
                        next(null, data);
                    }
                });
            },
            function (game_data, next) {
                var gameRoom = JSON.parse(game_data);
                
                completeOneGameFlow(io, socket, loseUserId, gameRoom, 4, redisClient);
                
                next();
            }
        ], function (err) {
            if (err) {
                commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
            }
        });
    }
}

/**
 * ==================== ready to start play (eg. opened playing game page successfully.) =======================
 * @param io
 * @param socket
 * @param data
 * @param redisClient
 */
function ready_to_play(io, socket, data, redisClient) {
    console.log("=============== ready to play ===============");
    // socket.handshake.session.game = {type: constants.BASE_GAMENAME_BACKGAMMON, _id: gameId, roomName: roomName, role: 'joiner'};
    const gameData = socket.handshake.session.game;
    const roomName = gameData.roomName;
    const user = socket.request.user;
    if (!roomName)
        return commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {message: 'invalid request'});
    
    // increase step
    redisClient.hincrby(roomName, 'step', 1); // will increase to 2 (ready a user) or 3 (ready two user)
    // change user status in redis db
    // redisClient.set(roomName, gameData.role, constants.USER_STATUS_WAITER);
    // make timer for auto roll first dice
    timeoutsCtrl.auto_roll_first_dice_interval(io, socket, redisClient,
        function (remainTime) {
            commonCtrl.send_direct_message(socket, constants.EVENT_BACKGAMMON_REMAIN_TIME, {remainTime: remainTime});
        },
        _dice_first_roll,
        function (instanceId) {
            socket.request.intervalInstance = instanceId;
            // send message to room
            commonCtrl.send_room_message(io, roomName, constants.EVENT_READY_TO_BACKGAMMON_PLAYING, {userId: user._id});
        });
}


/**
 * ================== dice roll at first time to choose first order =======================
 * @param io
 * @param socket
 * @param redisClient
 * @param callback
 */
function _dice_first_roll(io, socket, redisClient, callback){
    console.log("=============== dice first roll ===============");
    const gameData = socket.handshake.session.game;
    const roomName = gameData.roomName;
    const user = socket.request.user;
    
    // clear prev timeout or interval for auto play
    timeoutsCtrl.clear_prev_interval(socket);
    timeoutsCtrl.clear_prev_timeout(socket);
    
    // make random rolls
    let numbers = gameCore.randomRollResult();
    let sumRoll = numbers[0] + numbers[1];
    
    // increase step in redis db
    
    
    // send room message with count
    commonCtrl.send_room_message(io, roomName, constants.EVENT_BACKGAMMON_DICE_FIRST_ROLL, {userId: user._id, rolls: numbers});
    
    // when first user -> save sumRoll to redis, when second user -> compare count -> restore to ready status or move to playing status
    /*
    Todo: when first user -> save sumRoll to redis, when second user -> compare count -> restore to ready status or move to playing status
     */
    
    // call callback when set
    if (callback && typeof(callback) === 'function'){
        callback();
    }
}

function dice_first_roll(io, socket, data, redisClient) {
    _dice_first_roll(io, socket, redisClient);
}

/**
 * =================== dice roll in playing game ======================
 * @param io
 * @param socket
 * @param redisClient
 * @param callback
 */
function _dice_play_roll(io, socket, redisClient, callback) {
    
    if (callback && typeof(callback) === 'function'){
        callback();
    }
}

function dice_play_roll(io, socket, data, redisClient) {
    _dice_play_roll(io, socket, redisClient);
}


/**
 * ======================= move play checker =================
 * @param io
 * @param socket
 * @param data // move data
 * @param redisClient
 * @param callback
 */
function _move_play_checker(io, socket, data, redisClient, callback){
    if (callback && typeof(callback) === 'function'){
        callback();
    }
}

function move_play_checker(io, socket, data, redisClient) {
    _move_play_checker(io, socket, data, redisClient);
}

/**
 * ======================== abandon from current game ===========================
 * @param io
 * @param socket
 * @param data
 * @param redisClient
 */
function abandon_game(io, socket, data, redisClient) {

}

/**
 * ======================= admin cheat ======================
 * @param io
 * @param socket
 * @param data : ex - {zar_1: 1, zar_2: 2}
 * @param redisClient
 */
function admin_cheat(io, socket, data, redisClient) {
    console.log("=============== admin cheat ===============");
    const gameData = socket.handshake.session.game;
    const roomName = gameData.roomName;
    const user = socket.request.user;
    // detect room name
    if (roomName) {
        async.waterfall([
            function (next) {
                redisClient.get(roomName, function (err, data) {
                    if (err) {
                        next({errorCode: 4, message: 'not found game room.'});
                    }
                    else {
                        next(null, data);
                    }
                });
            },
            function (game_data, next) {
                var gameRoom = JSON.parse(game_data);
                gameRoom.nz = data;
                redisClient.set(roomName, JSON.stringify(gameRoom));
            
                next();
            }
        ], function (err) {
            if (err) {
                commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
            }
        });
    } else {
        // send error message
        commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 10, message: 'invalid request'});
    }
}

/**
 * ====================== send chart message =====================
 * @param io
 * @param socket
 * @param data : {message: ''}
 * @param redisClient
 */
function send_chat_message(io, socket, data, redisClient) {
    console.log("=============== send chat message ===============");
    
    const gameData = socket.handshake.session.game;
    const roomName = gameData.roomName;
    const user = socket.request.user;
    if (!roomName) {
        commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 10, message: 'invalid request'});
        // commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 11, message: 'can not find room. it may ended automatically.'});
    } else {
        async.waterfall([
            function (next) {
                redisClient.get(roomName, function (err, data) {
                    if (err) {
                        next({errorCode: 4, message: 'not found game room.'});
                    }
                    else {
                        next(null, data);
                    }
                });
            },
            function (game_data, next) {
                var gameRoom = JSON.parse(game_data);
                // send error message
                gameRoom['lastMessage'] = data;
                redisClient.set(roomName, JSON.stringify(gameRoom));
    
                // send room message
                commonCtrl.send_room_message(io, roomName, constants.EVENT_BACKGAMMON_CHAT_MESSAGE, data);
            
                next();
            }
        ], function (err) {
            if (err) {
                commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
            }
        });
    }
}

/**
 * ====================== request double bet ==================
 * @param io
 * @param socket
 * @param data
 * @param redisClient
 */
function request_double_bet(io, socket, data, redisClient) {
    console.log("=============== request double bet ===============");
    const gameData = socket.handshake.session.game;
    const roomName = gameData.roomName;
    const user = socket.request.user;
    if (!roomName) {
        commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 10, message: 'invalid request'});
    } else {
        async.waterfall([
            function (next) {
                redisClient.get(roomName, function (err, data) {
                    if (err) {
                        next({errorCode: 4, message: 'not found game room.'});
                    }
                    else {
                        next(null, data);
                    }
                });
            },
            function (game_data, next) {
                var gameRoom = JSON.parse(game_data);
                if(gameRoom.doubleBet == constants.DOUBLE_BET_NONE) {
                    var roomId = gameRoom.roomId;
                    // detect users wallet
                    BackgammonModel.findOne({_id: roomId})
                        .populate('creator')
                        .populate('partner')
                        .then(function (gameObj) {
                            if (gameObj.betAmount * 2 > gameObj.creator.walletAmount){
                                // send error message
                                commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 31, message: 'your wallet amount is not enough for double bet.'});
                            } else if (gameObj.betAmount * 2 > gameObj.partner.walletAmount){
                                // send error message
                                commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 32, message: 'partner wallet amount is not enough for double bet.'});
                            } else {
                                // save double bet status, and send message
                                gameRoom.doubleBet = constants.DOUBLE_BET_REQUIRED;
                                // redisClient.set(roomName, JSON.stringify(gameRoom));
                                commonCtrl.send_room_message(io, roomName, constants.EVENT_BACKGAMMON_REQUEST_DOUBLE_BET, {userId: user._id});
                                // update base mongodb data
    
                                redisClient.set(roomName, JSON.stringify(gameRoom));
                                gameObj.update({doubleBet: constants.DOUBLE_BET_REQUIRED});
                            }
                        })
                        .catch(function (err) {
                            commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 61, message: 'db error'});
                        });
                }
                else {
                    // send error message
                    commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 30, message: 'invalid double bet request'});
                }
                
                next();
            }
        ], function (err) {
            if (err) {
                commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
            }
        });
    }
}

/**
 * ===================== answer double bet ====================
 * @param io
 * @param socket
 * @param data: ex - {answer: true/false}
 * @param redisClient
 */
function answer_double_bet(io, socket, data, redisClient) {
    console.log("=============== answer double bet ===============");
    const gameData = socket.handshake.session.game;
    const roomName = gameData.roomName;
    const user = socket.request.user;
    if (!roomName) {
        commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 10, message: 'invalid request'});
    } else {
        async.waterfall([
            function (next) {
                redisClient.get(roomName, function (err, data) {
                    if (err) {
                        next({errorCode: 4, message: 'not found game room.'});
                    }
                    else {
                        next(null, data);
                    }
                });
            },
            function (game_data, next) {
                var gameRoom = JSON.parse(game_data);
                if(gameRoom.doubleBet == constants.DOUBLE_BET_REQUIRED) {
                    // detect users wallet
                    var roomId = gameRoom.roomId;
                    BackgammonModel.findOne({_id: roomId})
                        .populate('creator')
                        .populate('partner')
                        .then(function (gameObj) {
                            if (data.answer === constants.DOUBLE_BET_APPROVED){
                                // accept
                                if (gameObj.betAmount * 2 > gameObj.creator.walletAmount){
                                    // send error message
                                    commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 31, message: 'your wallet amount is not enough for double bet.'});
                                } else if (gameObj.betAmount * 2 > gameObj.partner.walletAmount){
                                    // send error message
                                    commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 32, message: 'partner wallet amount is not enough for double bet.'});
                                } else {
                                    // save double bet status, and send message
                                    gameRoom.doubleBet = constants.DOUBLE_BET_APPROVED;
                                    gameRoom.requestDoubleBet = false;
                                    redisClient.set(roomName, JSON.stringify(gameRoom));
                        
                                    commonCtrl.send_room_message(io, roomName, constants.EVENT_BACKGAMMON_ANSWER_DOUBLE_BET, {userId: user._id, answer: constants.DOUBLE_BET_APPROVED});
                                    gameObj.update({doubleBet: constants.DOUBLE_BET_APPROVED});
                                }
                            } else {
                                // reject
                                // save double bet status, and send message
                                gameRoom.doubleBet = constants.DOUBLE_BET_REJECTED;
                                gameRoom.requestDoubleBet = false;
                                redisClient.set(roomName, JSON.stringify(gameRoom));
                    
                                commonCtrl.send_room_message(io, roomName, constants.EVENT_BACKGAMMON_ANSWER_DOUBLE_BET, {userId: user._id, answer: constants.DOUBLE_BET_REJECTED});
                                gameObj.update({doubleBet: constants.DOUBLE_BET_REJECTED});
                            }
                        })
                        .catch(function (err) {
                            commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 61, message: 'db error'});
                        });
                }
                else {
                    // send error message
                    commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 30, message: 'invalid double bet request'});
                }
                
                next();
            }
        ], function (err) {
            if (err) {
                commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
            }
        });
    }
}

/**
 * ================== resume prev game =================
 * @param socket
 * @param redisClient
 */
function notification_resume_game(socket, redisClient){
    console.log('----------------- resume game -----------');
    let gameData = socket.handshake.session.game;
    let roomName = gameData.roomName;
    redisClient.keys(roomName, function (err, keys) {
        if (!err && keys.length > 0) {
            // send message for "your prev game is ... "
            commonCtrl.send_direct_message(socket, constants.EVENT_PREV_BACKGAMMON_GAME, {present: true, gameData: gameData});
        } else {
            // clear game data in session
            socket.handshake.session.game = {};
            socket.handshake.session.save();
            // send message for "your prev game was ended automatically"
            commonCtrl.send_direct_message(socket, constants.EVENT_PREV_BACKGAMMON_GAME, {present: false, gameData: gameData});
        }
    })
}

/**
 * =================== answer when request current game ==============
 * @param socket
 * @param data
 * @param redisClient
 */
function answer_current_game_status(socket, data, redisClient){
    console.log("=============== answer current game status ===============");
    const gameData = socket.handshake.session.game;
    const roomName = gameData.roomName;
    const user = socket.request.user;
    if (roomName) {
        redisClient.keys(roomName, function (err, keys) {
            if (err || !keys || keys.length === 0) {
                // send error message
                commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 11, message: 'can not find room. it may ended automatically.'});
            } else {
                redisClient.set(roomName, function (err, gameObj) {
                    if (!err && gameObj){
                        // connect to game room
                        socket.join(roomName);
                        // send game status
                        commonCtrl.send_direct_message(socket, constants.EVENT_ANSWER_MY_BACKGAMMON_GAME, {status: gameObj});
                        // send online user to room
                        commonCtrl.broadcast_room_message(socket, roomName, constants.EVENT_CONNECT_USER, {userId: user._id});
                    } else {
                        // send error message
                        commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 100, message: 'invalid resume request'});
                    }
                })
            }
        })
    } else {
        // send error message
        commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {errCode: 10, message: 'invalid request'});
    }
}

/**
 * =================== auto start roll dice ==============
 * @param socket
 */
function autoStartRollDice(io, socket, gameRoom, redisClient) {
    console.log("------- auto Start Roll Dice --------");
    const roomName = gameRoom.roomName;
    const user = socket.request.user;
    
    if(!timeObjs[roomName].startRollDiceTimer) {
        timeObjs[roomName].startRollDiceTimer = setTimeout(function() {
            if (gameRoom.status == constants.GAME_STATUS_READY || gameRoom.status == constants.GAME_STATUS_DICE) {
            
                gameRoom.status = constants.GAME_STATUS_DICE;
            
                var numbers = gameCore.randomRollResult();
                if (gameRoom.zar_at.creator == 0) {
                    gameRoom.zar.creator = numbers[0];
                    gameRoom.zar_at.creator = 1;
                }
            
                if (gameRoom.zar_at.partner == 0) {
                    gameRoom.zar.partner = numbers[1];
                    gameRoom.zar_at.partner = 1;
                }
            
                var player_turn = 0;
                if (gameRoom.zar_at.creator == 1 && gameRoom.zar_at.partner == 1) {
                    if (gameRoom.zar.creator != gameRoom.zar.partner) {
                        player_turn = (gameRoom.zar.creator > gameRoom.zar.partner) ? 1: 2;
                    }
                }
            
                var roomObj = JSON.stringify(gameRoom);
                redisClient.set(roomName, roomObj);
            
                commonCtrl.update_room_order_status(gameRoom.roomId, gameRoom.zar, gameRoom.zar_at, player_turn, function (err, result) {
                    if (err) {
                        commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
                    } else {
                        if (gameRoom.zar_at.creator == 1 && gameRoom.zar_at.partner == 1) {
                            if (gameRoom.zar.creator != gameRoom.zar.partner) {
                                gameRoom.status = constants.GAME_STATUS_PLAYING;
                                gameRoom.preStatus = constants.GAME_STATUS_PLAYING;
                                if (gameRoom.creator.userId != '') {
                                    gameRoom.creator.status = (gameRoom.zar.creator > gameRoom.zar.partner ? constants.GAME_STATUS_ROLL_ENABLE : constants.GAME_STATUS_ROLL_DISABLE);
                                }
                                if (gameRoom.partner.userId != '') {
                                    gameRoom.partner.status = (gameRoom.zar.creator < gameRoom.zar.partner ? constants.GAME_STATUS_ROLL_ENABLE : constants.GAME_STATUS_ROLL_DISABLE);
                                }
                            
                                gameRoom.startAutoAt = moment();
                            
                                redisClient.set(roomName, JSON.stringify(gameRoom));
                            
                                setTimeout(function () {
                                    autoStartPlayingRoll(io, socket, gameRoom, redisClient);
                                }, constants.TIMEOUT_START_PLAY);
                            
                            } else {
                                gameRoom.status = constants.GAME_STATUS_DICE;
                                gameRoom.startAutoAt = moment();
                            
                                redisClient.set(roomName, JSON.stringify(gameRoom));
                            
                                reRollDice(io, socket, gameRoom, redisClient);
                            }
                        
                            commonCtrl.send_room_message(ioObj, roomName, constants.EVENT_BACKGAMMON_RESULT_ROLL_DICE, {
                                player_turn: player_turn,
                                zar: gameRoom.zar,
                                zar_at: gameRoom.zar_at
                            });
                        }
                    }
                });
            }
        }, constants.TIMEOUT_ROOL_DICE);
    }
}

/**
 * =================== reroll dice ==============
 * @param socket
 */
function reRollDice(io, socket, gameRoom, redisClient) {
    console.log("=============== re roll dice ===============");
    const gameData = socket.handshake.session.game;
    const roomName = gameData.roomName;
    const user = socket.request.user;
    setTimeout(function () {
        if (gameRoom.status == constants.GAME_STATUS_READY || gameRoom.status == constants.GAME_STATUS_DICE) {
            console.log("StartRoll ReDice: " + gameRoom.status);
            
            gameRoom.status = constants.GAME_STATUS_DICE;
            
            var numbers = gameCore.randomRollResult();
            gameRoom.zar.creator = numbers[0];
            gameRoom.zar_at.creator = 1;
            gameRoom.zar.partner = numbers[1];
            gameRoom.zar_at.partner = 1;
            
            var player_turn = 0;
            if (gameRoom.zar_at.creator == 1 && gameRoom.zar_at.partner == 1) {
                if (gameRoom.zar.creator != gameRoom.zar.partner) {
                    player_turn = (gameRoom.zar.creator > gameRoom.zar.partner) ? 1: 2;
                }
            }
            
            redisClient.set(roomName, JSON.stringify(gameRoom));
            
            commonCtrl.update_room_order_status(gameRoom.roomId, gameRoom.zar, gameRoom.zar_at, player_turn, function (err, result) {
                if (err) {
                    commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
                } else {
                    if (gameRoom.zar_at.creator == 1 && gameRoom.zar_at.partner == 1) {
                        if (gameRoom.zar.creator != gameRoom.zar.partner) {
                            gameRoom.status = constants.GAME_STATUS_PLAYING;
                            gameRoom.preStatus = constants.GAME_STATUS_PLAYING;
                            if (gameRoom.creator) {
                                gameRoom.creator.status = (gameRoom.zar.creator > gameRoom.zar.partner ? constants.GAME_STATUS_ROLL_ENABLE : constants.GAME_STATUS_ROLL_DISABLE);
                            }
                            if (gameRoom.partner) {
                                gameRoom.partner.status = (gameRoom.zar.creator < gameRoom.zar.partner ? constants.GAME_STATUS_ROLL_ENABLE : constants.GAME_STATUS_ROLL_DISABLE);
                            }
            
                            gameRoom.startAutoAt = moment();
            
                            redisClient.set(roomName, JSON.stringify(gameRoom));
            
                            setTimeout(function () {
                                autoStartPlayingRoll(io, socket, gameRoom, redisClient);
                            }, constants.TIMEOUT_START_PLAY);
                        } else {
                            gameRoom.status = constants.GAME_STATUS_DICE;
                            gameRoom.startAutoAt = moment();
            
                            redisClient.set(roomName, JSON.stringify(gameRoom));
            
                            autoStartRollDice(io, socket, gameRoom, redisClient);
                        }
        
                        commonCtrl.send_room_message(io, roomName, constants.EVENT_BACKGAMMON_RESULT_ROLL_DICE, {
                            player_turn: player_turn,
                            zar: gameRoom.zar,
                            zar_at: gameRoom.zar_at
                        });
                    }
                }
            });
        }
    }, constants.TIMEOUT_AUTO_DICE);
}

/**
 * =================== start roll dice ==============
 * @param socket
 */
function startRollDice(socket) {
    console.log("=============== start roll dice ===============");
    
    const gameData = socket.handshake.session.game;
    const roomName = gameData.roomName;
    const user = socket.request.user;
    const userId = user._id;
    console.log(userId + " are rolling the dice now in " + roomName);
    
    if (gameRoom.status == constants.GAME_STATUS_READY || gameRoom.status == constants.GAME_STATUS_DICE) {
        
        gameRoom.status = constants.GAME_STATUS_DICE;
        var gameRoom = gameRoom;
        var numbers = gameCore.randomRollResult();
        var num = numbers[0];
        
        if (gameRoom.creator.userId == userId) {
            gameRoom.zar.creator = num;
            gameRoom.zar_at.creator = 1;
        } else if (gameRoom.partner.userId == userId) {
            gameRoom.zar.partner = num;
            gameRoom.zar_at.partner = 1;
        }
        
        var player_turn = 0;
        if (gameRoom.zar_at.creator == 1 && gameRoom.zar_at.partner == 1) {
            if (timeObjs[roomName].startRollDiceTimer) {
                clearTimeout(timeObjs[roomName].startRollDiceTimer);
                timeObjs[roomName].startRollDiceTimer = null;
            }
            
            if (gameRoom.zar.creator != gameRoom.zar.partner) {
                player_turn = (gameRoom.zar.creator > gameRoom.zar.partner) ? 1: 2;
            }
        }
        
        // redisClient.set(roomName, JSON.stringify(gameRoom));
        commonCtrl.update_room_order_status(gameRoom.roomId, gameRoom.zar, gameRoom.zar_at, player_turn, function (err, result) {
            if (err) {
                commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
            } else {
                if (gameRoom && gameRoom) {
                    var gameRoom = gameRoom;
                    if (gameRoom.zar_at.creator == 1 && gameRoom.zar_at.partner == 1) {
                        if (gameRoom.zar.creator != gameRoom.zar.partner) {
                            var gameRoom = gameRoom;
                            gameRoom.status = constants.GAME_STATUS_PLAYING;;
                            gameRoom.preStatus = constants.GAME_STATUS_PLAYING;;
                            if (gameRoom.creator) {
                                gameRoom.creator.status = (gameRoom.zar.creator > gameRoom.zar.partner ? constants.GAME_STATUS_ROLL_ENABLE : constants.GAME_STATUS_ROLL_DISABLE);
                            }
                            if (gameRoom.partner) {
                                gameRoom.partner.status = (gameRoom.zar.creator < gameRoom.zar.partner ? constants.GAME_STATUS_ROLL_ENABLE : constants.GAME_STATUS_ROLL_DISABLE);
                            }
                            
                            gameRoom.startAutoAt = moment();
                            
                            // redisClient.set(roomName, JSON.stringify(gameRoom));
                            
                            setTimeout(function () {
                                autoStartPlayingRoll(socket);
                            }, constants.TIMEOUT_START_PLAY);
                            
                        } else {
                            gameRoom.status = constants.GAME_STATUS_DICE;
                            gameRoom.startAutoAt = moment();
                            
                            // redisClient.set(roomName, JSON.stringify(gameRoom));
                            
                            reRollDice(socket);
                        }
                        
                        commonCtrl.send_room_message(ioObj, roomName, constants.EVENT_BACKGAMMON_RESULT_ROLL_DICE, {
                            player_turn: player_turn,
                            zar: gameRoom.zar,
                            zar_at: gameRoom.zar_at
                        });
                    }
                }
            }
        });
    }
}

/**
 * =================== auto start playing roll ==============
 * @param socket
 */
function autoStartPlayingRoll(io, socket, gameRoom, redisClient) {
    console.log("-------- auto Start Playing Roll ---------")
    const roomName = gameRoom.roomName;
    if (gameRoom.status == constants.GAME_STATUS_PLAYING) {
        gameRoom.status = constants.GAME_STATUS_DICE;
        gameRoom.startAutoAt = moment();
        setTimeout(function () {
            if (gameRoom) {
                var numbers = gameCore.randomRollResult();
                var num1 = numbers[0];
                var num2 = numbers[1];
                if  (gameRoom.nz) {
                    num1 = Number(gameRoom.nz[1]);
                    num2 = Number(gameRoom.nz[2]);
                    gameRoom.nz = null;
                }
                var firstEnable = (gameRoom.creator.status == constants.GAME_STATUS_ROLL_ENABLE);
                var send_data = {
                    player_turn: firstEnable ? 1 : 2,
                    zar: {creator: num1, partner: num2},
                    message: 'result roll dice'
                };
                gameRoom.creator.status = (firstEnable ? constants.GAME_STATUS_ROLL_DISABLE : constants.GAME_STATUS_ROLL_ENABLE);
                gameRoom.partner.status = (firstEnable ? constants.GAME_STATUS_ROLL_ENABLE : constants.GAME_STATUS_ROLL_DISABLE);
                
                // redisClient.set(roomName, JSON.stringify(gameRoom));
                commonCtrl.updateRoomRollDiceStatus(gameRoom.roomId, send_data.player_turn, send_data.zar, function (err, result) {
                    if (err) {
                        commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
                    } else {
                        if (gameRoom) {
                            commonCtrl.send_room_message(io, roomName, constants.EVENT_BACKGAMMON_RESULT_PLAYING_DICE, send_data);
                            //gameRoom.status = constants.EVENT_BACKGAMMON_MOVE_CHECKER;
                            gameRoom.status = constants.GAME_STATUS_WAITING_MOVE_CHECKER;
                            gameRoom.zar = {creator: num1, partner: num2};
                            
                            redisClient.set(roomName, JSON.stringify(gameRoom));
                            
                            autoMoveChecker(io, socket, gameRoom, num1, num2, redisClient);
                        } else {
                            commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {error: constants.ERROR_CANNOT_FIND_ROOM, message: ''});
                        }
                    }
                });
            }
        }, constants.TIMEOUT_ROLLING);
        var send_data = {
            player_turn: gameRoom.creator.status == gameRoom.GAME_STATUS_ROLL_ENABLE ? 1 : 2,
            message: 'Starting roll dice'
        };
        commonCtrl.send_room_message(io, roomName, constants.EVENT_BACKGAMMON_START_PLAYING_DICE, send_data);
    } else {
        gameRoom.startAutoAt = null;
    }
}

/**
 * =================== auto move checker ==============
 * @param socket
 * @param num1
 * @param num2
 */
function autoMoveChecker(io, socket, gameRoom, num1, num2, redisClient) {
    console.log(" -------- auto move checker ----------")
    const roomName = gameRoom.roomName;
    const user = socket.request.user;
    if (gameRoom){
        gameRoom.startAutoAt = moment();
        var checkerTimeout = setTimeout(function () {
            var firstEnable = (gameRoom.creator.status == constants.GAME_STATUS_ROLL_ENABLE);
            var real_player_turn = firstEnable ? 2 : 1;
    
            if (gameRoom.status == constants.GAME_STATUS_WAITING_MOVE_CHECKER) {
                gameCore.autoplay(gameRoom, real_player_turn, function (ansObj) {
                    gameRoom.hamle = ansObj.hamle;
                    gameRoom.gameArea = ansObj.gameArea;
                    gameRoom.player_last = ansObj.player_last;
            
                    gameRoom.status = constants.GAME_STATUS_PLAYING;
            
                    redisClient.set(roomName, JSON.stringify(gameRoom));
            
                    commonCtrl.updateRoomPullarStatus(gameRoom.roomId, ansObj.hamle, ansObj.gameArea, ansObj.player_last, function (err, result) {
                        if (err) {
                            commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
                        } else {
                            commonCtrl.send_room_message(ioObj, roomName, constants.EVENT_BACKGAMMON_RESULT_MOVE_CHECKER, {
                                hamle: ansObj.hamle,
                                pullar: ansObj.gameArea,
                                player_last: ansObj.player_last
                            });
                            if (gameCore.is_finished(real_player_turn, ansObj.gameArea)) {
                                var loseUserId = "";
                                if (real_player_turn == 1) {
                                    loseUserId = gameRoom.partner.userId;
                                } else {
                                    loseUserId = gameRoom.creator.userId;
                                }
                                completeOneGameFlow(io, socket, loseUserId, gameRoom, 3, redisClient);
                            } else {
                                autoStartPlayingRoll(io, socket, gameRoom, redisClient);
                            }
                        }
                    });
                });
            } else {
                gameRoom.startAutoAt = null;
            }
        }, constants.TIMEOUT_AUTO_MOVE_CHECKER);
        
        timeObjs[roomName].checkerTimeout = checkerTimeout;
        
        // redisClient.set(roomName, JSON.stringify(gameRoom));
    }
}

/**
 * =================== move checker ==============
 * @param socket
 * @param data
 */
function moveChecker(io, socket, data, redisClient){
    console.log("=============== move checker ===============");
    const gameData = socket.handshake.session.game;
    const roomName = gameData.roomName;
    const user = socket.request.user;
    if (roomName){
        async.waterfall([
            function (next) {
                redisClient.get(roomName, function (err, data) {
                    if (err) {
                        next({errorCode: 4, message: 'not found game room.'});
                    }
                    else {
                        next(null, data);
                    }
                });
            },
            function (game_data, next) {
                var gameRoom = JSON.parse(game_data);
    
                console.log("moveChecker: Game Status = " + gameRoom.status);
                var firstEnable = (gameRoom.creator.status == constants.GAME_STATUS_ROLL_ENABLE);
                var real_player_turn = firstEnable ? 2 : 1;
    
                if (gameRoom.status == constants.GAME_STATUS_WAITING_MOVE_CHECKER) {
        
                    var checkValid = gameCore.validateMove(data, gameRoom, socket, real_player_turn);
                    if (checkValid.hamle == ''){
                        gameRoom.hamle = checkValid.hamle;
                        gameRoom.player_last = checkValid.player_last;
                        gameRoom.status = constants.GAME_STATUS_PLAYING;
            
                        redisClient.set(roomName, JSON.stringify(gameRoom));
            
                        commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, 'invalid move');
                        //console.log("updating room popullar status....");
                        commonCtrl.updateRoomPullarStatus(gameRoom.roomId, checkValid.hamle, gameRoom.gameArea, checkValid.player_last, function (err, result) {
                            //console.log("updating room popullar status....");
                            if (err) {
                                commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
                            } else {
                                if(timeObjs[roomName].checkerTimeout){
                                    clearTimeout(timeObjs[roomName].checkerTimeout);
                                    timeObjs[roomName].checkerTimeout = null;
                                }
                                autoStartPlayingRoll(io, socket, gameRoom, redisClient);
                            }
                        });
                    } else {
                        gameRoom.hamle = checkValid.hamle;
                        gameRoom.gameArea = checkValid.gameArea;
                        gameRoom.player_last = checkValid.player_last;
                        gameRoom.status = constants.GAME_STATUS_PLAYING;
            
                        redisClient.set(roomName, JSON.stringify(gameRoom));
            
                        // console.log("updating room popullar status....");
                        commonCtrl.updateRoomPullarStatus(gameRoom.roomId, checkValid.hamle, checkValid.gameArea, checkValid.player_last, function (err, result) {
                            // console.log("updating room popullar status....");
                            if (err) {
                                commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
                            } else {
                                if(timeObjs[roomName].checkerTimeout){
                                    clearTimeout(timeObjs[roomName].checkerTimeout);
                                    timeObjs[roomName].checkerTimeout = null;
                                }
                                commonCtrl.send_room_message(ioObj, roomName, constants.EVENT_BACKGAMMON_RESULT_MOVE_CHECKER, {
                                    hamle: gameRoom.hamle,
                                    pullar: gameRoom.gameArea,
                                    player_last: gameRoom.player_last
                                });
                                if (gameCore.is_finished(real_player_turn, checkValid.gameArea)) {
                                    var loseUserId = "";
                                    if (real_player_turn == 1) {
                                        loseUserId = gameRoom.partner.userId;
                                    } else {
                                        loseUserId = gameRoom.creator.userId;
                                    }
                                    completeOneGameFlow(io, socket, loseUserId, gameRoom, 3, redisClient);
                                    
                                    return;
                                }
                                
                                autoStartPlayingRoll(io, socket, gameRoom, redisClient);
                            }
                        });
                    }
                } else {
                    commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, 'you can not move checker for now.');
                }
                
                next();
            }
        ], function (err) {
            if (err) {
                commonCtrl.send_direct_message(socket, constants.EVENT_BACKGAMMON_GAME_LOAD_RESULT, err);
            }
        });
    } else {
        commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, 'invalid request to move checker');
    }
}

// reconnect a user to room
function reconnectUser(io, socket, data, redisClient, gameRoom) {
    console.log("=============== reconnect user ===============");
    
    const gameData = socket.handshake.session.game;
    var roomName = gameData.roomName;
    const user = socket.request.user;
    
    if (!user){
        return commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {message: 'Invalid request for reconnect backgammon game.'});
    }
    async.waterfall([
        function (next) {
            if(gameRoom) {
                next(null, gameRoom)
            }
            else {
                redisClient.get(roomName, function (err, data) {
                    if (err) {
                        next({errorCode: 4, message: 'not found game room.'});
                    }
                    else {
                        next(null, JSON.parse(data));
                    }
                });
            }
        },
        function (room, next) {
            gameRoom = room;
            if(gameRoom) {
                var roomName = gameRoom.roomName;
                socket.join(roomName);
    
                var userId = commonCtrl.getUserId(socket);
                // if(gameRoom.autoWinTimeout[userId]) {
                //     console.log("Reconnectd User Id: " + userId + " , Auto Win Timer is clearing now");
                //     clearTimeout(gameRoom.autoWinTimeout[userId]); // clear autoWin timeout
                //     gameRoom.autoWinTimeout[userId] = null;
                // }
    
                // restore game status from preStatus
                if(gameRoom.creator.userId == userId){
                    gameRoom.creator.presence = constants.USER_STATUS_ONLINE;
        
                } else if (gameRoom.partner.userId == userId) {
                    gameRoom.partner.presence = constants.USER_STATUS_ONLINE;
                }
                //--- end restore
    
                var roomId = gameRoom.roomId;
                commonCtrl.broadcast_room_message(socket, roomName, constants.EVENT_RECONNECT_USER_BACKGAMMON, {roomId: roomId, userId: user.id});
    
                var firstEnable = (gameRoom.creator.status == constants.GAME_STATUS_ROLL_ENABLE );
                var player_turn = firstEnable ? 2 : 1;
    
                commonCtrl.send_room_message(io, roomName, constants.EVENT_ANSWER_GAME_STATUS, {
                    status: gameRoom,
                    player_turn: player_turn,
                    remainingTime: gameRoom.startAutoAt ? moment().diff(gameRoom.startAutoAt, 'seconds') * 1000 : 0
                });
            }
            next();
        }
    ], function (err) {
        if(err) {
            //console.log("reconnect error = " + err);
            commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
        }
    })
}

function autoWinConnectUser(socket, roomName, disconnectUserId){
    console.log("=============== auto win connect user ===============");
    if (gameRoom) {
        if (gameRoom.autoWinTimeout && gameRoom.autoWinTimeout['user' + disconnectUserId]) {
        
        } else {
            var autoWinTimeout = setTimeout(function () {
                forceWin(io, socket, disconnectUserId, roomName);
            }, constants.TIMEOUT_AUTO_WIN);
            
            console.log("Disconnectd User Id: " + disconnectUserId + " , Auto Win Timer is working now");
            gameRoom.autoWinTimeout['user' + disconnectUserId] = autoWinTimeout;
        }
    }
}

// detect disconnect a user in room
function disconnectUser(io, socket, redisClient) {
    console.log("=============== disconnect user ===============");
    var roomName = socket.request.room;
    var roomId = socket.request.bgRoomId;
    if(roomName && gameRoom){
        var userId = socket.request.userId;
        var gameRoom = gameRoom;
        autoWinConnectUser(io, socket, roomName, userId);
        
        console.log("Disconnect User: " + userId);
        if(gameRoom && gameRoom.creator && gameRoom.creator.userId == userId) {
            gameRoom.creator.presence = constants.USER_STATUS_OFFLINE;
        } else if (gameRoom && gameRoom.partner && gameRoom.partner.userId == userId) {
            gameRoom.partner.presence = constants.USER_STATUS_OFFLINE;
        }
        
        commonCtrl.send_room_message(ioObj, roomName, constants.EVENT_DISCONNECT_USER, {userId: socket.request.userId});
    }
}

function forceWin(io, socket, loseUserId, roomName) {
    console.log("=============== force win ===============");
    
    console.log("ForceWin loseUserID = " + loseUserId);
    completeOneGameFlow(io, socket, loseUserId, roomName, 4);
    
}

function completeOneGameFlow(io, socket, loseUserId, gameRoom, step, redisClient){
    console.log("=============== complete one game flow ===============");
    if(gameRoom) {
        // Object.keys(gameRoom.autoWinTimeout).forEach(function(keyName) {
        //     if (gameRoom.autoWinTimeout[keyName]) {
        //         clearTimeout(gameRoom.autoWinTimeout[keyName]);
        //         gameRoom.autoWinTimeout[keyName] = null;
        //     }
        // });
        
        async.waterfall([
            function (next) {
                var gameId = gameRoom.roomId;
                BackgammonModel.findOne({_id: gameId})
                .then(function (gameData) {
                    next(null, gameData);
                })
                .catch(function (err) {
                    next({errCode: 1, message: 'can not find game room from main database'});
                });
            },
            function (room, next) {
                if (gameRoom.status != constants.GAME_STATUS_READY && gameRoom.status != constants.GAME_STATUS_DICE) {
        
                    var bet = room.doubleBet == constants.DOUBLE_BET_APPROVED ? room.betAmount * 2 : room.betAmount;
                    var gained = bet - (bet * gameSettings['backgammon_comission-rate'] / 100);
                    var comission = bet * gameSettings['backgammon_comission-rate'] / 100;
                    var cId = JSON.stringify(room.creator);
                    var lId = JSON.stringify(loseUserId);
                    if(cId == lId) {
                        commonCtrl.updateUserBalance(room.partner, gained, room.id, constants.BACKGAMMON_GAME_ID, comission, function (err, result) {
                            if (err) {
                                next(err);
                            } else {
                                commonCtrl.updateUserBalance(room.creator, bet * -1, room.id, constants.BACKGAMMON_GAME_ID, null, function (err, result) {
                                    next(err, room); // go to next step, successfully
                                })
                            }
                        });
                    }
                    else if(JSON.stringify(room.partner.id) === JSON.stringify(loseUserId.id)) {
                        commonCtrl.updateUserBalance(room.creator, gained, room._id, constants.BACKGAMMON_GAME_ID, comission, function (err, result) {
                            if (err) {
                                next(err);
                            } else {
                                commonCtrl.updateUserBalance(room.partner, bet * -1, room._id, constants.BACKGAMMON_GAME_ID, null, function (err, result) {
                                    next(err, room); // go to next step, successfully
                                })
                            }
                        });
                    }
                    else {
                        next({message: 'not matching user id in this game room.'})
                    }
                } else {
                    next("", room);
                }
            },
            function (room, next) {
                if (gameRoom) {
                    var winner = (loseUserId == room.creator._id) ? 2 : 1;
                    
                    var gameData = {
                        creator: room['creator'],
                        partner: room['partner'],
                        roomName: room['roomName'],
                        betAmount: room['betAmount'],
                        doubleBet: room['doubleBet'],
                        winPoints: room['winPoints'],
                        status: room['status'],
                        player_turn: room['player_turn'],
                        player_last: room['player_last'],
                        turn_start: room['turn_start'],
                        step: step,
                        zar: room['zar'],
                        zar_at: room['zar_at'],
                        nz: room['nz'],
                        pullar: room['pullar'],
                        hamle: room['hamle'],
                        winner: room['winner'],
                        last_message: room['last_message'],
                    }
                    
                    BackgammonModel.deleteOne({_id: room._id})
                        .then(function (res) {
                            if (gameRoom.status != constants.GAME_STATUS_READY && gameRoom.status != constants.GAME_STATUS_DICE) {
                                BackgammonHistoryModel.create(gameData)
                                    .then(function (result) {
                                        next();
                                    })
                                    .catch(function (err) {
                                        next({message: 'fail insert game to backgammon history database.', err: err});
                                    });
                            } else {
                                next();
                            }
                        })
                        .catch(function (err) {
                            next({message: 'fail delete backgammon game data from database.', err: err});
                        });
                } else {
                    next({message: 'can not found room.'});
                }
            }
        ], function (err) {
            if(err) {
                // fail complete game
                console.error(err.message);
                commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, err);
            } else {
                // success complete game
                var roomName = gameRoom.roomName;
                if (gameRoom.status != constants.GAME_STATUS_READY && gameRoom.status != constants.GAME_STATUS_DICE) {
                    // commonCtrl.broadcast_common_message(socket, constants.EVENT_BACKGAMMON_END_GAME, {loseUserId: loseUserId});
                    commonCtrl.send_room_message(io, roomName, constants.EVENT_BACKGAMMON_END_GAME, {loseUserId: loseUserId});
                } else {
                    // commonCtrl.broadcast_common_message(socket, constants.EVENT_BACKGAMMON_END_GAME, {loseUserId: ''});
                    commonCtrl.send_room_message(io, roomName, constants.EVENT_BACKGAMMON_END_GAME, {loseUserId: ''});
                }
                
                redisClient.del(roomName);
            }
        })
    } else {
        next({message: 'can not found room.'});
    }
}

function load_to_a_game (io, socket, data, redisClient) {
    console.log("=============== load game ===============");
    var user = socket.request.user;
    const gameData = socket.handshake.session.game;

    var roomId = null;
    var roomName = null;
    if(data) {
        roomId = data.roomId;
    }
    if(gameData) {
        roomName = gameData.roomName;
    }
    
    console.log('============== roomId: ' + roomId);
    console.log('============== roomName: ' + roomName);

    var gameRoom = null;
    if(roomName) {
        async.waterfall([
            function (next) {
                redisClient.get(roomName, function (err, data) {
                    if (err) {
                        next({errorCode: 4, message: 'not found game room.'});
                    }
                    else {
                        next(null, data);
                    }
                });
            },
            function (game_data, next) {
                gameRoom = JSON.parse(game_data);
                var room_data = initRoomData;
                room_data.roomId = gameRoom.roomId;
                room_data.roomName = gameRoom.roomName;
                room_data.zar = gameRoom.zar;
                room_data.zar_at = gameRoom.zar_at;
                room_data.puls = gameRoom.gameArea;
                room_data.doubleBet = gameRoom.doubleBet;
                room_data.bet = gameRoom.bet;
            
                console.log('======== user Id ============== : ' + JSON.stringify(user._id));
                console.log('======== creator Id =========== : ' + gameRoom.creator.userId);
                var userId = commonCtrl.getUserId(socket);
                if (userId == gameRoom.creator.userId) {
                    console.log("============== crate load request ============" + user.username);
                    room_data.owner = 1;
                    room_data.partner = 2;
                    room_data.curPlayer = 1;
                    room_data.passivePlayer = 2;
                
                    room_data.user.id = gameRoom.creator.userId;
                    room_data.user.username = gameRoom.creator.username;
                    room_data.user.profileImageURL = gameRoom.creator.profileImageURL;
                    room_data.user.walletAmount = gameRoom.creator.walletAmount;
                
                    room_data.opponent.id = gameRoom.partner.userId;
                    room_data.opponent.username = gameRoom.partner.username;
                    room_data.opponent.profileImageURL = gameRoom.partner.profileImageURL;
                    room_data.opponent.walletAmount = gameRoom.partner.walletAmount;
                    
                    gameRoom.creator.connected = constants.ST_CONNECTED;
                }
                else {
                    console.log("============== join load request ============ " + user.username);
                    room_data.owner = 2;
                    room_data.partner = 1;
                    room_data.curPlayer = 2;
                    room_data.passivePlayer = 1;
                
                    room_data.user.id = gameRoom.partner.userId;
                    room_data.user.username = gameRoom.partner.username;
                    room_data.user.profileImageURL = gameRoom.partner.profileImageURL;
                    room_data.user.walletAmount = gameRoom.partner.walletAmount;
                
                    room_data.opponent.id = gameRoom.creator.userId;
                    room_data.opponent.username = gameRoom.creator.username;
                    room_data.opponent.profileImageURL = gameRoom.creator.profileImageURL;
                    room_data.opponent.walletAmount = gameRoom.creator.walletAmount;
    
                    gameRoom.partner.connected = constants.ST_CONNECTED;
                }
    
                commonCtrl.send_direct_message(socket, constants.EVENT_BACKGAMMON_GAME_LOAD_RESULT, room_data);
                
                redisClient.set(roomName, JSON.stringify(gameRoom));
                
                if(roomId) {
                    if(gameRoom.partner.userId == userId) {
                        console.log('================== call auto Start Roll Dice =========================');
                        commonCtrl.send_room_message(io, roomName, constants.EVENT_CAN_ROLL_DICE_BACKGAMMON, {message: 'Can start roll dice.'});
                        autoStartRollDice(io, socket, gameRoom, redisClient);
                    }
                }
                else {
                    reconnectUser(io, socket, null, redisClient, gameRoom);
                }
            
                next();
            }
        ], function (err) {
            if (err) {
                commonCtrl.send_direct_message(socket, constants.EVENT_BACKGAMMON_GAME_LOAD_RESULT, err);
            }
        });
    }
    else {
        commonCtrl.send_direct_message(socket, constants.EVENT_ERROR, {});
    }
}

function init(io, socket, redisClient){
    ioObj = io;
    
    socket.on(constants.EVENT_VISIT_BACKGAMMON_LOBBY, function (data) {
        visit_lobby_page(socket, data);
    });
    
    socket.on(constants.EVENT_CREATE_BACKGAMMON_GAME, function (data) {
        create_a_game(io, socket, data, redisClient);
    });
    
    socket.on(constants.EVENT_JOIN_BACKGAMMON_GAME, function (data) {
        join_to_a_game(io, socket, data, redisClient);
    });
    
    socket.on(constants.EVENT_BACKGAMMON_GAME_LOAD, function (data) {
        load_to_a_game(io, socket, data, redisClient);
    })
    
    socket.on(constants.EVENT_READY_TO_BACKGAMMON_PLAYING, function (data) {
        ready_to_play(io, socket, data, redisClient);
    });
    
    socket.on(constants.EVENT_BACKGAMMON_DICE_FIRST_ROLL, function (data) {
        dice_first_roll(io, socket, data, redisClient);
    });
    
    socket.on(constants.EVENT_BACKGAMMON_MOVE_CHECKER, function (data) {
        // move_play_checker(io, socket, data, redisClient);
        moveChecker(io, socket, data, redisClient);
    });
    
    socket.on(constants.EVENT_BACKGAMMON_DICE_GAME_ROLL, function (data) {
        dice_play_roll(io, socket, data, redisClient);
    });
    
    socket.on(constants.EVENT_FORCE_OUT_ROOM, function (data) {
        forcOutRoom(io, socket, data, redisClient);
    });
    
    socket.on(constants.EVENT_BACKGAMMON_ADMIN_CHEAT, function (data) {
        admin_cheat(io, socket, data, redisClient);
    });
    
    socket.on(constants.EVENT_BACKGAMMON_CHAT_MESSAGE, function (data) {
        send_chat_message(io, socket, data, redisClient);
    });
    
    socket.on(constants.EVENT_BACKGAMMON_REQUEST_DOUBLE_BET, function (data) {
        request_double_bet(io, socket, data, redisClient);
    });
    
    socket.on(constants.EVENT_BACKGAMMON_ANSWER_DOUBLE_BET, function (data) {
        answer_double_bet(io, socket, data, redisClient);
    });
    
    socket.on(constants.EVENT_REQUEST_MY_BACKGAMMON_GAME, function (data) {
        answer_current_game_status(socket, data, redisClient);
    });
    
    socket.on(constants.EVENT_RECONNECT_USER_BACKGAMMON, function (data) {
        reconnectUser(io, socket, data, redisClient, null);
    });
    
    socket.on('disconnect', function () {
        let gameData = socket.handshake.session.game;
        if (gameData && gameData.roomName && gameData.type === constants.BASE_GAMENAME_BACKGAMMON){
            // send room message
            commonCtrl.broadcast_room_message(socket, gameData.roomName, constants.EVENT_DISCONNECT_USER, {userId: socket.request.user._id});
        }
    });
    
    // notification resume game
    let gameData = socket.handshake.session.game;
    if (gameData && gameData.type === constants.BASE_GAMENAME_BACKGAMMON){
        notification_resume_game(socket, redisClient);
    }
}

exports.init = init;
