// npm libraries
const mongoose = require('mongoose');

// db Models
var BackgammonModel = mongoose.model('Backgammon');
var BackgammonHistoryModel = mongoose.model('BackgammonHistory');
var UserModel = mongoose.model('AppUser');

// constants
const constants = require(path.resolve('./config/constants'));

// event names for initial game
const EVENT_CREATE_ROOM         = 'createBgRoom';
const EVENT_ANSWER_CREATE_ROOM  = 'answerCreateBgRoom';
const EVENT_JOIN_ROOM           = 'joinBgRoom';
const EVENT_ANSWER_JOIN_ROOM    = 'answerJoinBgRoom';
const EVENT_WAIT_USER           = 'WaitUser';
const EVENT_CAN_ROLL_DICE       = 'can_roll_dice';
const EVENT_RECONNECT_USER      = 'reconnectBgRoom';

const EVENT_ANSWER_GAME_STATUS  = 'answerBgStatus';
const EVENT_CHAT_MESSAGE        = 'bgChatMessage';
const EVENT_FORCE_OUT_ROOM      = 'forceOutBgRoom';
const EVENT_DISCONNECT_USER     = 'outBgRoom';

// event names for playing game
const EVENT_REQUEST_DOUBLE_BET  = 'requestBgDoubleBet';
const EVENT_ANSWER_DOUBLE_BET   = 'answerBgDoubleBet';

const EVENT_START_ROLL_DICE     = 'startRollDice';
const EVENT_RESULT_ROLL_DICE    = 'resultRollDice';
const EVENT_START_PLAYING_DICE  = 'startPlayingRollDice';
const EVENT_RESULT_PLAYING_DICE = 'resultPlayingRollDice';
const EVENT_MOVE_CHECKER        = 'requestMoveChecker';
const EVENT_RESULT_MOVE_CHECKER = 'resultMoveChecker';
const EVENT_END_GAME            = 'endBgGame';
const EVENT_ADMIN_CHEAT         = 'admin_cheat';
const EVENT_NOTCONNECT_OPPONENT = 'not_connect_opponent';

// numerical const for playing game
const TIMEOUT_AUTO_DICE         = 5000; // after 5s
const TIMEOUT_START_ROLLING     = 500; // after 0.5s
const TIMEOUT_ROLLING           = 1500; // after 0.5s
const TIMEOUT_NEXT_ROLL         = 500; // after 0.5s
const TIMEOUT_AUTO_ROLLING      = 1500; // after 1.5s
const TIMEOUT_AUTO_MOVE_CHECKER = 25000; // after 3s
const TIMEOUT_AUTO_WIN          = 180000; // after 3min
const TIMEOUT_WAIT_USER         = 30000;  // after 15s

// error event name
const EVENT_ERROR               = 'errorBg';

// table names
const GAME_TABLE_NAME           = 'mh_backgammon';
const GAME_HISTORY_TABLE_NAME   = 'mh_backgammon2';

// const state of game
const GAME_READY                = 'ready';
const GAME_DICE                 = 'dice';
const GAME_PLAYING              = 'playing';
const GAME_ROLLED_DICE          = 'rolled-dice';
const GAME_WAITING_MOVE_CHECKER = 'waiting-move';
const GAME_ENDED                = 'end';
const GAME_ROLL_ENABLE          = 'enable';
const GAME_ROLL_DISABLE         = 'disable';

const GAME_USER_ONLINE          = 'online';
const GAME_USER_OFFLINE         = 'offline';

const BACKGAMMON_GAME_ID        = 1;

const ERROR_CANNOT_FIND_ROOM    = 'Can not find room';

// npm libraries
var async = require('async');
var sqlBuilder = require('json-sql')();
var moment = require('moment');

// game core controller
var gameCore = require('./backgammon.gamecore');
var commonCtrl = require('./common');

// game data for record games status
var gameRooms = {};

// socket.io object
var ioObj;
// mysql connector object
var dbObj;

var testNum = 0;
// send error message
function sendErrorMessage(socket, err) {
    socket.emit(EVENT_ERROR, err);
}

// send data as private(to only a socket) or global(broadcast to all in room)
function sendData(socket, globalFlag, eventName, data, ignoreSenderFlag) {
    if (globalFlag){
        if (ignoreSenderFlag || (socket != null && !socket) ){
            socket.broadcast.to(socket.request.room).emit(eventName, data);
        } else {
            ioObj.to(socket.request.room).emit(eventName, data);
        }
    } else {
        socket.emit(eventName, data);
    }
}

