import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

const propTypes = {
  number: PropTypes.number
};

class Value extends Component {
  constructor(props){
    super(props);
  }
  render() {
    const { number } = this.props;
    return (
      <div>
        {number}
      </div>
    );
  }
}


Value.propTypes = propTypes;




export default Value;
