var cluster  = require('cluster');
var bluebird = require('bluebird');

var socketMaster = require('./socket_cluster_controllers/socket');

if (cluster.isMaster) {
    var _portSocket  = 3335;
    const redisObj = require('redis');
    bluebird.promisifyAll(redisObj.RedisClient.prototype);
    var redisClient = redisObj.createClient({ host: 'localhost', port: 6379 });

    function fork_clusters() {
        var numberOfCPUs = require('os').cpus().length;
        for (var i = 0; i < numberOfCPUs; i++) {
            cluster.fork();
        }

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

    redisClient.flushdb(function (err, result) {
        console.log('---- after flush db ----');
        console.log(err);
        //redisClient.del('onlineUsers');
        //redisClient.set('onlineUsers', 0);
        fork_clusters();
    });

    //fork_clusters();

    //socketMaster.init(socketIO);
}

if (cluster.isWorker) {
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

 /*
 const redis = require('redis').createClient;
 const adapter = require('socket.io-redis');
 const pub = redis(6379, 'localhost');
 const sub = redis(6379, 'localhost');
 socketIO.adapter(adapter({ pubClient: pub, subClient: sub }));
 */

    const redis = require('socket.io-redis');
    socketIO.adapter(redis({ host: 'localhost', port: 6379 }));

    const redisObj = require('redis');
    bluebird.promisifyAll(redisObj.RedisClient.prototype);
    var redisClient = redisObj.createClient({ host: 'localhost', port: 6379 });
    redisClient.set('onlineUsers' + cluster.worker.id, 0);
    //socketMaster.add_a_cluster(app, socketIO, cluster.worker.id);
    socketMaster.init(app, socketIO, cluster.worker.id, redisClient);
}