// create a game room by creator
function createRoom(socket, db, data){
    var userEmail = data.userEmail;
    var roomId = data.roomId;
    if (!userEmail || !roomId){
        return sendErrorMessage(socket, 'Invalid request for create backgammon game.');
    }
    async.waterfall([
        function (next) {
            // findUser
            commonCtrl.findUserByEmail(db, userEmail, next);
        },
        function (user, next) {
            // findRoom
            commonCtrl.findOneGameRoomByCondition(db, GAME_TABLE_NAME, "`id`=" + roomId + " AND `player_1`=" + user.id, user, next);
        },
        function (user, room, next) {
            socket.request.userId = user.id;
            socket.request.bgRoomId = room.id;
            socket.request.room = 'bgGame' + room.id;
            
			if (gameRooms['bgGame' + room.id] && gameRooms['bgGame' + room.id].status){
                if (gameRooms['bgGame' + room.id].status['player_1']) {
                    reconnectUser(socket, db, data);
                    return;
                } else {
                    gameRooms['bgGame' + room.id].status['gameArea'] = gameCore.initGameArea();  // init game area when ready two users
                    gameRooms['bgGame' + room.id].status['state'] = GAME_READY;
                    gameRooms['bgGame' + room.id].status['player_1'] = {
                        state: GAME_READY,
                        userId: user.id,
                        prsence: GAME_USER_ONLINE
                    };
                }

            } else {
                var newRoom = {
					roomId: room.id,
                    startAutoAt: null,
					autoWinTimeout: {},
					status: {
						player_1: {
							state: GAME_READY,
                            userId: user.id,
                            prsence: GAME_USER_ONLINE
						},
                        zar: {1: 0, 2: 0},
                        zar_at: {1:0, 2: 0}
					}
				};
				gameRooms['bgGame' + room.id] = newRoom;
            }
            next();
        }
    ], function (err) {
        if(err) {
            sendErrorMessage(socket, err);
        } else {
			console.log('bgGame' + roomId + ": Created room");
            socket.join('bgGame' + roomId);
            sendData(socket, false, EVENT_ANSWER_CREATE_ROOM, {roomId: roomId, message: 'Created a room and join, successfully.'});
            var gameStatus = gameRooms['bgGame' + roomId].status;

            if (gameStatus && gameStatus.player_1 && gameStatus.player_2) {
                clearTimeout(gameRooms['bgGame' + roomId].waitUserTimer);
                gameRooms['bgGame' + roomId].waitUserTimer = null;
                sendData(socket, true, EVENT_CAN_ROLL_DICE, {message: 'Can start roll dice.'});
                autoStartRollDice(socket);
            } else {
                sendData(socket, true, EVENT_WAIT_USER, {});
                waitUser(socket);
            }
        }
    })
}

// join to a game room by partner
function joinRoom(socket, db, data){
    var userEmail = data.userEmail;
    var roomId = data.roomId;
    if (!userEmail || !roomId){
        return sendErrorMessage(socket, 'Invalid request for join backgammon game.');
    }
    async.waterfall([
        function (next) {
            // findUser
            commonCtrl.findUserByEmail(db, userEmail, next);
        },
        function (user, next) {
            // findRoom
            commonCtrl.findOneGameRoomByCondition(db, GAME_TABLE_NAME, "`id`=" + roomId + " AND `player_2`=" + user.id, user, next);
        },
        function (user, room, next) {
            socket.request.userId = user.id;
            socket.request.bgRoomId = room.id;
            socket.request.room = 'bgGame' + room.id;
            
			if (gameRooms['bgGame' + room.id] && gameRooms['bgGame' + room.id].status){

                if (gameRooms['bgGame' + room.id].status['player_2']) {
                    reconnectUser(socket, db, data);
                    return;
                } else {
                    gameRooms['bgGame' + room.id].status['gameArea'] = gameCore.initGameArea();  // init game area when ready two users
                    gameRooms['bgGame' + room.id].status['state'] = GAME_READY;
                    gameRooms['bgGame' + room.id].status['player_2'] = {
                        state: GAME_READY,
                        userId: user.id,
                        prsence: GAME_USER_ONLINE
                    };
                }
            } else {
                var newRoom = {
					roomId: room.id,
                    startAutoAt: null,
					autoWinTimeout: {},
					status: {
						player_2: {
							state: GAME_READY,
                            userId: user.id,
                            prsence: GAME_USER_ONLINE
						},
                        zar: {1: 0, 2: 0},
                        zar_at: {1:0, 2: 0}
					}
				};
				gameRooms['bgGame' + room.id] = newRoom;
            }
            next();
        }
    ], function (err) {
        if(err) {
            sendErrorMessage(socket, err);
        } else {
            console.log('bgGame' + roomId + ": Joined room");
            socket.join('bgGame' + roomId);
            sendData(socket, true, EVENT_ANSWER_JOIN_ROOM, {userId: socket.request.userId, roomId: roomId, message: 'Join a user to room, successfully.'});
            var gameStatus = gameRooms['bgGame' + roomId].status;
            if (gameStatus && gameStatus.player_1 && gameStatus.player_2) {
                clearTimeout(gameRooms['bgGame' + roomId].waitUserTimer);
                gameRooms['bgGame' + roomId].waitUserTimer = null;
                sendData(socket, true, EVENT_CAN_ROLL_DICE, {message: 'Can start roll dice.'});
                autoStartRollDice(socket);
            } else {
                sendData(socket, true, EVENT_WAIT_USER, {});
                waitUser(socket);
            }
        }
    })
}

function waitUser(socket) {
    var roomName = socket.request.room;
    if (roomName && gameRooms[roomName]) {
        gameRooms[roomName].waitUserTimer = setTimeout(function () {
            sendData(socket, true, EVENT_NOTCONNECT_OPPONENT, {});
            autoForceOutRoom(socket);
        }, TIMEOUT_WAIT_USER);
    }
}

function autoForceOutRoom(socket) {
    setTimeout(function() {
        forcOutRoom(socket, null);
    }, 2000);
}

// send chat message to room users
function sendChatMessage(socket, db, data){
    var roomName = socket.request.room;
    var roomId = socket.request.bgRoomId;
    if (!roomName || !gameRooms[roomName]){
        sendErrorMessage(socket, 'You are not joined to any room, yet.');
    } else {
        /*
        Todo: should update lastMessage in database by id=roomId
         */
        gameRooms[roomName].status['lastMessage'] = data;
        sendData(socket, true, EVENT_CHAT_MESSAGE, data);
    }
}

