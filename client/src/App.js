import React, { Component } from 'react';
import {Route, BrowserRouter, Switch} from 'react-router-dom';
import UserRoute from './routes/UserRoute';
import logo from './logo.svg';
import './App.css';

import Header from './components/Header/Header';
import Home from './components/Home/Home';
import BackGammon from './components/BackGammon/BackGammon'

// import 'bootstrap/dist/css/bootstrap.min.css'
// import 'bootstrap/dist/js/bootstrap.min.js'

class App extends Component {
  render() {
    return (
        <div className="App">
          <Header/>
          <div>
            <Switch>
              <Route path="/" exact component={Home} />
              <UserRoute path="/backgammon" component={BackGammon} />
            </Switch>
          </div>
        </div>
    );
  }
}

export default App;
