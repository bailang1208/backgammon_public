import user from './user';
import backgammon from './backgammon';


import { polyglotReducer } from 'redux-polyglot';
import { combineReducers } from 'redux';


const reducers = combineReducers({
  user,
  backgammon,
  polyglot: polyglotReducer,
})

export default reducers;