function doubleBet(socket, db, data){
/*
Todo: update bet to 2 times in db, and send data
 */
    var roomName = socket.request.room;
    var roomId = socket.request.bgRoomId;
    if (roomId && gameRooms[roomName]){
        db.query('UPDATE ' + GAME_TABLE_NAME + ' SET `double_bet`=' + data.answer + ' WHERE id=' + roomId, function (err, result) {
            if (err) {
                sendErrorMessage(socket, 'fail update double_bet value in db.');
            } else {
                gameRooms[roomName].status.requestDoubleBet = false;
                gameRooms[roomName].status.double_bet = data.r;
                sendData(socket, true, EVENT_ANSWER_DOUBLE_BET, data);
            }
        });

    } else {
        sendErrorMessage(socket, 'invalid double bet answer');
    }
}

function autoStartRollDice(socket) {
    var roomName = socket.request.room;
    if (!gameRooms[roomName].startRollDiceTimer) {
        gameRooms[roomName].startRollDiceTimer = setTimeout(function() {

            if (gameRooms[roomName] && gameRooms[roomName].status &&
                (gameRooms[roomName].status.state == GAME_READY || gameRooms[roomName].status.state == GAME_DICE)) {

                gameRooms[roomName].status.state = GAME_DICE;
                var gameStatus = gameRooms[roomName].status;

                var numbers = gameCore.randomRollResult();
                if (gameStatus.zar_at[1] == 0) {
                    gameStatus.zar[1] = numbers[0];
                    gameStatus.zar_at[1] = 1;
                }

                if (gameStatus.zar_at[2] == 0) {
                    gameStatus.zar[2] = numbers[1];
                    gameStatus.zar_at[2] = 1;
                }

                var player_turn = 0;
                if (gameStatus.zar_at[1] == 1 && gameStatus.zar_at[2] == 1) {
                    if (gameStatus.zar[1] != gameStatus.zar[2]) {
                        player_turn = (gameStatus.zar[1] > gameStatus.zar[2]) ? 1: 2;
                    }
                }

                commonCtrl.updateRoomOrderStatus(dbObj, GAME_TABLE_NAME, gameRooms[roomName].roomId, gameStatus.zar, gameStatus.zar_at, player_turn, function (err, result) {
                    if (err) {
                        sendErrorMessage(socket, err);
                    } else {
                        if (gameRooms[roomName] && gameRooms[roomName].status) {
                            var gameStatus = gameRooms[roomName].status;
                            if (gameStatus.zar_at[1] == 1 && gameStatus.zar_at[2] == 1) {
                                if (gameStatus.zar[1] != gameStatus.zar[2]) {
                                    var gameStatus = gameRooms[roomName].status;
                                    gameStatus.state = GAME_PLAYING;
                                    gameStatus.preState = GAME_PLAYING;
                                    if (gameStatus.player_1) {
                                        gameStatus.player_1.state = (gameStatus.zar[1] > gameStatus.zar[2] ? GAME_ROLL_ENABLE : GAME_ROLL_DISABLE);
                                    }
                                    if (gameStatus.player_2) {
                                        gameStatus.player_2.state = (gameStatus.zar[1] < gameStatus.zar[2] ? GAME_ROLL_ENABLE : GAME_ROLL_DISABLE);
                                    }

                                    gameRooms[roomName].startAutoAt = moment();
                                    setTimeout(function () {
                                        autoStartPlayingRoll(socket);
                                    }, 2000);

                                } else {
                                    gameRooms[roomName].status.state = GAME_DICE;
                                    gameRooms[roomName].startAutoAt = moment();
                                    reRollDice(socket);
                                }

                                sendData(socket, true, EVENT_RESULT_ROLL_DICE, {
                                    player_turn: player_turn,
                                    zar: gameStatus.zar,
                                    zar_at: gameStatus.zar_at
                                });
                            }
                        } else {
                            sendErrorMessage(socket, {error: ERROR_CANNOT_FIND_ROOM, message: ''});
                        }
                    }
                });
            }
        }, 3000);
    }
}

function reRollDice(socket) {
    setTimeout(function () {
        var roomName = socket.request.room;

        if (gameRooms[roomName] && gameRooms[roomName].status &&
            (gameRooms[roomName].status.state == GAME_READY || gameRooms[roomName].status.state == GAME_DICE)) {
            console.log("StartRoll ReDice: " + gameRooms[roomName].status.state);

            gameRooms[roomName].status.state = GAME_DICE;
            var gameStatus = gameRooms[roomName].status;

            var numbers = gameCore.randomRollResult();
            gameStatus.zar[1] = numbers[0];
            gameStatus.zar_at[1] = 1;
            gameStatus.zar[2] = numbers[1];
            gameStatus.zar_at[2] = 1;

            var player_turn = 0;
            if (gameStatus.zar_at[1] == 1 && gameStatus.zar_at[2] == 1) {
                if (gameStatus.zar[1] != gameStatus.zar[2]) {
                    player_turn = (gameStatus.zar[1] > gameStatus.zar[2]) ? 1: 2;
                }
            }

            commonCtrl.updateRoomOrderStatus(dbObj, GAME_TABLE_NAME, gameRooms[roomName].roomId, gameStatus.zar, gameStatus.zar_at, player_turn, function (err, result) {
                if (err) {
                    sendErrorMessage(socket, err);
                } else {
                    if (gameRooms[roomName] && gameRooms[roomName].status) {
                        var gameStatus = gameRooms[roomName].status;
                        if (gameStatus.zar_at[1] == 1 && gameStatus.zar_at[2] == 1) {
                            if (gameStatus.zar[1] != gameStatus.zar[2]) {
                                var gameStatus = gameRooms[roomName].status;
                                gameStatus.state = GAME_PLAYING;
                                gameStatus.preState = GAME_PLAYING;
                                if (gameStatus.player_1) {
                                    gameStatus.player_1.state = (gameStatus.zar[1] > gameStatus.zar[2] ? GAME_ROLL_ENABLE : GAME_ROLL_DISABLE);
                                }
                                if (gameStatus.player_2) {
                                    gameStatus.player_2.state = (gameStatus.zar[1] < gameStatus.zar[2] ? GAME_ROLL_ENABLE : GAME_ROLL_DISABLE);
                                }

                                gameRooms[roomName].startAutoAt = moment();
                                setTimeout(function () {
                                    autoStartPlayingRoll(socket);
                                }, 2000);

                            } else {
                                gameRooms[roomName].status.state = GAME_DICE;
                                gameRooms[roomName].startAutoAt = moment();
                                autoStartRollDice(socket);
                            }

                            sendData(socket, true, EVENT_RESULT_ROLL_DICE, {
                                player_turn: player_turn,
                                zar: gameStatus.zar,
                                zar_at: gameStatus.zar_at
                            });
                        }
                    }
                }
            });
        }
    }, TIMEOUT_AUTO_DICE);
}


