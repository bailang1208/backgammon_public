/**
 * Client entry point
 */
import React from 'react';
import { render } from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import { Router, Route } from 'react-router';
import GameMenu from './modules/GameMenu/GameMenu';
import Lobby from './modules/backgammon/Lobby';

require('./main.css');
// Initialize store
//const store = configureStore(window.__INITIAL_STATE__);
const mountApp = document.getElementById('root');

render(
    <Router>
        <Route path="/" exact component={Lobby} />
        <Route path="/lobby/" component={Lobby} />
    </Router>,
  mountApp
);
