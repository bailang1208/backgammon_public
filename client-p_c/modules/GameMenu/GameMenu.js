import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';

// Import Style
import styles from './../../css/common.css';
import c_styles from './../../css/style.css';

// Import Components
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import route from './../../routes';

// Import Images
import backgammon from './../../images/backgammon.png';
import chess from './../../images/chess.png';
import poker from './../../images/poker.png'
import blackjack from './../../images/blackjack.png';
import rulet from './../../images/rulet.png';
import slot from './../../images/slot.png';

export class GameMenu extends Component {
    constructor() {
        super();
    }

    componentDidMount() {
        this.setState({isMounted: true}); // eslint-disable-line
    }

    render() {
        return (
            <div>
                <Header />
                <div className={styles.container}>
                    <div className={[styles.clearfix]}>
                        <div className={c_styles.col}>
                            <a href="/lobby/"> <img src={backgammon} /></a>
                        </div>
                        <div className={c_styles.col}>
                            <a href="#"> <img src={chess} /></a>
                        </div>
                        <div className={c_styles.col}>
                            <a href="poker"> <img src={poker} /></a>
                        </div>
                        <div className={c_styles.col}>
                            <a href="#"><img src={blackjack} /></a>
                        </div>
                        <div className={c_styles.col}>
                            <a href="#"><img src={rulet} /></a>
                        </div>
                        <div className={c_styles.col}>
                            <a href="#"><img src={slot} /></a>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }
}

export default GameMenu;
//GameMenu.propTypes = {
  //children: PropTypes.object.isRequired,
  //dispatch: PropTypes.func.isRequired,
  //intl: PropTypes.object.isRequired,
//};

//export default connect(mapStateToProps)(App);
