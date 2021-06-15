import React, { Component } from 'react';
import PropTypes from 'prop-types';
import constants from '../../config/constants';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';
import update from 'react-addons-update';
import AlertContainer from 'react-alert';
import {saveBackgammonGameId} from '../../actions/backgammonInfo';

const propTypes = {
    userNum: PropTypes.number,
    saveBackgammonGameId: PropTypes.func
};

class BackGammonLobby extends Component {
    
    state = {
        rooms: [],
        gamePrice: 2500,
    }
    
    alertOptions = {
        offset: 14,
        position: 'bottom right',
        theme: 'dark',
        time: 3000,
        transition: 'scale'
    }
    
    
    componentDidMount() {
        
        window.socket.emit(constants.EVENT_VISIT_BACKGAMMON_LOBBY, {});
        
        window.socket.on(constants.EVENT_CHANGE_WAITING_BACKGAMMON_ROOMS, (data) => {
            // addEventData('Changed waiting backgammon game rooms', data);
            this.setState({
                ...this.state,
                rooms: data
            })
            console.log("rooms...........",data);
        });
        
        window.socket.on(constants.EVENT_CREATE_A_NEW_BACKGAMMON_ROOM, (data) => {
            console.log('new game created' + JSON.stringify(data));
            this.setState({
                ...this.state,
                rooms: update( this.state.rooms, { $push: [data.game]} )
            })
        });
        window.socket.on(constants.EVENT_ERROR, (data) => {
            console.log('error ----' + JSON.stringify(data));
            if(this.msg) {
                this.msg.show(JSON.stringify(data.message), {
                    time: 5000,
                    type: 'error'
                })
            }
        });
        window.socket.on(constants.EVENT_ANSWER_CREATE_BACKGAMMON_GAME, (data) => {
            console.log('my game is created' + JSON.stringify(data));
        });
        
    }
    
    handleMakeRoom = (e) => {
        const newGame = {
            gameName: constants.BASE_GAMENAME_BACKGAMMON,
            gameAmount: this.state.gamePrice,
            winPoints: 10,
        };
        window.socket.emit(constants.EVENT_CREATE_BACKGAMMON_GAME, newGame);
        window.socket.on(constants.EVENT_ANSWER_JOIN_BACKGAMMON_GAME, (value) => {
            this.enterBackgammonBoard(value);
        })
    }
    
    handleEnterGame = (value) => {
        console.log(value);
        window.socket.emit(constants.EVENT_JOIN_BACKGAMMON_GAME, {_id: value._id})
        
        window.socket.on(constants.EVENT_ANSWER_JOIN_BACKGAMMON_GAME, (value) => {
            console.log("The partner is joinned.")
            this.enterBackgammonBoard(value);
        })
    }
    
    enterBackgammonBoard = (value) => {
        console.log('preparing to enter backgammon board', value);
        // value.userId,
        // value.gameId
        window.game_info = value;
    
        if(value)
            this.props.saveBackgammonGameId(value);
        this.props.value = value;
        this.props.history.push('/backgammon/board');
    }
    
    onChange = (e) => {
        this.setState({
            ...this.state,
            gamePrice: e.target.value
        });
    }
    onPlus = () => {
        let gamePrice = this.state.gamePrice;
        gamePrice += 2500;
        if(gamePrice > 1000000) gamePrice = 1000000;
        this.setState({
            ...this.state,
            gamePrice
        })
    }
    onMinus = () => {
        let gamePrice = this.state.gamePrice;
        gamePrice -= 2500;
        if(gamePrice < 2500) gamePrice = 2500;
        this.setState({
            ...this.state,
            gamePrice
        })
    }
    
    render() {
        const style = {
            roomListStyle: {
                backgroundColor: 'rgba(0,0,0,0.5)',
                cursor: 'pointer',
            },
            colorWhite: {
                color: '#fff',
            }
        }
        
        return (
            <div className="BackGammonLobby" style={style.colorWhite}>
                <div className="container">
                    
                    <AlertContainer ref={a => this.msg = a} {...this.alertOptions} />
                    
                    <div className="form-group row">
                        <button className="col-md-1" onClick={this.onMinus}>-</button>
                        <input type="range" className="col-md-10" min="2500" max="1000000" step="2500" value={this.state.gamePrice} onChange={this.onChange} />
                        <button className="col-md-1" onClick={this.onPlus}>+</button>
                    </div>
                    <div className="form-group">
                        <button className="form-control btn btn-success" onClick={this.handleMakeRoom}>Play for {this.state.gamePrice}</button>
                    </div>
                    <div className="rooms">
                        Open Rooms ({this.props.userNum} Users Online) <br/>
                        <div>
                            There are {this.state.rooms.length} rooms available now.
                            {
                                this.state.rooms.map((value, idx)=>{
                                    return (
                                        <div style={style.roomListStyle} onClick={()=> this.handleEnterGame(value)}>
                                            <span>[{value.creator.username ? value.creator.username : ''}] created new room for match named</span>
                                            <span> #{value.roomName}# - </span>
                                            <span> ( price - {value.betAmount} ) </span>
                                            <hr/>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}


BackGammonLobby.propTypes = propTypes;

const mapStateToProps = (state) => {
    return {
        userNum: state.user.userNum
    }
}
export default connect(mapStateToProps, {saveBackgammonGameId}) (BackGammonLobby);