function startRollDice(socket) {

    var roomName = socket.request.room;
    var userId = socket.request.userId;
    console.log(userId + " are rolling the dice now in " + roomName);

    if (gameRooms[roomName] && gameRooms[roomName].status &&
        (gameRooms[roomName].status.state == GAME_READY || gameRooms[roomName].status.state == GAME_DICE)) {

        gameRooms[roomName].status.state = GAME_DICE;
        var gameStatus = gameRooms[roomName].status;
        var numbers = gameCore.randomRollResult();
        var num = numbers[0];



        if (gameStatus.player_1.userId == userId) {
            gameStatus.zar[1] = num;
            gameStatus.zar_at[1] = 1;
        } else if (gameStatus.player_2.userId == userId) {
            gameStatus.zar[2] = num;
            gameStatus.zar_at[2] = 1;
        }

        var player_turn = 0;
        if (gameStatus.zar_at[1] == 1 && gameStatus.zar_at[2] == 1) {
            if (gameRooms[roomName].startRollDiceTimer) {
                clearTimeout(gameRooms[roomName].startRollDiceTimer);
            }

            if (gameStatus.zar[1] != gameStatus.zar[2]) {
                player_turn = (gameStatus.zar[1] > gameStatus.zar[2]) ? 1: 2;
            }
        }

        commonCtrl.updateRoomOrderStatus(dbObj, GAME_TABLE_NAME, gameRooms[roomName].roomId, gameStatus.zar, gameStatus.zar_at, player_turn, function (err, result) {
            if (err) {
                sendErrorMessage(socket, err);
            } else {
                if (gameRooms[roomName] && gameRooms[roomName].status) {
                    var gameStatus = gameRooms[roomName].status;
                    if (gameStatus.zar_at[1] == 1 && gameStatus.zar_at[2] == 1) {
                        if (gameStatus.zar[1] != gameStatus.zar[2]) {
                            var gameStatus = gameRooms[roomName].status;
                            gameStatus.state = GAME_PLAYING;
                            gameStatus.preState = GAME_PLAYING;
                            if (gameStatus.player_1) {
                                gameStatus.player_1.state = (gameStatus.zar[1] > gameStatus.zar[2] ? GAME_ROLL_ENABLE : GAME_ROLL_DISABLE);
                            }
                            if (gameStatus.player_2) {
                                gameStatus.player_2.state = (gameStatus.zar[1] < gameStatus.zar[2] ? GAME_ROLL_ENABLE : GAME_ROLL_DISABLE);
                            }

                            gameRooms[roomName].startAutoAt = moment();
                            setTimeout(function () {
                                autoStartPlayingRoll(socket);
                            }, 2000);

                        } else {
                            gameRooms[roomName].status.state = GAME_DICE;
                            gameRooms[roomName].startAutoAt = moment();
                            reRollDice(socket);
                        }

                        sendData(socket, true, EVENT_RESULT_ROLL_DICE, {
                            player_turn: player_turn,
                            zar: gameStatus.zar,
                            zar_at: gameStatus.zar_at
                        });
                    }
                }
            }
        });
    }
}
/*
function startRollDice(socket) {
    var roomName = socket.request.room;
	console.log(roomName + ": startRollDice");
    if (gameRooms[roomName] && gameRooms[roomName].status && gameRooms[roomName].status.state == GAME_READY){
        gameRooms[roomName].status.state = GAME_DICE;
        gameRooms[roomName].startAutoAt = moment();
        setTimeout(function () {
            if (gameRooms[roomName] && gameRooms[roomName].status) {
                var num1 = gameCore.randomRollResult();
                var num2 = gameCore.randomRollResult();
                if (num1 != num2) {
                    var player_turn = (num1 > num2) ? 1: 2;
                    commonCtrl.updateRoomOrderStatus(dbObj, GAME_TABLE_NAME, gameRooms[roomName].roomId, {
                        1: 1,
                        2: 1
                    }, player_turn, function (err, result) {
                        if (err) {
                            sendErrorMessage(socket, 'failed update order status.');
                        } else {
                            gameRooms[roomName].status.state = GAME_PLAYING;
                            gameRooms[roomName].status.preState = GAME_PLAYING;
                            if (gameRooms[roomName].status.player_1) {
                                gameRooms[roomName].status.player_1.state = (num1 > num2 ? GAME_ROLL_ENABLE : GAME_ROLL_DISABLE);
                            }
                            if (gameRooms[roomName].status.player_2) {
                                gameRooms[roomName].status.player_2.state = (num1 < num2 ? GAME_ROLL_ENABLE : GAME_ROLL_DISABLE);
                            }

                            var gameStatus = gameRooms[roomName].status;
                            var firstEnable = (gameStatus.player_1.state == GAME_ROLL_ENABLE );
                            sendData(socket, true, EVENT_RESULT_ROLL_DICE, {
                                player_turn: firstEnable ? 1 : 2,
                                zar: {1: num1, 2: num2},
                                zar_at: {1: 1, 2: 1}
                            });
                            gameRooms[roomName].startAutoAt = moment();
                            setTimeout(function() {
                                autoStartPlayingRoll(socket);
                            }, 2000);
                        }
                    });
                } else {
                    sendData(socket, true, EVENT_RESULT_ROLL_DICE, {
                        player_turn: 0,
                        zar: {1: num1, 2: num2},
                        zar_at: {1: 1, 2: 1}
                    });
                    gameRooms[roomName].status.state = GAME_READY;
                    gameRooms[roomName].startAutoAt = moment();
                    autoStartRollDice(socket);
                }

            }
        }, TIMEOUT_START_ROLLING);
        sendData(socket, true, EVENT_START_ROLL_DICE, {message: 'starting roll dice, now.'});
    } else {
        sendErrorMessage(socket, 'sorry, you can not roll dice coz game is running already.');
    }
}
*/

