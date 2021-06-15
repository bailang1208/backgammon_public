import * as types from './ActionTypes';



export function backgammonGotGameId(data){
  return {
    type: types.BACKGAMMON_GOT_GAMEID,
    data: data
  }
}






export const saveBackgammonGameId = data => dispatch => dispatch(backgammonGotGameId(data))
