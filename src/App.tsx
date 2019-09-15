import React, { Component } from 'react';
import './App.scss';
import { BrowserRouter, Route } from "react-router-dom"
import { observer } from "mobx-react"
import Generator from './Generator';
import Validator from './Validator';

@observer
class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <Route path="/" exact component={Generator} />
        <Route path="/validator" component={Validator} />
      </BrowserRouter>
    );
  }
}

export default App;
