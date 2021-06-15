import * as types from '../actions/ActionTypes'

const initialState = {
  gameId: null,
  userId: null,
}

export default function(state = initialState, action) {
  switch(action.type){
    case types.BACKGAMMON_GOT_GAMEID:
      return {
        gameid: action.data.gameId,
        userid: action.data.userId
      };
    default:
      return state;
  }
}
