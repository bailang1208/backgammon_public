import React, { Component } from 'react';
import PropTypes from 'prop-types';

class Control extends Component {

  setRandomColor = () => {
    const color = [
      Math.floor((Math.random()*55) + 200),
      Math.floor((Math.random()*55) + 200),
      Math.floor((Math.random()*55) + 200),
    ]

    this.props.onRandomizeColor(color);

  }
  render() {
    return (
      <div>
        <button onClick={this.props.onPlus}>+</button>
        <button onClick={this.props.onSubstract}>-</button>
        <button onClick={this.setRandomColor}>set color</button>
      </div>
    );
  }
}

Control.propTypes = {
  onPlus: PropTypes.func,
  onSubstract: PropTypes.func,
  onRandomizeColor: PropTypes.func,
};

export default Control;
