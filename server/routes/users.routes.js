'use strict';

var users = require('../controllers/users.server.controller');
var Policy = require('../policies/app_user.policy');

module.exports = function (app) {

    // Setting up the users profile api
    app.route('/api/users/me').get(users.me);
    app.route('/api/users').put(users.update);
    app.route('/api/users/accounts').delete(users.removeOAuthProvider);
    app.route('/api/users/password').post(users.changePassword);
    app.route('/api/users/picture').post(users.changeProfilePicture);

};
