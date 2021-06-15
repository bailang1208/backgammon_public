var redis = require('redis');
/*
 socket modules ==========================================================
 */
var socketUsers = [];

var commonCtrl = require('./game_controllers/common');
var bgGameCtrl = require('./game_controllers/backgammon'); // backgammon game


exports.add_a_cluster = function (app, io, clusterId) {
    var mysqlConn = app.get('db');

    io.on('connection', function(socket) {

        socket.on('disconnect', function() {
            //commonCtrl.sendOnlineUsers(io, onlineUsers);
        });

        bgGameCtrl.addSocket(io, socket, mysqlConn);
        //commonCtrl.sendOnlineUsers(io, onlineUsers);

        socket.on('test-message', function (data) {
            io.emit('test-message', data);
        })
    });

    bgGameCtrl.init(io);

};