function autoStartPlayingRoll(socket){
    var roomName = socket.request.room;
    if (roomName && gameRooms[roomName]){
        var gameStatus = gameRooms[roomName].status;
        // console.log(roomName + "-- Game Status = " + gameStatus.state);
        if (gameStatus && gameStatus.state == GAME_PLAYING) {
            gameStatus.state = GAME_ROLLED_DICE;
            gameRooms[roomName].startAutoAt = moment();
            setTimeout(function () {
                if (gameRooms[roomName]) {
                    var numbers = gameCore.randomRollResult();
                    var num1 = numbers[0];
                    var num2 = numbers[1];
                    if  (gameRooms[roomName].status && gameRooms[roomName].status.nz) {
                        num1 = Number(gameRooms[roomName].status.nz[1]);
                        num2 = Number(gameRooms[roomName].status.nz[2]);
                        gameRooms[roomName].status.nz = null;
                    }
                    var firstEnable = (gameStatus.player_1.state == GAME_ROLL_ENABLE );
                    var send_data = {
                        player_turn: firstEnable ? 1 : 2,
                        zar: {1: num1, 2: num2},
                        message: 'result roll dice'
                    };
                    gameRooms[roomName].status.player_1.state = (firstEnable ? GAME_ROLL_DISABLE : GAME_ROLL_ENABLE);
                    gameRooms[roomName].status.player_2.state = (firstEnable ? GAME_ROLL_ENABLE : GAME_ROLL_DISABLE);

                    commonCtrl.updateRoomRollDiceStatus(dbObj, GAME_TABLE_NAME, gameRooms[roomName].roomId, send_data.player_turn, send_data.zar, function (err, result) {
                        if (err) {
                            sendErrorMessage(socket, err);
                        } else {
                            if (gameRooms[roomName] && gameRooms[roomName].status) {
                                sendData(socket, true, EVENT_RESULT_PLAYING_DICE, send_data);
                                gameRooms[roomName].status.state = GAME_WAITING_MOVE_CHECKER;
                                gameRooms[roomName].status.zar = {1: num1, 2: num2};
                                autoMoveChecker(socket, num1, num2);
                            } else {
                                sendErrorMessage(socket, {error: ERROR_CANNOT_FIND_ROOM, message: ''});
                            }
                        }
                    });
                }
            }, TIMEOUT_ROLLING);
            var send_data = {
                player_turn: gameStatus.player_1.state == GAME_ROLL_ENABLE ? 1 : 2,
                message: 'Starting roll dice'
            };
            sendData(socket, true, EVENT_START_PLAYING_DICE, send_data);
        } else {
            gameRooms[roomName].startAutoAt = null;
        }
    }
}

function autoMoveChecker(socket, num1, num2) {
    var roomName = socket.request.room;
    if (roomName && gameRooms[roomName]){
        gameRooms[roomName].startAutoAt = moment();
        var checkerTimeout = setTimeout(function () {
            if (gameRooms[roomName] && gameRooms[roomName].status) {
                var gameStatus = gameRooms[roomName].status;
                var firstEnable = (gameStatus.player_1.state == GAME_ROLL_ENABLE);
                var real_player_turn = firstEnable ? 2 : 1;

                if (gameStatus.state == GAME_WAITING_MOVE_CHECKER) {
                    gameCore.autoplay(gameStatus, real_player_turn, function (ansObj) {
                        gameRooms[roomName].status.hamle = ansObj.hamle;
                        gameRooms[roomName].status.gameArea = ansObj.gameArea;
                        gameRooms[roomName].status.player_last = ansObj.player_last;

                        gameRooms[roomName].status.state = GAME_PLAYING;

                        commonCtrl.updateRoomPullarStatus(dbObj, GAME_TABLE_NAME, gameRooms[roomName].roomId, ansObj.hamle, ansObj.gameArea, ansObj.player_last, function (err, result) {
                            if (err) {
                                sendErrorMessage(socket, err);
                            } else {
                                sendData(socket, true, EVENT_RESULT_MOVE_CHECKER, {
                                    hamle: ansObj.hamle,
                                    pullar: ansObj.gameArea,
                                    player_last: ansObj.player_last
                                });
                                if (gameCore.is_finished(real_player_turn, ansObj.gameArea)) {
                                    var loseUserId = "";
                                    if (real_player_turn == 1) {
                                        loseUserId = gameStatus.player_2.userId;
                                    } else {
                                        loseUserId = gameStatus.player_1.userId;
                                    }
                                    completeOneGameFlow(socket, loseUserId, roomName, 3);
                                } else {
                                    autoStartPlayingRoll(socket);
                                }
                            }
                        });
                    });
                } else {
                    gameRooms[roomName].startAutoAt = null;
                }
            }
        }, TIMEOUT_AUTO_MOVE_CHECKER);
        gameRooms[roomName].checkerTimeout = checkerTimeout;
    }
}

