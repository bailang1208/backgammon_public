'use strict';

/**
 * Module dependencies
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var constants = require('../../config/constants');

/**
 * Backgammon History Schema
 */
var BackgammonHistorySchema = new Schema({
    gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Backgammon'
    },
    winner: {
        type: Number, // 0 - none, 1 - creator, 2 - partner
        default: 0
    },
    endReason: {
        type: String,
        default: ''
    }

}, {timestamps: true, collection: 'mp_backgammon_history'});

mongoose.model('BackgammonHistory', BackgammonHistorySchema);