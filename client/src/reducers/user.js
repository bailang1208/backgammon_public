import * as types from '../actions/ActionTypes';

const initalState = {
  user: null,
  userNum: 0
};
export default function user(state = initalState, action){
  switch(action.type){
    case types.USER_LOGGED_IN:
      return {
        ...state,
        user: action.user
      }
    case types.USER_LOGGED_OUT:
      return {
        ...initalState
      }
    case types.SETTED_TOTAL_USERS:
      return {
        ...state, userNum: action.userNum
      }
    default:
      return state;
  }
}
