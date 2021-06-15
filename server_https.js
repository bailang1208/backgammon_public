var cluster  = require('cluster');
var bluebird = require('bluebird');

var socketMaster = require('./socket_controllers/socket');

var _portSocket  = process.env.PORT || 80;
var http = require('http');
var fs           =  require('fs');
var https              = require("https");
var express     = require('express');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');
var bodyParser = require('body-parser');
var cons = require('consolidate');
var path = require('path');
var mysql = require('mysql');

var app = express();
var ioConfig = require('./socket_controllers/ioConfig'),
    fn = require('./socket_controllers/functions');
var mysqlConn = mysql.createPool(ioConfig.mysql);

app.set('fn', fn);
app.set('db', mysqlConn);

app.engine('html', cons.swig);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(methodOverride());

// Add the cookie parser middleware
app.use(cookieParser());
app.use('/', express.static(path.resolve('./public')));

app.route('/').get(function (req, res) {
    res.send({message: 'running socket server, successfully.'});
});

app.route('/test-page').get(function (req, res) {
    res.render('test_page');
});
app.route('/api/test-db').get(function (req, res) {
    mysqlConn.getConnection(function(err, connection) {
        // connected! (unless `err` is set)
        res.send({err: err, result: connection ? 'success' : 'fail'});
    });
});

http.globalAgent.maxSockets = Infinity;
var server = http.createServer(app).listen(_portSocket);

var httpsServer = https.createServer({
key:  fs.readFileSync("./keys/goldcdn/goldgamecdn.com.key"),
cert: fs.readFileSync("./keys/goldcdn/goldgamecdn.com.crt")
}, app).listen(443);

// Start Socket.io so it attaches itself to Express server
var socketIO = require('socket.io').listen(httpsServer, {"log level":1});

socketMaster.add_a_cluster(app, socketIO);