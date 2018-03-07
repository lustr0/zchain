import React from 'react';
import { render } from 'react-dom';
import injectTapEventPlugin from 'react-tap-event-plugin';

import { Misc, About, Block, Transaction, Account, Blocks, Transactions, Accounts, Statistics, API, Container, Launcher, NotFound } from './base.jsx';
import { parseURL, pathify, queryToTitle, pathToQuery, queryToPath } from './aux.jsx';
import _ from './state.jsx';

injectTapEventPlugin();

require('./styles.css');

_.render = () => {
  var central;
  switch(_.query.type) {
    case 'find':
      const value = _.query.query;
      if (value.length === 35) {
        _.updateQuery(() => { return {type: 'account', id: value}});
      } else if (value.length === 64) {
        if (value.slice(0, 2) === '00') 
          _.updateQuery(() => { return {type: 'block', id: value}});
        else
          _.updateQuery(() => { return {type: 'transaction', id: value}});
      } else {
        _.updateQuery(() => { return {type: '404'}});
      }
      break;
    case 'launcher':
      central = <Launcher />;
      break;
    case 'blocks':
      central = <Blocks />;
      break;
    case 'transactions':
      central = <Transactions />;
      break;
    case 'accounts':
      central = <Accounts />;
      break;
    case 'statistics':
      central = <Statistics page={_.query.page} />;
      break;
    case 'block':
      central = <Block id={_.query.id} />;
      break;
    case 'transaction':
      central = <Transaction id={_.query.id} />;
      break;
    case 'account':
      central = <Account id={_.query.id} />;
      break;
    case 'misc':
      central = <Misc />;
      break;
    case 'api':
      central = <API />;
      break;
    case 'about':
      central = <About />;
      break;
    default:
      central = <NotFound />;
  };
  render(
    <Container>
    {central}
    </Container>,
    document.getElementById('app')
  );
};

const handleURL = () => {
  _.query = pathToQuery(parseURL());  
  document.title = queryToTitle(_.query);
  _.render();
};

const writeURL = (obj) => {
  const path = pathify(obj);
  window.history.pushState({}, '', path);
  handleURL();
};

window.onpopstate = handleURL;

_.updateQuery = (func) => {
  const query = func(_.query);
  writeURL(queryToPath(query));
};

handleURL();

window.prerenderReady = true;

window._ = _;
