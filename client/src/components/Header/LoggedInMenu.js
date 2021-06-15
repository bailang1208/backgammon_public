import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { log_out} from '../../actions/users'


class LoggedInMenu extends Component {
  onLogout = () => {
    this.props.log_out();
  }
  style = {
    cursor: 'pointer'
  }
  render() {
    return (
      <ul className="navbar-nav mr-auto" style={this.style}>
        <li className="nav-item active">
          <a className="nav-link" data-toggle="modal" data-target="#loginModal">{this.props.lnPack.setting}</a>
        </li>
        <li className="nav-item active">
          <a className="nav-link" data-toggle="modal" data-target="#loginModal">{this.props.lnPack.wallet}</a>
        </li>
        <li className="nav-item active">
          <a className="nav-link" onClick={this.onLogout}>{this.props.lnPack.logout}</a>
        </li>
      </ul>
    );
  }
}

const propTypes = {
  log_out: PropTypes.func.isRequired,
};
LoggedInMenu.propTypes = propTypes;

const mapStateToProps = (state) => {
  return {
    lnPack: state.polyglot.phrases
  }
}

export default connect(mapStateToProps, {log_out})(LoggedInMenu);
