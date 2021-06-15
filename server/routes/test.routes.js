'use strict';
var path = require('path');
var constants = require(path.resolve('./config/constants'));

module.exports = function (app) {

    // Setting up the users profile api
    app.route('/test-page').get(function (req, res) {
        res.render('test_page', {constants: constants});
    });

    app.route('/test/sign-up').get(function (req, res) {
        res.render('signup');
    });

    app.route('/test/sign-in').get(function (req, res) {
        res.render('signin');
    });

    app.route('/test/admin-users').get(function (req, res) {
        res.render('admin.users');
    });

    app.route('/test/admin-games').get(function (req, res) {
        res.render('admin.games');
    });

    // All other routes should redirect to the index.html
    app.route('/*').get(function(req, res) {
        res.render('index');
    });

};
