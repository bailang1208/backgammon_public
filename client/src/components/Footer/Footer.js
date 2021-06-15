import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './footer.css';
const propTypes = {

};


class Footer extends Component {
  render() {
    return (
      <div className="footer">
      <a href="#" target="_blank"><img src="images/instagram.png" /></a>
      </div>
    );
  }
}


Footer.propTypes = propTypes;


export default Footer;
