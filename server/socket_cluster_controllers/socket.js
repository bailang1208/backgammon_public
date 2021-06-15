var redis = require('redis');
/*
 socket modules ==========================================================
 */
var socketUsers = [];

function getOnlineUsers(redisClient, cb){
    redisClient.keys('onlineUsers*', function (err, keys) {
        var totalUsers = 0;
        var getUserNum = function (index) {
            if (index >= keys.length){
                console.log('-------- all users -----' + totalUsers);
                cb(totalUsers);
                return;
            } else {
                redisClient.getAsync(keys[index]).then(function (res) {
                    totalUsers += (res/1);
                    getUserNum(index + 1);
                })
            }
        };
        if (keys && keys.length>0){
            getUserNum(0);
        } else {
            cb(0);
        }
    });
}

exports.init = function (app, io, clusterId, redisClient) {
    var roomId = "testRoom" + (clusterId/1 % 2);

    io.on('connection', function(socket) {

        redisClient.incr('onlineUsers' + clusterId, redis.print);

        getOnlineUsers(redisClient, function (userNum) {
            // boardcast userNum to all
        });
/*
        .then(function(res) {
            var onlineUsers = res;
            console.log('---- online users:::' + res);
            //redisClient.set("onlineUsers", onlineUsers, redis.print);

            //bgGameCtrl.addSocket(io, socket, mysqlConn);
            commonCtrl.sendOnlineUsers(io, onlineUsers);
        });
*/
/*
        console.log('------ current socket number :: ' + Object.keys(io.sockets).toString());
        console.log(Object.keys(io.sockets.connected).length);
        redisClient.getAsync('onlineUsers').then(function(res) {
            var onlineUsers = (res || 0)/1 + 1;
            console.log('---- online users:::' + onlineUsers);
            redisClient.set("onlineUsers", onlineUsers, redis.print);

            //bgGameCtrl.addSocket(io, socket, mysqlConn);
            commonCtrl.sendOnlineUsers(io, onlineUsers);
        });
*/


        socket.on('disconnect', function() {
            //onlineUsers--;
/*
            redisClient.incr('onlineUsers', -1).then(function(res) {
                var onlineUsers = res;
                console.log('---- online users:::' + onlineUsers);
                //redisClient.set("onlineUsers", onlineUsers, redis.print);
                commonCtrl.sendOnlineUsers(io, onlineUsers);
            });
*/
            redisClient.getAsync('onlineUsers' + clusterId).then(function(res) {
                var onlineUsers = (res || 0)/1 - 1;
                redisClient.set("onlineUsers" + clusterId, onlineUsers, redis.print);
                //commonCtrl.sendOnlineUsers(io, onlineUsers);
            });
        });


        socket.join(roomId);
        socket.room = roomId;

        socket.on('test-message', function (data) {
            console.log('--- got test message in ' + socket.room);
            //let rooms = Object.keys(socket.rooms);
            //console.log(rooms); // [ <socket.id>, 'room 237' ]
            if(data.message =='all') {
                io.emit('test-message', data);
            } else {
                io.in(socket.room).emit('test-message', data);
            }
        });

        socket.on('ans-message', function (data) {
            console.log('--- got answer message in ' + socket.room);
            //let rooms = Object.keys(socket.rooms);
            //console.log(rooms); // [ <socket.id>, 'room 237' ]
            io.in(socket.room).emit('ans-message', data);
            //io.emit('ans-message', data);
        })
    });
    //bgGameCtrl.init(io);

    /*
     Test Client Codes
     */
/*
    var testClinetNode = require('socket.io-client')('http://localhost:3335');
    testClinetNode.on('connect', function () {
        //console.log('----- connected ------' + roomId);
    });

    testClinetNode.on('disconnect', function () {
        //console.log('------ disconnected ------' + roomId);
    });

    testClinetNode.on('test-message', function (data) {
        //console.log('---- got message ----' + clusterId + ' - ' + roomId);
        testClinetNode.emit('ans-message', {roomId: roomId, clusterId: clusterId, message: 'answer from bot socket ' + clusterId + '.'});
    });
*/

};