var chalk = require('chalk');
var path = require('path');
var commonController = require('./games/_common.controller');
var constants = require(path.resolve('./config/constants'));

function get_online_users(io, cb){
    io.of('/').adapter.clients(function(err, clients){
        var count = clients ? clients.length : 0;
        commonController.send_common_message(io, constants.EVENT_CONNECT_USER, {userNum: count});
        if (cb)
            cb(err, count);
    });
}

exports.init = function (app, io, redisClient) {

    io.on('connection', function(socket) {
        console.log(chalk.green('------ connected a user -------'));
        // console.log(socket.request.user);
        get_online_users(io);

        if (socket.request.user){
            require('./games/backgammon.controller').init(io, socket, redisClient); // init backgammon game
        }

        socket.on('disconnect', function() {
            // broadcast users number
            console.log(chalk.blue('------ disconnect a user -------'));
            get_online_users(io);
        });

        /* Test Socket Events */
        socket.emit('test-message', {testData: socket.handshake.session.testData});

        socket.on('test-message', function (data) {
            console.log(chalk.green('--- got test message in ' + socket.room));
            socket.handshake.session.testData = {message: 'got test message'};
            socket.handshake.session.save();
            if(data.message =='all' || !socket.room) {
                io.emit('test-message', data);
            } else {
                io.in(socket.room).emit('test-message', data);
            }
        });

    });

};