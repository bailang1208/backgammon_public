// npm libraries
const mongoose = require('mongoose');

// db Models
var BackgammonModel = mongoose.model('Backgammon');
var BackgammonHistoryModel = mongoose.model('BackgammonHistory');
var UserModel = mongoose.model('AppUser');

const EVENT_CHANGE_USRES = 'change_users';

const USERS_TABLE                   = 'mh_users';
const USER_BALANCE_HISTORY_TABLE    = 'mh_user_balance_history';

var async = require('async');

function sendOnlineUsers(io, connections){
    io.emit(EVENT_CHANGE_USRES, {userCount: connections});
}

function findUserById(db, userId, cb){
    UserModel.findOne({
        _id: userId
    }).exec(function (err, user) {
        if (err || !user) {
            cb({message: 'can not found user.', err: err});
        } else if (!user) {
            cb(null, user);
        }
    });
}

function findUserByEmail(db, email, cb){
    UserModel.findOne({
      email: email
    }).exec(function (err, user) {
      if (err || !user) {
          cb({message: 'can not found user.', err: err});
      } else if (!user) {
          cb(null, user);
      }
    });
}

function updateUserBalance(db, userId, amount, roomId, gameId, comission, cb){
    findUserById(db, userId, function(err, user){
        if (!err && user){
            var updateQuery = "UPDATE `" + USERS_TABLE + "` SET `balance`=" + (user.balance + amount) + " WHERE `id`=" + userId;
            var insertQuery = "INSERT INTO `" + USER_BALANCE_HISTORY_TABLE + "` SET `amount`=" + amount +
                    ", `balance_after`=" + (user.balance + amount) + (comission ? (", `comission`=" + comission) : "") +
                    ", `room_id`=" + roomId + ", `game_id`=" + gameId + ", `user_id`=" + userId;
            db.query(updateQuery, function(err, result){
                if (err){
                    cb({message: 'fail update user info', err: err});
                } else {
                    db.query(insertQuery, function (err, result) {
                        if(err){
                            cb({message: 'fail insert new balance history', err: err});
                        } else {
                            cb(null, {message: 'done successfully.', result: result});
                        }
                    })
                }
            })
        } else {
            cb({message: 'can not found user.', err: err});
        }
    })
}

function updateRoomOrderStatus(db, roomTableName, roomId, zar, zar_at, player_turn, cb) {
    db.query("SELECT * FROM `" + roomTableName + "` WHERE `id`=" + roomId, function (err, rooms) {
        if (err || !rooms[0]){
            cb({message: 'can not found room.', err: err});
        } else {
            var updateQuery = "UPDATE `" + roomTableName + "` SET player_turn = " + player_turn + ", step = 1, zar='" + addslashes(JSON.stringify(zar)) + "', zar_at='" + addslashes(JSON.stringify(zar_at)) + "' WHERE `id`=" + roomId;
            console.log(updateQuery);
            db.query(updateQuery, function(err, result){
                if (err){
                    console.log(err);
                    cb({message: 'fail update order status', err: err});
                } else {
                    cb(null, {message: 'done successfully.', result: result});
                }
            })
        }
    })
}

function updateRoomRollDiceStatus(db, roomTableName, roomId, player_turn, zar, cb) {
    db.query("SELECT * FROM `" + roomTableName + "` WHERE `id`=" + roomId, function (err, rooms) {
        if (err || !rooms[0]){
            cb({message: 'can not found room.', err: err});
        } else {
            var updateQuery = "UPDATE `" + roomTableName + "` SET step=2, `player_turn`=" + player_turn + ", zar='" + addslashes(JSON.stringify(zar)) + "' WHERE `id`=" + roomId;
            db.query(updateQuery, function(err, result){
                if (err){
                    cb({message: 'fail update room roll dice status', err: err});
                } else {
                    cb(null, {message: 'done successfully.', result: result});
                }
            })
        }
    })
}

function updateRoomPullarStatus(db, roomTableName, roomId, hamle, pullar, player_last, cb) {
    db.query("SELECT * FROM `" + roomTableName + "` WHERE `id`=" + roomId, function (err, rooms) {
        if (err || !rooms[0]){
            cb({message: 'can not found room.', err: err});
        } else {
            var updateQuery = "UPDATE `" + roomTableName + "` SET `hamle`='" + addslashes(JSON.stringify(hamle)) +
            "', pullar='" + addslashes(JSON.stringify(pullar)) + "', player_last=" + player_last + " WHERE `id`=" + roomId;

            db.query(updateQuery, function(err, result){
                if (err){
                    cb({message: 'fail update room pullar status', err: err});
                } else {
                    cb(null, {message: 'done successfully.', result: result});
                }
            })
        }
    })
}

function findGameRoomById(db, roomTableName, roomId, cb) {
    db.query("SELECT * FROM `" + roomTableName + "` WHERE `id`=" + roomId, function (err, rooms) {
        if (err || !rooms[0]){
            cb({message: 'can not found room.', err: err});
        } else {
            cb(null, rooms[0]);
        }
    })
}

function findGameRoomByCondition(db, roomTableName, whereQuery, cb) {
    db.query("SELECT * FROM `" + roomTableName + "` WHERE " + whereQuery, function (err, rooms) {
        if (err || !rooms){
            cb({message: 'can not found room.', err: err});
        } else {
            cb(null, rooms);
        }
    })
}

function findOneGameRoomByCondition(db, roomTableName, whereQuery, user, cb) {
    db.query("SELECT * FROM `" + roomTableName + "` WHERE " + whereQuery + " limit 1", function (err, rooms) {
        if (err || !rooms[0]){
            cb({message: 'can not found room.', err: err});
        } else {
            cb(null, user, rooms[0]);
        }
    })
}

function getDefaultSettings(db, cb) {
    db.query("SELECT * FROM `mh_settings`", function(err, settings){
        cb(err, settings);
    })
}

function addslashes( str ) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

exports.sendOnlineUsers = sendOnlineUsers;

exports.findUserById = findUserById;
exports.findUserByEmail = findUserByEmail;
exports.updateUserBalance = updateUserBalance;
exports.findGameRoomById = findGameRoomById;
exports.findGameRoomsByCondition = findGameRoomByCondition;
exports.findOneGameRoomByCondition = findOneGameRoomByCondition;
exports.getDefaultSettings = getDefaultSettings;
exports.addslashes = addslashes;
exports.updateRoomOrderStatus = updateRoomOrderStatus;
exports.updateRoomRollDiceStatus = updateRoomRollDiceStatus;
exports.updateRoomPullarStatus = updateRoomPullarStatus;
