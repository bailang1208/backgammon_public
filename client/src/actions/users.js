import * as types from './ActionTypes';
import api from '../api';

export function userLoggedIn(user){
  return {
    type: types.USER_LOGGED_IN,
    user
  }
}
export function userLoggedOut(user){
  return {
    type: types.USER_LOGGED_OUT,
    user
  }
}

export function settedTotalUsers(userNum){
  return {
    type: types.SETTED_TOTAL_USERS,
    userNum
  }
}





export const log_in = user => dispatch => {
  localStorage.setItem('user', JSON.stringify(user));
  return dispatch(userLoggedIn(user));
}
export const log_out = () => dispatch => {
  localStorage.clear();
  return dispatch(userLoggedOut());
}

export const setTotalUserCount = userNum => dispatch => dispatch(settedTotalUsers(userNum))
