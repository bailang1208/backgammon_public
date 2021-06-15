import React, { Component } from 'react';
import PropTypes from 'prop-types';
import constants from '../../config/constants';

import './style.css'
require('./b.js');

const $ = window.jQuery;
const forceExitGame = () => {};

const propTypes = {
    userNum: PropTypes.number,
    saveBackgammonGameId: PropTypes.func
};

class GameBoard extends Component {
    
    room = {
        roomId: '',
        owner: 1,
        partner: 2,
        curPlayer: 1,
        passivePlayer: 2,
        step: 0,
        zar: {creator: 0, partner: 0},
        zar_at: {creator: 0, partner: 0},
        puls: {"1":{"6":5,"8":3,"13":5,"24":2},"2":{"1":2,"12":5,"17":3,"19":5}},
        doubleStatus : constants.DOUBLE_BET_NONE,
        bet: 0,
        user: {
            id: '',
            username: "",
            profileImageURL: 'images/profile.png',
            walletAmount: 0
        },
        opponent: {
            id: '',
            username: "",
            profileImageURL: 'images/profile.png',
            walletAmount: 0
        },
        lineNumbers: {
            1: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25],
            2: [25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0]
        },
        sound: 0,
        is_admin: false
    }
    
    move_checker(data) {
        window.socket.emit(constants.EVENT_BACKGAMMON_MOVE_CHECKER, data);
    }
    
    componentWillMount = () => {
    
    }
    
    componentDidMount = () => {
        window.gameBoardCompoente = this;
        
        var game_info = window.game_info;
    
        window.socket.emit(constants.EVENT_BACKGAMMON_GAME_LOAD, game_info);
        window.socket.on(constants.EVENT_BACKGAMMON_GAME_LOAD_RESULT, (data) => {
            console.log("load...........", data);
            this.room = data;
            window.initBoard(this.room, constants);
        });
    }
    
    style = {
        color: 'white',
    }
    
    render() {
        if(window.game_room) {
            this.room = window.game_room;
        }
        
        let doubleButton;
        if (this.room.doubleStatus == constants.DOUBLE_BET_REJECTED) {
            doubleButton = (
                <button id="double" class="bc declined"></button>
            )
        }
        else if(this.room.doubleStatus == constants.DOUBLE_BET_APPROVED) {
            doubleButton = (
                <button id="double" class="bc accepted"></button>
            )
        }
        else {
            doubleButton = (
                <button id="double" class="bc"></button>
            )
        }
        
        let img_zar_at;
        if(this.room.step == 1) {
            if(this.room.zar_at.creator == 1) {
                img_zar_at = (<img class="bzar1" src={"images/" + this.room.zar.creator + ".png"} />)
            }
            if(this.room.zar_at.partner == 1) {
                img_zar_at = (<img class="bzar2" src={"images/" + this.room.zar.partner + ".png"} />)
            }
        }
        
        return (
            <div id="board_container" style={this.style}>
                {/*
                    this.room.step == 0 || this.room.step == 1 ?
                        <div id="game_starting" class="game_starting">Get ready, game starting...</div> : ''
                */}
    
                <div id="fixer"></div>
                <div class="game-container clearfix">
        
        
                    <div id="overlay">
                        <div id="alert">
                            <div id="alert-message">
                            </div>
                        </div>
                    </div>
        
        
                    <div class="left-bar">
                        <div class="profiles">
                            <div class="profile him">
                                <img class="img_profile" src="/images/profile.png"/>
                                <span>
                                    {this.room.opponent.username}
                                </span>
                            </div>
                
                            <div class="profile me">
                                <img class="img_profile" src={this.room.user.profileImageURL == '' ? "/images/profile.png" : "/images/profile.png"} />
                                <span>
                                    {this.room.user.username}
                                </span>
                            </div>
                        </div>
                    </div>
        
                    <div id="game_board" class="game-board">
                        <img class="board-image" src="images/board.png" />
            
                        <div id="clock" class="bc"><span></span></div>
                        <div id="zar"></div>
            
                        <button id="exit" class="bc abandon"></button>
            
                        <button id="undo" class="bc" onclick="undo()"></button>
            
                        <button id="chat" class="bc"></button>
            
            
                        {this.room.user.walletAmount > this.room.bet && this.room.user.walletAmount > this.room.bet ?
                
                            <div id="double_container" class={this.room.doubleStatus == constants.DOUBLE_BET_REQUIRED ? '"request"' : ''}>
                                {doubleButton}
                                <span id="confirm_form">
                                <button id="double_decline" data-r="3"></button>
                                <button id="double_accept" data-r="1"></button>
                                <span>
                                    Double bet?
                                </span>
                            </span>
                                <span id="inf"></span>
                            </div> : ''
                        }
            
                        {
                            this.room.zar_at.creator == 0 || this.room.zar_at.partner == 0 ?
                                <button id={this.room.zar_at.creator == 0 && this.room.zar_at.partner == 0 ? 'zar_at style="display:block"' : 'zar_at' + this.room.step}>Roll Dice</button> : ''
                        }
            
                        {img_zar_at}
            
                        <button class={this.room.sound == 1 ? 'sound bc on' : 'sound bc off'}></button>
            
                        <div id="chat-cont" class="bc">
                            <div id="history"><ul></ul></div>
                            <form id="chat-form"><input name="message" class="bc" autocomplete="off" /><button class="bc"></button></form>
                        </div>
            
                        <div id="gb_main" class="gb-main">
                            <div class="partition partition-4">
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][24]} class={"line line-" + this.room.lineNumbers[this.room.owner][24]} data-id={this.room.lineNumbers[this.room.owner][24]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][23]} class={"line line-" + this.room.lineNumbers[this.room.owner][23]} data-id={this.room.lineNumbers[this.room.owner][23]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][22]} class={"line line-" + this.room.lineNumbers[this.room.owner][22]} data-id={this.room.lineNumbers[this.room.owner][22]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][21]} class={"line line-" + this.room.lineNumbers[this.room.owner][21]} data-id={this.room.lineNumbers[this.room.owner][21]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][20]} class={"line line-" + this.room.lineNumbers[this.room.owner][20]} data-id={this.room.lineNumbers[this.room.owner][20]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][19]} class={"line line-" + this.room.lineNumbers[this.room.owner][19]} data-id={this.room.lineNumbers[this.room.owner][19]}><div class="pul-cont"></div></div>
                            </div>
                            <div class={'kirik_line kirik_line_' + this.room.partner + ' kirik_top'}><div class="pul-cont"></div></div>
                            <div class="partition partition-3">
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][18]} class={"line line-" + this.room.lineNumbers[this.room.owner][18]} data-id={this.room.lineNumbers[this.room.owner][18]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][17]} class={"line line-" + this.room.lineNumbers[this.room.owner][17]} data-id={this.room.lineNumbers[this.room.owner][17]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][16]} class={"line line-" + this.room.lineNumbers[this.room.owner][16]} data-id={this.room.lineNumbers[this.room.owner][16]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][15]} class={"line line-" + this.room.lineNumbers[this.room.owner][15]} data-id={this.room.lineNumbers[this.room.owner][15]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][14]} class={"line line-" + this.room.lineNumbers[this.room.owner][14]} data-id={this.room.lineNumbers[this.room.owner][14]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][13]} class={"line line-" + this.room.lineNumbers[this.room.owner][13]} data-id={this.room.lineNumbers[this.room.owner][13]}><div class="pul-cont"></div></div>
                            </div>
                            <div class="partition partition-2">
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][7]} class={"line line-" + this.room.lineNumbers[this.room.owner][7]} data-id={this.room.lineNumbers[this.room.owner][7]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][8]} class={"line line-" + this.room.lineNumbers[this.room.owner][8]} data-id={this.room.lineNumbers[this.room.owner][8]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][9]} class={"line line-" + this.room.lineNumbers[this.room.owner][9]} data-id={this.room.lineNumbers[this.room.owner][9]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][10]} class={"line line-" + this.room.lineNumbers[this.room.owner][10]} data-id={this.room.lineNumbers[this.room.owner][10]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][11]} class={"line line-" + this.room.lineNumbers[this.room.owner][11]} data-id={this.room.lineNumbers[this.room.owner][11]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][12]} class={"line line-" + this.room.lineNumbers[this.room.owner][12]} data-id={this.room.lineNumbers[this.room.owner][12]}><div class="pul-cont"></div></div>
                            </div>
                            <div class={'kirik_line kirik_line_' + this.room.owner + ' kirik_top'}><div class="pul-cont"></div></div>
                            <div class="partition partition-1">
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][1]} class={"line line-" + this.room.lineNumbers[this.room.owner][1]} data-id={this.room.lineNumbers[this.room.owner][1]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][2]} class={"line line-" + this.room.lineNumbers[this.room.owner][2]} data-id={this.room.lineNumbers[this.room.owner][2]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][3]} class={"line line-" + this.room.lineNumbers[this.room.owner][3]} data-id={this.room.lineNumbers[this.room.owner][3]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][4]} class={"line line-" + this.room.lineNumbers[this.room.owner][4]} data-id={this.room.lineNumbers[this.room.owner][4]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][5]} class={"line line-" + this.room.lineNumbers[this.room.owner][5]} data-id={this.room.lineNumbers[this.room.owner][5]}><div class="pul-cont"></div></div>
                                <div id={"line_" + this.room.lineNumbers[this.room.owner][6]} class={"line line-" + this.room.lineNumbers[this.room.owner][6]} data-id={this.room.lineNumbers[this.room.owner][6]}><div class="pul-cont"></div></div>
                            </div>
                        </div>
            
                        <div class="partition-5">
                            <div id={"line_" + this.room.lineNumbers[this.room.partner][0]} class={"line line-" + this.room.lineNumbers[this.room.partner][0] + "line-top"} data-id={this.room.lineNumbers[this.room.partner][0]}><div class="pul-cont"></div></div>
                            <div id={"line_" + this.room.lineNumbers[this.room.owner][0]} class={"line line-" + this.room.lineNumbers[this.room.owner][0] + "line-bottom"} data-id={this.room.lineNumbers[this.room.owner][0]}><div class="pul-cont"></div></div>
                        </div>
            
                        <div id="rolling_stones" class="rolling-stones clearfix">
                            <div id="dice_1" class="dice_1"><img src="" /></div>
                            <div id="dice_2" class="dice_2"><img src="" /></div>
                        </div>
                    </div>
                </div>
    
                <div id="orientation-warning"><img src="<?php echo $homeUrl?>/images/landscape.png" width="50%" /><br />
                    Please set your device on landscape mode.
                </div>
    
                <audio id="sound_dice" controls="controls" class="hidden"><source src="images/dice.wav" type="audio/mpeg" /></audio>
                <audio id="sound_pawn" controls="controls" class="hidden"><source src="images/pawn.wav" type="audio/mpeg" /></audio>
    
                {
                    this.room.is_admin ?
                        <button class="set_dice" style="position:absolute;z-index:89;right:0;width:9vw;bottom:15%;box-sizing:border-box;background:rgba(0,0,0,.7);border:0;outline:0;height:3%;padding:3vw 0;font-size:11px;line-height:0">Dice</button> : ''
                }
    
                <div>{this.room.roomId}</div>
            </div>
        );
    }
}

/*
$(document).ready(function(){
  $('.game-board').on('touchmove', function(e){
      e.preventDefault();
  });
});*/

GameBoard.propTypes = propTypes;
export default GameBoard;