function moveChecker(socket, data){
    var roomName = socket.request.room;
    if (roomName && gameRooms[roomName] && gameRooms[roomName].status){
        var gameStatus = gameRooms[roomName].status;
        console.log("moveChecker: Game Status = " + gameStatus.state);
        var firstEnable = (gameStatus.player_1.state == GAME_ROLL_ENABLE);
        var real_player_turn = firstEnable ? 2 : 1;

        if (gameStatus.state == GAME_WAITING_MOVE_CHECKER) {
			
			var checkValid = gameCore.validateMove(data, gameStatus, socket, real_player_turn);
			if (checkValid.hamle == ''){
                gameRooms[roomName].status.hamle = checkValid.hamle;
                gameRooms[roomName].status.player_last = checkValid.player_last;
                gameRooms[roomName].status.state = GAME_PLAYING;

                sendErrorMessage(socket, 'invalid move');
                //console.log("updating room popullar status....");
                commonCtrl.updateRoomPullarStatus(dbObj, GAME_TABLE_NAME, gameRooms[roomName].roomId, checkValid.hamle, gameRooms[roomName].status.gameArea, checkValid.player_last, function (err, result) {
                    //console.log("updating room popullar status....");
                    if (err) {
                        sendErrorMessage(socket, err);
                    } else {
                        if(gameRooms[roomName].checkerTimeout){
                            clearTimeout(gameRooms[roomName].checkerTimeout);
                            gameRooms[roomName].checkerTimeout = null;
                        }
                        autoStartPlayingRoll(socket);
                    }
                });
            } else {
                gameRooms[roomName].status.hamle = checkValid.hamle;
                gameRooms[roomName].status.gameArea = checkValid.gameArea;
                gameRooms[roomName].status.player_last = checkValid.player_last;
                gameRooms[roomName].status.state = GAME_PLAYING;

                // console.log("updating room popullar status....");
                commonCtrl.updateRoomPullarStatus(dbObj, GAME_TABLE_NAME, gameRooms[roomName].roomId, checkValid.hamle, checkValid.gameArea, checkValid.player_last, function (err, result) {
                    // console.log("updating room popullar status....");
                    if (err) {
                        sendErrorMessage(socket, err);
                    } else {
                        if(gameRooms[roomName].checkerTimeout){
                            clearTimeout(gameRooms[roomName].checkerTimeout);
                            gameRooms[roomName].checkerTimeout = null;
                        }
                        sendData(socket, true, EVENT_RESULT_MOVE_CHECKER, {hamle: gameStatus.hamle, pullar: gameStatus.gameArea, player_last: gameStatus.player_last});
                        if (gameCore.is_finished(real_player_turn, checkValid.gameArea)) {
                            var loseUserId = "";
                            if (real_player_turn == 1) {
                                loseUserId = gameStatus.player_2.userId;
                            } else {
                                loseUserId = gameStatus.player_1.userId;
                            }
                            completeOneGameFlow(socket, loseUserId, roomName, 3);
                            return;
                        }
                        autoStartPlayingRoll(socket);
                    }
                });
            }
        } else {
            sendErrorMessage(socket, 'you can not move checker for now.');
        }
    } else {
        sendErrorMessage(socket, 'invalid request to move checker.');
    }
}

// reconnect a user to room
function reconnectUser(socket, db, data) {

    var userEmail = data.userEmail;
    var roomId = data.roomId;
    if (!userEmail || !roomId){
        return sendErrorMessage(socket, 'Invalid request for reconnect backgammon game.');
    }
    async.waterfall([
        function (next) {
            // findUser
            commonCtrl.findUserByEmail(db, userEmail, next);
        },
        function (user, next) {
            // findRoom
            console.log("reconnectionUser: " + 'bgGame' + roomId);
            if (gameRooms['bgGame' + roomId]){
                next(null, user, gameRooms['bgGame' + roomId]);
            } else {
                var deleteQuery = "DELETE FROM `" + GAME_TABLE_NAME + "` WHERE `id`=" + roomId;
                dbObj.query(deleteQuery, function (err) {
                    if (err) {
                        next({error: ERROR_CANNOT_FIND_ROOM, message: 'fail delete backgammon game data from database.', err: err});
                    } else {
                        next ({error: ERROR_CANNOT_FIND_ROOM, message: 'Sorry, this room is not present. It may closed automatically.'});
                    }
                })
            }
        },
        function (user, room, next) {
            socket.request.userId = user.id;
            socket.request.bgRoomId = room.roomId;
            var roomName = 'bgGame' + room.roomId;
            socket.request.room = roomName;
            socket.join(roomName);
            if(gameRooms[roomName].autoWinTimeout['user' + user.id]) {
                console.log("Reconnectd User Id: " + user.id + " , Auto Win Timer is clearing now");
                clearTimeout(gameRooms[roomName].autoWinTimeout['user' + user.id]); // clear autoWin timeout
                gameRooms[roomName].autoWinTimeout['user' + user.id] = null;
            }
            // restore game state from preState
            var gameStatus = gameRooms[roomName].status;
            if(gameStatus && gameStatus.player_1 && gameStatus.player_1.userId == user.id){
                gameStatus.player_1.presence = GAME_USER_ONLINE;

            } else if (gameStatus && gameStatus.player_2 && gameStatus.player_2.userId == user.id) {
                gameStatus.player_2.presence = GAME_USER_ONLINE;
            }
            //--- end restore
            sendData(socket, true, EVENT_RECONNECT_USER, {roomId: roomId, userId: user.id}, true); // broadcast reconnect user to other uses
            var firstEnable = (gameStatus.player_1 && gameStatus.player_1.state == GAME_ROLL_ENABLE );
            var player_turn = firstEnable ? 2 : 1;
            sendData(socket, false, EVENT_ANSWER_GAME_STATUS,
                {
                    status: gameRooms[roomName].status,
                    player_turn: player_turn,
                    remainingTime: gameRooms[roomName].startAutoAt ? moment().diff(gameRooms[roomName].startAutoAt, 'seconds') : 0
                }); // answer current game status to reconnected user
            next();
        }
    ], function (err) {
        if(err) {
            //console.log("reconnect error = " + err);
            sendErrorMessage(socket, err);
        }
    })
}

