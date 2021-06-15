/**
 * Root Component
 */
import React from 'react';
import { Provider } from 'react-redux';
import { Router, Route } from 'react-router';

// Import Routes
//import routes from './routes';
import GameMenu from './modules/GameMenu/GameMenu';
// Base stylesheet
require('./main.css');

export default function App(props) {
  return (
      <Router>
        <Route path="/" component={GameMenu}/>
      </Router>
  );
}

//App.propTypes = {
//  store: React.PropTypes.object.isRequired,
//};
