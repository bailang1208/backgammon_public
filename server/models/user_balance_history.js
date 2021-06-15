'use strict';

/**
 * Module dependencies
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var constants = require('../../config/constants');

/**
 * Backgammon Schema
 */
var UserBalanceHistroySchema = new Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AppUser'
    },
    amount: {
        type: Number,
        default: 0
    },
    balance_after: {
        type: String,
        default: ''
    },
    comission: {
        type: String,
        default: ''
    },
    game_id: {
        type: Number,
        default: 0
    },
    room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Backgammon'
    },
    transaction_id: {
        type: Number,
        default: 0
    },
    exp: {
        type: String,
        default: ''
    },
    create_date: {
        type: String
    }
}, {timestamps: true, collection: 'mp_user_balance_history'});

mongoose.model('UserBalanceHistory', UserBalanceHistroySchema);
