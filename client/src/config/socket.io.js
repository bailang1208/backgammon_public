'use strict';

// Load the module dependencies
var config = require('./config'),
    path = require('path'),
    fs = require('fs'),
    http = require('http'),
    https = require('https'),
    cookieParser = require('cookie-parser'),
    passport = require('passport'),
    socketio = require('socket.io'),
    mongoose = require('mongoose'),
    redis = require('socket.io-redis');

var sharedsession = require("express-socket.io-session");

// Define the Socket.io configuration method
module.exports = function (app, db, session) {
    var server;
    //var MongoStore = require('connect-mongo')(session);

        if (config.secure && config.secure.ssl === true) {
        // Load SSL key and certificate
        var privateKey = fs.readFileSync(path.resolve(config.secure.privateKey), 'utf8');
        var certificate = fs.readFileSync(path.resolve(config.secure.certificate), 'utf8');
        var options = {
            key: privateKey,
            cert: certificate,
            //  requestCert : true,
            //  rejectUnauthorized : true,
            secureProtocol: 'TLSv1_method',
            ciphers: [
                'ECDHE-RSA-AES128-GCM-SHA256',
                'ECDHE-ECDSA-AES128-GCM-SHA256',
                'ECDHE-RSA-AES256-GCM-SHA384',
                'ECDHE-ECDSA-AES256-GCM-SHA384',
                'DHE-RSA-AES128-GCM-SHA256',
                'ECDHE-RSA-AES128-SHA256',
                'DHE-RSA-AES128-SHA256',
                'ECDHE-RSA-AES256-SHA384',
                'DHE-RSA-AES256-SHA384',
                'ECDHE-RSA-AES256-SHA256',
                'DHE-RSA-AES256-SHA256',
                'HIGH',
                '!aNULL',
                '!eNULL',
                '!EXPORT',
                '!DES',
                '!RC4',
                '!MD5',
                '!PSK',
                '!SRP',
                '!CAMELLIA'
            ].join(':'),
            honorCipherOrder: true
        };

        // Create new HTTPS Server
        server = https.createServer(options, app);
    } else {
        // Create a new HTTP server
        server = http.createServer(app);
    }
    // Create a new Socket.io server
    var io = socketio.listen(server, {pingInterval: 15000, pingTimeout: 30000});
    io.adapter(redis({ host: 'localhost', port: config.redisPort }));
    io.of('/').adapter.on('error', function(err){
        console.log('------- redis adapter error ------');
        console.log(err);
    });

    // Create a MongoDB storage object
/*
    var mongoStore = new MongoStore({
        mongooseConnection: mongoose.connection,
        collection: config.sessionCollection
    });
*/
    var mongoStore = session.store;

    // Intercept Socket.io's handshake request
    io.use(sharedsession(session, {
        autoSave:true
    }));

    io.use(function (socket, next) {
        var socketSession = socket.handshake.session;
        if (!socketSession) return next(new Error('session was not found.'), false);

        // Set the Socket.io session information
        socket.request.session = socketSession;

        // Use Passport to populate the user details
        passport.initialize()(socket.request, {}, function () {
            passport.session()(socket.request, {}, function () {
                if (socket.request.user) {
                    next(null, true);
                } else {
                    next(new Error('User is not authenticated'), false);
                }
            });
        });
        // Use the 'cookie-parser' module to parse the request cookies
/*
        cookieParser(config.sessionSecret)(socket.request, {}, function (err) {
            // Get the session id from the request cookies
            var sessionId = socket.request.signedCookies ? socket.request.signedCookies[config.sessionKey] : undefined;

            if (!sessionId) return next(new Error('sessionId was not found in socket.request'), false);

            // Use the mongoStorage instance to get the Express session information
            mongoStore.get(sessionId, function (err, session) {
                if (err) return next(err, false);
                if (!session) return next(new Error('session was not found for ' + sessionId), false);

                // Set the Socket.io session information
                socket.request.session = session;

                // Use Passport to populate the user details
                passport.initialize()(socket.request, {}, function () {
                    passport.session()(socket.request, {}, function () {
                        if (socket.request.user) {
                            next(null, true);
                        } else {
                            next(new Error('User is not authenticated'), false);
                        }
                    });
                });
            });
        });
*/
    });

    const redisObj = require('redis');
    const bluebird = require('bluebird');
    bluebird.promisifyAll(redisObj.RedisClient.prototype);
    var redisClient = redisObj.createClient({ host: 'localhost', port: 6379 });
    var mainSocketController = require('../server/socket_cluster_controllers/main');
    mainSocketController.init(app, io, redisClient);
    //mainSocketController.init(app, io, null);

    return server;
};
