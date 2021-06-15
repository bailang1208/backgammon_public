var fs           =  require('fs');
var express     = require('express');
var cluster  = require('cluster');
var bluebird = require('bluebird');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var cons = require('consolidate');
var path = require('path');

var socketMaster = require('./socket_controllers/socket');

var _portSocket  = process.env.PORT || 3000;
var http = require('http');

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

var socketIO = require('socket.io').listen(server, {pingInterval: 15000,
    pingTimeout: 30000});
socketMaster.add_a_cluster(app, socketIO);

