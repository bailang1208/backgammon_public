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
var BackgammonSchema = new Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AppUser'
    },
    partner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AppUser'
    },
    roomName: {
        type: String,
        default: ''
    },
    betAmount: {
        type: Number,
        required: 'Please fill any bet amount'
    },
    doubleBet: {
        type: String,
        default: constants.DOUBLE_BET_NONE
    },
    winPoints: {
        type: Number,
        default: 2
    },
    status: {
        type: String,
        default: constants.GAME_STATUS_WAIT_MATCHING
    },
    player_turn: {
        type: Number,
        default: 0
    },
    player_last: {
        type: Number,
        default: 0
    },
    turn_start: {
        type: Number,
        default: 0
    },
    step: {
        type: Number,
        default: 0
    },
    zar: {
        creator: {type:Number, default:0},
        partner: {type:Number, default:0}
    },
    zar_at: {
        creator: {type:Number, default:0},
        partner: {type:Number, default:0}
    },
    nz:{
        type: String
    },
    pullar: {
        type: String
    },
    hamle: {
        type: String,
        default:''
    },
    winner: {
        type: Number,
        default: 0
    },
    last_message: {
        type: String
    },
    create_date: {
        type: String
    }
}, {timestamps: true, collection: 'mp_backgammon'});

mongoose.model('Backgammon', BackgammonSchema);
