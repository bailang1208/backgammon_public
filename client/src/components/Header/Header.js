import React, { Component } from 'react';
import {Link} from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import io from 'socket.io-client';

import DefaultMenu from './DefaultMenu';
import LoggedInMenu from './LoggedInMenu';
import './header.css'
import {setTotalUserCount} from '../../actions/users';
import constants from '../../config/constants';

import { setLanguage } from 'redux-polyglot';
import enLang from '../../langs/en'
import chLang from '../../langs/ch'


var reconnectionInterval = false;
class Header extends Component {



  initSocketIO = () => {
    console.log('trying to connect to soccet server....');

    window.socket = io.connect(window.location.origin, {transports:['websocket', 'polling', 'flashsocket']});

    window.socket.on('connect', function() {
      console.log('connected')
      if(reconnectionInterval){
        clearInterval(reconnectionInterval)
        reconnectionInterval = false;
      }
    });

    window.socket.on('disconnect', function(message){
      if(reconnectionInterval) return;
      reconnectionInterval = setInterval(function(){
        window.socket.connect();
      }, 1000);
    })


    window.socket.on(constants.EVENT_CONNECT_USER, (data) => {
        console.log('Connect User', data);
        this.props.setTotalUserCount(data.userNum);
    });


    // window.socket.on('ans-message', function (data) {
    //     console.log(data);
    // });
    // window.socket.on('connect_failed', function () {
    //     console.log('-----------------**************** fail connect');
    // });

    // window.socket.on('connect_error', function (data) {
    //     console.log('************ error connection_error');
    // });

    // window.socket.on('error', function (err) {
    //     console.log('************ error ');
    //     console.log(err);
    // });



    // window.socket.on(constants.EVENT_DISCONNECT_USER, function (data) {
    //   addEventData('Disconnect User', data);
    // });

    // window.socket.on(constants.EVENT_ERROR, function (data) {
    //     addEventData('Error', data);
    // });

    // window.socket.on(constants.EVENT_ANSWER_CREATE_BACKGAMMON_GAME, function (data) {
    //     addEventData('Answer for create a backgammon game', data);
    // });

    // window.socket.on(constants.EVENT_CREATE_A_NEW_BACKGAMMON_ROOM, function (data) {
    //     addEventData('Create a new Backgammon game', data);
    // });



    // window.socket.on(constants.EVENT_REMOVE_A_BACKGAMMON_ROOM, function (data) {
    //     addEventData('Destroy a backgammon game', data);
    // });

    // window.socket.on(constants.EVENT_ANSWER_JOIN_BACKGAMMON_GAME, function (data) {
    //     addEventData('joined to a backgammon game', data);
    // });
  }

  // function sendMessage() {
  //   var msg = document.getElementById('msgInput').value;
  //   socket.emit('test-message', {message: msg, roomId: 'From browser'});
  //   document.getElementById('msgInput').value = '';
  // }

  // function addEventData(event_name, data) {
  //   $('<div class="event-item">' + event_name + ' ::  ' + JSON.stringify(data) + '</div>').appendTo($('#msgPanel'));
  //   $('#msgPanel').scrollTop(100000);
  // }


  // function createNewGame() {
  //   var newGame = {
  //       gameName: $('#game-name').val(),
  //       gameAmount: $('#game-amount').val(),
  //       winPoints: $('#game-win-point').val()
  //   };

  //   socket.emit(constants.EVENT_CREATE_BACKGAMMON_GAME, newGame);
  // }

  // function joinToGame() {
  //     var joinGame = {
  //         _id: $('#join-game-id').val()
  //     };

  //     socket.emit(constants.EVENT_JOIN_BACKGAMMON_GAME, joinGame);
  // }


  handleLocale = (e) => {
    switch(e.target.value) {
      case 'en':
        this.props.setLang('en', enLang);
        break;
      case 'ch':
        this.props.setLang('ch', chLang);
        break;
    }
  }


  render() {
    if(this.props.user) this.initSocketIO();
    return (
      <div>
        <nav className="navbar navbar-expand-lg navbar-light bg-light header">
          <Link to="/">
            <div className="navbar-brand" onClick={this.gotoHome}>
              <img src="images/logo.png" />
            </div>
          </Link>
          <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
              {!this.props.user && <DefaultMenu /> }
              {this.props.user && <LoggedInMenu /> }
              <select onChange={this.handleLocale}>
                <option value="en">English</option>
                <option value="ch">Chinese</option>
              </select>
          </div>
        </nav>
      </div>
    );
  }
}

const propTypes = {
  user: PropTypes.object,
  setTotalUserCount: PropTypes.func,
  setLang: PropTypes.func
};
Header.propTypes = propTypes;
const mapStateToProps = (state) => {
  return{
    user: state.user.user,
  }
};

const mapDispatchToProps = (dispatch) => {
  return {
    setLang: (lang, langData) => {dispatch(setLanguage(lang, langData))},
    setTotalUserCount
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Header);

