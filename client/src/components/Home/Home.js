import React, { Component } from 'react';
import {Link } from 'react-router-dom';
import PropTypes from 'prop-types';


import Footer from '../Footer/Footer';

import './home.css';
const propTypes = {

};

class Home extends Component {
  render() {
    return (
      <div>
        <div className="home container">
          <div className="row">
            <div className="col-md-4"><Link to="backgammon"><img src="images/backgammon.png" /></Link></div>
            <div className="col-md-4"><img src="images/chess.png" /></div>
            <div className="col-md-4"><img src="images/poker.png" /></div>
          </div>
          <div className="row">
            <div className="col-md-4"><img src="images/blackjack_en.png" /></div>
            <div className="col-md-4"><img src="images/rulet_en.png" /></div>
            <div className="col-md-4"><img src="images/slot_en.png" /></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
}


Home.propTypes = propTypes;


export default Home;
