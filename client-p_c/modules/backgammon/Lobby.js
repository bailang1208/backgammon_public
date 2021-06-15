import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';

// Import Style
import backgammon_styles from './style.css';
import styles from './../../css/common.css';
import c_styles from './../../css/style.css';

export class Lobby extends Component {
    constructor() {
        super();
    }

    componentDidMount() {
        this.setState({isMounted: true}); // eslint-disable-line
    }

    render() {
        return (
            <div>
                <div className={[styles.clearfix, backgammon_styles.create_room_cont].join(' ')}>
                    <div className={[backgammon_styles.col_slider, stylesclearfix].join(' ')}>
                        <button className={backgammon_styles.slider_minus}></button>
                        <div className={backgammon_styles.col_slider_ui}><div id="slider"></div></div>
                        <button className={backgammon_styles.slider_plus}></button>
                    </div>

                    <input type="hidden" id="amount" readonly style="" />
                    <div className={backgammon_styles.col_create_button}><button className={backgammon_styles.create_room}>Play For<span></span> تومان</button></div>
                </div>

                <div className={backgammon_styles.roomlist}>
                    <h2>
                    <span style={{float:'left', display:'block', marginRight:'5px'}}>Open Rooms</span>
                        <span style={{fontWeight:'100', fontSize:'16px', color:'#eee8aa'}}>4 Users Online</span>
                    </h2><br />

                    <div className={[styles.clearfix, backgammon_styles.room_head].join(' ')} >
                        <div className={[backgammon_styles.col, backgammon_styles.col_room_player_1].join(' ')}><strong>Player</strong></div>
                        <div className={[backgammon_styles.col, backgammon_styles.col_room_bet].join(' ')}><strong>Bet</strong></div>
                    </div>

                    <div>
                        No free rooms. You can create a room and wait for your opponent.
                    </div>
                </div>
            </div>
        );
    }
}

export default Lobby;