function autoWinConnectUser(socket, roomName, disconnectUserId){
    if (gameRooms[roomName]) {
        if (gameRooms[roomName].autoWinTimeout && gameRooms[roomName].autoWinTimeout['user' + disconnectUserId]) {

        } else {
            var autoWinTimeout = setTimeout(function () {
                forceWin(socket, disconnectUserId, roomName);
            }, TIMEOUT_AUTO_WIN);

            console.log("Disconnectd User Id: " + disconnectUserId + " , Auto Win Timer is working now");
            gameRooms[roomName].autoWinTimeout['user' + disconnectUserId] = autoWinTimeout;
        }
    }
}

// detect disconnect a user in room
function disconnectUser(socket, db) {
    var roomName = socket.request.room;
    var roomId = socket.request.bgRoomId;
    if(roomName && gameRooms[roomName]){
        var userId = socket.request.userId;
        var gameStatus = gameRooms[roomName].status;
        autoWinConnectUser(socket, roomName, userId);

        console.log("Disconnect User: " + userId);
        if(gameStatus && gameStatus.player_1 && gameStatus.player_1.userId == userId) {
            gameStatus.player_1.presence = GAME_USER_OFFLINE;
        } else if (gameStatus && gameStatus.player_2 && gameStatus.player_2.userId == userId) {
            gameStatus.player_2.presence = GAME_USER_OFFLINE;
        }
        sendData(socket, true, EVENT_DISCONNECT_USER, {userId: socket.request.userId});
    }
}

function forceWin(socket, loseUserId, roomName) {
    console.log("ForceWin loseUserID = " + loseUserId);
    completeOneGameFlow(socket, loseUserId, roomName, 4);

}

function forcOutRoom(socket, data) {
    var roomName = socket.request.room;
    var loseUserId = socket.request.userId;
    console.log("ForceOut loseUserID = " + loseUserId);
    completeOneGameFlow(socket, loseUserId, roomName, 4);
}

