var cluster  = require('cluster');
var bluebird = require('bluebird');
const redisObj = require('redis');
bluebird.promisifyAll(redisObj.RedisClient.prototype);

if (cluster.isMaster) {

    var config = require('./config/config');
    var redisClient = redisObj.createClient({ host: 'localhost', port: config.redisPort});

    function fork_clusters() {
        var numberOfCPUs = require('os').cpus().length;
        // for (var i = 0; i < numberOfCPUs; i++) {
            cluster.fork();
        // }

        cluster.on('fork', function(worker) {
            console.log('worker fork : ', worker.id);
        });
        cluster.on('online', function(worker) {
            console.log('worker online: ', worker.id);
        });
        cluster.on('listening', function(worker, addr) {
            console.log('worker %s listening %s:%d', worker.id, addr.address, addr.port);
        });
        cluster.on('disconnect', function(worker) {
            console.log('worker %s disconnect', worker.id);
        });
        cluster.on('exit', function(worker, code, signal) {
            console.log('worker %s exit (%s)', worker.id, signal || code);
            redisClient.set('onlineUsers' + worker.id, 0);
            if (!worker.exitedAfterDisconnect) {

                console.log('new worker %s create', worker.id);
                cluster.fork();
            }
        });
    }

    fork_clusters();
}

if (cluster.isWorker) {
    var config = require('./config/config');

    var mongoose = require('mongoose');
    mongoose.Promise = require('bluebird');
    // Enabling mongoose debug mode if required
    mongoose.set('debug', config.db.debug);

    var chalk = require('chalk');

    // Using `mongoose.connect`...
    var promise = mongoose.connect(config.db.uri, config.db.options);
    promise.then(function(db) {
        var app = require('./config/express')(db);

        app.listen(config.port, config.host, function () {
            // Create server URL
            var server = (config.secure.ssl ? 'https://' : 'http://') + config.host + ':' + config.port;
            // Logging initialization
            console.log('--');
            console.log(chalk.green(config.app.title));
            console.log();
            console.log(chalk.green('Environment:     ' + process.env.NODE_ENV));
            console.log(chalk.green('Server:          ' + server));
            console.log(chalk.green('Database:        ' + config.db.uri));
            console.log('--');
        });
    }).catch( function(err) {
        console.error(chalk.red('Could not connect to MongoDB!'));
        console.log(err);
    });

/*
    var _portSocket  = 3335;
    var http = require('http');
    var app = require('express')();
    var mysql = require('mysql');
    var ioConfig = require('./socket_controllers/ioConfig'),
        fn = require('./socket_controllers/functions');
    var mysqlConn = mysql.createPool(ioConfig.mysql);

    app.set('fn', fn);
    app.set('db', mysqlConn);

    var cons = require('consolidate');
    app.engine('html', cons.swig);
    app.set('view engine', 'html');
    app.set('views', __dirname + '/views');

    app.route('/test-page').get(function (req, res) {
        res.render('test_page');
    });
    http.globalAgent.maxSockets = Infinity;
    var server = http.createServer(app).listen(_portSocket);

    var socketIO = require('socket.io').listen(server);

    const redis = require('socket.io-redis');
    socketIO.adapter(redis({ host: 'localhost', port: 6379 }));

    const redisObj = require('redis');
    bluebird.promisifyAll(redisObj.RedisClient.prototype);
    var redisClient = redisObj.createClient({ host: 'localhost', port: 6379 });
    redisClient.set('onlineUsers' + cluster.worker.id, 0);
    //socketMaster.add_a_cluster(app, socketIO, cluster.worker.id);
    socketMaster.init(app, socketIO, cluster.worker.id, redisClient);
*/
}
