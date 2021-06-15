'use strict';
var path = require('path');

var commonController = require('../controllers/common.controller');
var adminController = require('../controllers/admin.server.controller');
var Policy = require('../policies/admin.policy');

module.exports = function (app) {
    // app.route('/api/admin/change-wallet').post(admin.change_wallet);
    app.route('/api/admin/default-setting')
        .get(Policy.isAllowed, commonController.read_default_settings)
        .put(Policy.isAllowed, commonController.update_default_settings);

// Users collection routes
    app.route('/api/users')
        .get(Policy.isAllowed, adminController.listUsers);

    // Single user routes
    app.route('/api/users/:userId')
        .get(Policy.isAllowed, adminController.readUser)
        .put(Policy.isAllowed, adminController.updateUser)
        .delete(Policy.isAllowed, adminController.deleteUser);

    // Finish by binding the user middleware
    app.param('userId', adminController.userByID);

};