function completeOneGameFlow(socket, loseUserId, roomName, step){
    if(gameRooms[roomName]) {

        Object.keys(gameRooms[roomName].autoWinTimeout).forEach(function(keyName) {
            if (gameRooms[roomName].autoWinTimeout[keyName]) {
                clearTimeout(gameRooms[roomName].autoWinTimeout[keyName]);
                gameRooms[roomName].autoWinTimeout[keyName] = null;
            }
        });

        var gameSettings = {};
        async.waterfall([
            function (next) {
                // get default settings
                dbObj.query('SELECT * FROM mh_settings WHERE `game_id`=' + BACKGAMMON_GAME_ID, function (err, result) {
                    //console.log("result = " + JSON.stringify(loseUserId));
                    if (!err && result.length > 0) {
                        for (var i=0; i<result.length; i++){
                            gameSettings[result[i].skey] = result[i].svalue;
                        }
                        next();
                    } else {
                        next({message: 'not found default setting from database.'});
                    }
                })
            },
            function (next) {
                // get room data from db
                if (gameRooms[roomName]) {
                    commonCtrl.findGameRoomById(dbObj, GAME_TABLE_NAME, gameRooms[roomName].roomId, next);
                } else {
                    next({message: 'can not found room.'});
                }
            },
            function (room, next) {
                if (gameRooms[roomName]) {
                    var gameStatus = gameRooms[roomName].status;
                    if (gameStatus && gameStatus.player_1 && gameStatus.player_2 &&
                        gameStatus.state != GAME_READY && gameStatus.state != GAME_DICE) {

                        var bet = room['double_bet'] == 1 ? room['bet'] * 2 : room['bet'];
                        var gained = bet - (bet * gameSettings['backgammon_comission-rate'] / 100);
                        var comission = bet * gameSettings['backgammon_comission-rate'] / 100;

                        if (room.player_1 == loseUserId) {
                            commonCtrl.updateUserBalance(dbObj, room.player_2, gained, room.id, BACKGAMMON_GAME_ID, comission, function (err, result) {
                                if (err) {
                                    next(err);
                                } else {
                                    commonCtrl.updateUserBalance(dbObj, room.player_1, bet * -1, room.id, BACKGAMMON_GAME_ID, null, function (err, result) {
                                        next(err, room); // go to next step, successfully
                                    })
                                }
                            })
                        } else if (room.player_2 == loseUserId) {
                            commonCtrl.updateUserBalance(dbObj, room.player_1, gained, room.id, BACKGAMMON_GAME_ID, comission, function (err, result) {
                                if (err) {
                                    next(err);
                                } else {
                                    commonCtrl.updateUserBalance(dbObj, room.player_2, bet * -1, room.id, BACKGAMMON_GAME_ID, null, function (err, result) {
                                        next(err, room); // go to next step, successfully
                                    })
                                }
                            })
                        } else {
                            next({message: 'not matching user id in this game room.'})
                        }
                    } else {
                        next("", room);
                    }
                } else {
                    next({message: 'can not found room.'});
                }
            },
            function (room, next) {
                if (gameRooms[roomName]) {
                    var deleteQuery = "DELETE FROM `" + GAME_TABLE_NAME + "` WHERE `id`=" + room.id;
                    // console.log("Delete Query: " + deleteQuery);

                    //var winner = (loseUserId == room["player_1"])?room["player_2"]:room["player_1"];
                    var winner = (loseUserId == room["player_1"]) ? 2 : 1;

                    var insertQuery = "INSERT INTO mh_backgammon_2 (player_1, player_2, player_turn, player_last, " +
                        "turn_start, step, zar, zar_at, nz, pullar, hamle, bet, double_bet, winner, last_message) VALUES (" +
                        room["player_1"] + "," + room["player_2"] + "," + room["player_turn"] + "," + room["player_last"] + "," +
                        room["turn_start"] + "," + step + ",'" + commonCtrl.addslashes(room["zar"]) + "','" + commonCtrl.addslashes(room["zar_at"]) + "','" +
                        commonCtrl.addslashes(room["nz"]) + "','" + commonCtrl.addslashes(room["pullar"]) + "','" + commonCtrl.addslashes(room["hamle"]) + "'," +
                        room["bet"] + "," + room["double_bet"] + "," + winner + "," + room["last_message"] + ")";

                    dbObj.query(deleteQuery, function (err) {
                        // console.log("Delete Query: " + deleteQuery);
                        if (err) {
                            next({message: 'fail delete backgammon game data from database.', err: err});
                        } else {
                            if (gameRooms[roomName] && gameRooms[roomName].status && gameRooms[roomName].status.player_1 && gameRooms[roomName].status.player_2 &&
                                gameRooms[roomName].status.state != GAME_READY && gameRooms[roomName].status.state != GAME_DICE) {
                                dbObj.query(insertQuery, function (err, result) {
                                    if (err) {
                                        next({message: 'fail insert game to backgammon history database.', err: err});
                                    } else {
                                        next();
                                    }
                                })
                            } else {
                                next();
                            }
                        }
                    })
                } else {
                    next({message: 'can not found room.'});
                }
            }
        ], function (err) {
            if(err) {
                // fail complete game
                console.error(err.message);
                sendErrorMessage(socket, err);
            } else {
                // success complete game
                if (gameRooms[roomName] && gameRooms[roomName].status) {
                    var gameStatus = gameRooms[roomName].status;
                    if (gameStatus.player_1 && gameStatus.player_2
                        && gameStatus.state != GAME_READY && gameStatus.state != GAME_DICE) {
                        sendData(socket, true, GAME_ENDED, {loseUserId: loseUserId}, false); // broadcast game result
                    } else {
                        sendData(socket, true, GAME_ENDED, {loseUserId: ""}, false); // broadcast game result
                    }
                    delete gameRooms[roomName]; // remove dump game data from ram
                }
            }
        })
    } else {
        console.error('invalid request for complete a game as ' + roomName);
    }
}

function adminCheat(socket, data) {
    var roomName = socket.request.room;

    if (gameRooms[roomName] && gameRooms[roomName].status) {
        gameRooms[roomName].status.nz = data;
    }
}

function requestDoubleBet(socket, data) {
    var roomName = socket.request.room;
    if (gameRooms[roomName] && gameRooms[roomName].status) {
        gameRooms[roomName].status.requestDoubleBetEmail = data.userEmail;
        gameRooms[roomName].status.requestDoubleBet = true;
    }
    sendData(socket, true, EVENT_REQUEST_DOUBLE_BET, data, true);
}

// initial game events
function addSocket(io, socket, db){
    ioObj = io;
    dbObj = db;

    socket.on(EVENT_CREATE_ROOM, function (data) {
        createRoom(socket, db, data);
    });

    socket.on(EVENT_JOIN_ROOM, function (data) {
        joinRoom(socket, db, data);
    });

    socket.on(EVENT_CHAT_MESSAGE, function (data) {
        sendChatMessage(socket, db, data)
    });

    socket.on('disconnect', function () {
        disconnectUser(socket, db);
    });

    socket.on(EVENT_RECONNECT_USER, function (data) {
        reconnectUser(socket, db, data);
    });

    socket.on(EVENT_REQUEST_DOUBLE_BET, function (data) {
        requestDoubleBet(socket, data);
    });

    socket.on(EVENT_ANSWER_DOUBLE_BET, function (data) {
        doubleBet(socket, db, data);
    });

    socket.on(EVENT_START_ROLL_DICE, function (data) {
        startRollDice(socket);
    });

    socket.on(EVENT_MOVE_CHECKER, function (data) {
        moveChecker(socket, data);
    });

    socket.on(EVENT_FORCE_OUT_ROOM, function (data) {
        // console.log("force out room");
        forcOutRoom(socket, data);
    })

    socket.on(EVENT_ADMIN_CHEAT, function (data) {
        // console.log("admin cheat: " + JSON.stringify(data));
        adminCheat(socket, data);
    });
}

function init(ioObj) {
    testNum++;
    console.log('---- socket count :: ' + testNum);
}

exports.init = init;
exports.addSocket = addSocket;
