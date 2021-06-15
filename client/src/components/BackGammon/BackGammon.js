import React from 'react';
import BackGammonLobby from './BackGammonLobby'
import GameBoard from './GameBoard';
import {Route } from 'react-router-dom'

const BackGammon = () => {
  return (
    <div>
      <Route path='/backgammon' exact component={BackGammonLobby}/>
      <Route path='/backgammon/board' component={GameBoard}/>
    </div>
  );
};

export default BackGammon;
