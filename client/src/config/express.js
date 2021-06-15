var express = require('express');
var glob = require('glob');
var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var favicon = require('serve-favicon');
var logger = require('morgan');
var helmet = require('helmet');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var compress = require('compression');
var methodOverride = require('method-override');
var cons = require('consolidate');
var config = require('./config');
var path = require('path');

module.exports = function(db) {

  var app = express();

  var env = process.env.NODE_ENV || 'development';
  app.locals.ENV = env;
  app.locals.ENV_DEVELOPMENT = env == 'development';

  // view engine
    app.set('appPath', path.join(config.root, 'client'));
    app.use(express.static(app.get('appPath')));


    app.engine('html', cons.swig);
    app.set('view engine', 'html');
    app.set('views', config.root + '/server/views');

    // init sessions
    var _session = session({
        saveUninitialized: true,
        resave: true,
        secret: config.sessionSecret,
        cookie: {
            maxAge: config.sessionCookie.maxAge,
            httpOnly: config.sessionCookie.httpOnly,
            secure: config.sessionCookie.secure && config.secure.ssl
        },
        key: config.sessionKey,
        store: new MongoStore({
            mongooseConnection: mongoose.connection,
            collection: config.sessionCollection
        })
    });
    app.use(_session);

    // favicon
  app.use(favicon(config.root + '/public/images/favicon.png'));

  // logger
  if (env == 'development')
    app.use(logger('dev'));

  // body parser
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(cookieParser());
  app.use(compress());

  // static path
  app.use(express.static(config.root + '/public'));
  app.use(methodOverride());

  // helmet to secure express headers
    app.use(helmet());

    app.disable('x-powered-by');



  // controllers
  // var controllers = glob.sync(config.root + '/server/controllers/*.js');
  // controllers.forEach(function (controller) {
  //   require(controller)(app);
  // });

    // database models
    var models = glob.sync(config.root + '/server/models/*.js');
    models.forEach(function (model) {
        require(model);
    });

  // configurations
  var configs = glob.sync(config.root + '/server/config/*.server.config.js');
  configs.forEach(function (configer) {
      require(configer)(app);
  });

  // routes
  var routes = glob.sync(config.root + '/server/routes/*.js');
  routes.forEach(function (router) {
      require(router)(app);
  });

    // acl policies
  var policies = glob.sync(config.root + '/server/policies/*.js');
  policies.forEach(function (police) {
      require(police).invokeRolesPolicies();
  });

  // error handler
  app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });
  
  if(app.get('env') === 'development'){
    app.use(function (err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: err,
        title: 'error'
      });
    });
  }

  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: {},
        title: 'error'
      });
  });

  app = require('./socket.io')(app, db, _session);

  return app;
};
