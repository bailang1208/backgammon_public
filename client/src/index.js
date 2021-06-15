import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import {Provider} from 'react-redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { setLanguage } from 'redux-polyglot';

import reducers from './reducers';
import * as actions from './actions';

import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import { userLoggedIn } from './actions/users';


import enLang from './langs/en'
import chLang from './langs/ch'
const store = createStore(
  reducers,
  composeWithDevTools(applyMiddleware(thunk))
);
store.dispatch(setLanguage('en', enLang));


if(localStorage.user){
  store.dispatch(userLoggedIn(JSON.parse(localStorage.user)))
}



ReactDOM.render(
  <Provider store={store}>
    <Router>
      <App />
    </Router>
  </Provider>,
  document.getElementById('root'));
registerServiceWorker();
