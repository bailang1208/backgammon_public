var mongoose = require('mongoose');

// db Models
var UserModel = mongoose.model('AppUser');
var UserBallanceHistory = mongoose.model('UserBalanceHistory');
var BackgammonModel = mongoose.model('Backgammon');

function getUserId(socket) {
    var userId = JSON.stringify(socket.request.user._id);
    userId = userId.replace(/"/g, '');
    return userId;
}

function save_game_data (redis, gameRoom) {

}

function load_game_data (redis, roomName, cb) {
    redis.get(roomName, function (err, data) {
        if(err) {
            next({errCode: 1, message: 'can not find the living game room.'});
        }
        else {
            next(null, data);
        }
    });
}

function change_user_online_status(user, status, cb) {
    UserModel.findOneAndUpdate({_id: user._id}, {onlineStatus: status})
        .then(function (result) {
            get_online_users(function (count) {
                cb(null, count);
            });
            return null;
        })
        .catch(function (err) {
            cb(err);
        })
}

function get_online_users(cb){
    UserModel.count({onlineStatus: true})
        .then(function (count) {
            return cb(count || 0);
        })
        .catch(function (err) {
            cb(0);
        })
}

function findUserById(userId, cb){
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

function update_room_order_status(room_id, zar, zar_at, player_turn, cb) {
    var query = {_id: room_id};
    var update_values = {zar: zar, zar_at: zar_at, player_turn: player_turn};
    BackgammonModel.update(query, update_values)
        .then(function (res) {
            cb(null, {message: 'done successfully.', result: res});
        })
        .catch(function (err) {
            console.log(err);
            cb({message: 'fail update order status', err: err});
        });
}

function updateRoomRollDiceStatus(roomId, player_turn, zar, cb) {
    var query = {_id: roomId};
    var update_values = {zar: zar, player_turn: player_turn};
    BackgammonModel.update(query, update_values)
        .then(function (res) {
            cb(null, {message: 'done successfully.', result: res});
        })
        .catch(function (err) {
            console.log(err);
            cb({message: 'fail update room roll dice status', err: err});
        });
}

function updateRoomPullarStatus(roomId, hamle, pullar, player_last, cb) {
    var query = {_id: roomId};
    var update_values = {hamle: JSON.stringify(hamle), pullar: JSON.stringify(pullar), player_last: player_last};
    BackgammonModel.update(query, update_values)
        .then(function (res) {
            cb(null, {message: 'done successfully.', result: res});
        })
        .catch(function (err) {
            console.log(err);
            cb({message: 'fail update room pullar status', err: err});
        });
}

function updateUserBalance(userId, amount, roomId, gameId, comission, cb){
    UserModel.findOne({_id: userId})
    .then(function (user) {
        var query = {_id: userId};
        var update_values = {walletAmount: user.walletAmount + amount};
        UserModel.update(query, update_values)
        .then(function (res) {
            var ballanceData = {
                amount: amount,
                balance_after: user.walletAmount,
                comission: comission,
                roomId: roomId,
                game_id: gameId,
                user_id: userId
            }
        
            UserBallanceHistory.create(ballanceData)
                .then(function (result) {
                    cb(null, {message: 'done successfully.', result: res});
                })
                .catch(function (err) {
                    cb({message: 'fail insert new balance history', err: err});
                })
        })
        .catch(function (err) {
            cb({message: 'fail update user info', err: err});
        })
    })
    .catch(function (err) {
        cb({message: 'can not found user.', err: err});
    });
}

// send to all users
function send_common_message(io, eventName, data){
    io.emit(eventName, data);
}

// send to all users without self
function broadcast_common_message(socket, eventName, data){
    socket.broadcast.emit(eventName, data);
}

// send to a user
function send_direct_message(socket, eventName, data){
    socket.emit(eventName, data);
}

// send to all users in room
function send_room_message(io, room, eventName, data){
    io.in(room).emit(eventName, data);
}

// send to all users in room without self
function broadcast_room_message(socket, room, eventName, data){
    socket.broadcast.to(room).emit(eventName, data);
}

// detect wallet amount than request amount
function detect_user_wallet(userId, amount, cb){
    AppUser.findById(userId)
        .then(function (user) {
            if (user){
                cb(null, user.walletAmount >= amount)
            } else {
                cb({message: 'can not find user'});
            }
        })
        .catch(function (err) {
            cb(err);
        })
}

exports.send_common_message = send_common_message;
exports.send_direct_message = send_direct_message;
exports.send_room_message = send_room_message;
exports.broadcast_common_message = broadcast_common_message;
exports.broadcast_room_message = broadcast_room_message;

exports.change_user_online_status = change_user_online_status;
exports.get_online_users = get_online_users;

exports.detect_user_wallet = detect_user_wallet;

exports.update_room_order_status = update_room_order_status;
exports.updateRoomRollDiceStatus = updateRoomRollDiceStatus;
exports.updateRoomPullarStatus = updateRoomPullarStatus;
exports.findUserById = findUserById;
exports.updateUserBalance = updateUserBalance;
exports.save_game_data = save_game_data;
exports.load_game_data = load_game_data;
exports.getUserId = getUserId;
