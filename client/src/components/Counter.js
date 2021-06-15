import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import Value from './Value';
import Control from './Control';
import * as actions from '../actions';

const propTypes = {

};


class Counter extends Component {
  render() {

    const color = this.props.color;

    const style = {
      background: `rgb(${color[0]},${color[1]},${color[2]})`
    }

    return (
      <div style={style}>
        <Value number={this.props.number} />
        <Control
          onPlus = {this.props.handleIncrement}
          onSubstract = {this.props.handleDecrement}
          onRandomizeColor = { this.props.handleSetColor}/>
      </div>
    );
  }
}


Counter.propTypes = propTypes;


const mapStateToProps = (state) => {
  return {
    number: state.counter.number,
    color: state.ui.color,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    handleIncrement: () => { dispatch(actions.increment())},
    handleDecrement: () => {dispatch(actions.decrement())},
    handleSetColor: (color) => { dispatch(actions.setColor(color))}
  }
}



export default connect(mapStateToProps, mapDispatchToProps)(Counter);
