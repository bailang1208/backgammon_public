import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Validator from 'validator';
import { connect} from 'react-redux';
import { log_in, log_out } from '../../actions/users';

import api from '../../api';

const $ = window.jQuery;
class DefaultMenu extends Component {
  state = {
    data: {
      email: '',
      password: '',
      username: '',
      passwordAgain: '',
      firstName: '',
      lastName: '',
    },
    loading: false,
    errors: {}
  }

  onChange = e =>{
    this.setState({
      data: {...this.state.data, [e.target.name]: e.target.value}
    });
  }

  onLogin = () => {

    const {data} = this.state;
    const errors = {};
    if(!Validator.isEmail(data.email)) errors.email = 'Invalid email'
    if(data.password==='') errors.password = 'Can not be blank'

    this.setState({errors: errors});
    if(Object.keys(errors).length > 0) return;

    api.user.login({
      username: this.state.data.email,
      password: this.state.data.password
    }).then(res => {
      $('#loginModal').modal('hide');
      this.props.log_in(res);
    })
    .catch(err => this.setState({
      errors:{global: err.response.data.message},
      loading: false
    }));
  }
  onSignUp = () => {
    const {data} = this.state;
    const errors = {};
    if(data.firstName==='') errors.firstName = 'Can not be blank'
    if(data.lastName==='') errors.lastName = 'Can not be blank'
    if(!Validator.isEmail(data.email)) errors.email = 'Invalid email'
    if(data.password==='') errors.password = 'Can not be blank'
    if(data.passwordAgain==='') errors.passwordAgain = 'Can not be blank'
    if(data.password !== data.passwordAgain) errors.passwordAgain = 'Passwords are mismatch'
    if(data.username==='') errors.username='Can not be blank'

    this.setState({errors: errors});
    if(Object.keys(errors).length > 0) return;

    api.user.signup({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      username: data.username,
      password: data.password,
    }).then(res => {
      $('#SignupModal').modal('hide');
    })
    .catch(err => this.setState({
      errors:{global: err.response.data.message},
      loading: false
    }));
  }

  render() {
    const { data, errors } = this.state;

    const style = {
      cursor: 'pointer'
    };
    return (
      <ul className="navbar-nav mr-auto">
        <li className="nav-item active" style={style}>
          <a className="nav-link" data-toggle="modal" data-target="#loginModal">{this.props.lnPack.login}</a>

          <div className="modal fade" id="loginModal" tabIndex="-1" role="dialog" aria-labelledby="loginModalLabel" aria-hidden="true">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="loginModalLabel">{this.props.lnPack.login}</h5>
                </div>
                <div className="modal-body">
                  <form>
                    <div className="form-group">
                      <label htmlFor="exampleInputEmail1">Email address</label>
                      <input type="email" className="form-control" name="email"   aria-describedby="emailHelp" placeholder="Enter email" value={data.email} onChange={this.onChange} />
                      {errors.email && <small id="emailHelp" className="form-text text-danger">{errors.email}</small> }
                    </div>
                    <div className="form-group">
                      <label htmlFor="exampleInputPassword1">Password</label>
                      <input type="password" className="form-control" id="exampleInputPassword1" name="password" placeholder="Password" value={data.password} onChange={this.onChange} />
                      {errors.password && <small id="emailHelp" className="form-text text-danger">{errors.password}</small> }
                    </div>
                    {/* <div className="form-check">
                      <label className="form-check-label">
                        <input type="checkbox" className="form-check-input" />
                        Save me
                      </label>
                    </div> */}
                  </form>
                </div>
                <div className="modal-footer">
                  {errors.global && <small id="emailHelp" className="form-text text-danger">{errors.global}</small> }
                  <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                  <button type="button" className="btn btn-primary" onClick={this.onLogin}>Log In</button>
                </div>
              </div>
            </div>
          </div>
        </li>
        <li className="nav-item">
          <a className="nav-link"  data-toggle="modal" data-target="#SignupModal">{this.props.lnPack.join}</a>
          <div className="modal fade" id="SignupModal" tabIndex ="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="exampleModalLabel">Sign Up</h5>
                </div>
                <div className="modal-body">
                  <form>
                    <div className="form-group">
                      <input type="text" className="form-control" name="firstName" aria-describedby="emailHelp" placeholder="First Name" value={data.firstName} onChange={this.onChange}/>
                      {errors.firstName && <small id="emailHelp" className="form-text text-danger">{errors.firstName}</small> }
                    </div>
                    <div className="form-group">
                      <input type="text" className="form-control" name="lastName" aria-describedby="emailHelp" placeholder="Last Name" value={data.lastName} onChange={this.onChange}/>
                      {errors.lastName && <small id="emailHelp" className="form-text text-danger">{errors.lastName}</small> }
                    </div>
                    <div className="form-group">
                      <input type="email" className="form-control" name="email" aria-describedby="emailHelp" placeholder="Email" value={data.email} onChange={this.onChange}/>
                      {errors.email && <small id="emailHelp" className="form-text text-danger">{errors.email}</small> }
                    </div>
                    <div className="form-group">
                      <input type="text" className="form-control" name="username" aria-describedby="emailHelp" placeholder="User Name" value={data.username} onChange={this.onChange} />
                      {errors.username && <small id="emailHelp" className="form-text text-danger">{errors.username}</small> }
                    </div>
                    <div className="form-group">
                      <input type="password" className="form-control" name="password" placeholder="Password" value={data.password} onChange={this.onChange} />
                      {errors.password && <small id="emailHelp" className="form-text text-danger">{errors.password}</small> }
                    </div>
                    <div className="form-group">
                      <input type="password" className="form-control" name="passwordAgain" placeholder="Password Again" value={data.passwordAgain} onChange = {this.onChange} />
                      {errors.passwordAgain && <small id="emailHelp" className="form-text text-danger">{errors.passwordAgain}</small> }
                    </div>
                    {/* <div className="form-check">
                      <label className="form-check-label">
                        <input type="checkbox" className="form-check-input" />
                        Check me out
                      </label>
                    </div> */}
                  </form>
                </div>
                <div className="modal-footer">
                  {errors.global && <small id="emailHelp" className="form-text text-danger">{errors.global}</small> }
                  <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                  <button type="button" className="btn btn-primary" onClick={this.onSignUp}>Sign Up</button>
                </div>
              </div>
            </div>
          </div>
        </li>
      </ul>
    );
  }
}

DefaultMenu.propTypes = {
  log_in: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => {
  return {
    lnPack: state.polyglot.phrases
  }
}

export default connect(mapStateToProps, {log_in})(DefaultMenu);
