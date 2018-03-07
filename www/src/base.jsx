import React from 'react';
import ReactDOM from 'react-dom';
import { Tabs, Tab, Label, ControlLabel, Pagination, Table, Grid, Row, Col, Panel, Nav, Button, NavItem, FormGroup, FormControl, Navbar } from 'react-bootstrap';
import equal from 'deep-equal';
import deepcopy from 'deepcopy';
import ReactTooltip from 'react-tooltip';
import $ from 'jquery';
import { Line, Pie } from 'react-chartjs-2';

import { capitalize, dateSince, datePrint, datePrintShort, pathify, queryToPath } from './aux.jsx';
import _ from './state.jsx';

const timeStr   = t => datePrint(new Date(t * 1000), _.config.timezone);
const timeStr2  = t => datePrintShort(new Date(t * 1000), _.config.timezone);
const timeSince = t => dateSince(new Date(t * 1000), _.config.timezone);

import MobileDetect from 'mobile-detect';

const mobile = new MobileDetect(window.navigator.userAgent).mobile() ? true : false;

const currency = 'ZEC';

const pools = {
  't1XepX38RxS3o5hLioLbaNb6Fa2Y2Be55xw': 'Flypool (old)',
  't3Xt4oQMRPagwbpQqkgAViQgtST4VoSWR6S': 'Slushpool',
  't1ZJQNuop1oytQ7ow4Kq8o9if3astavba5W': 'Flypool',
  't1aZvxRLCGVeMPFXvqfnBgHVEbi4c6g8MVa': 'F2Pool',
  't1SaATQbzURpG1qU3vz9Wfn3pwXoTqFtTq2': 'Suprnova',
  't1ZW8mX1UR2YQXafSxriuK2Bz1wxqzskGQq': 'Nicehash',
  't1emzuNbemjqnEhEue74NL3BxsR4cA1ajfP': 'Nanopool',
  't1KHa9CJeCy3b9rUX2BhqkFJXSxSSrhM7LJ': 'Coinmine.pl',
  't1SmBjm4WnDrrjPyUFSuJQTeEs1TGeWyHJx': 'Waterhole',
  't1MGLc3pb6j6hGXe8YBZaoZBEShJysaWk3b': 'BitClub Pool',
  't1bCmsYsBx4tU8ND8LjWECkyhxY17Huinw1': 'MiningPoolHub',
  't1TpMVK8PUS5xqgb9dYrmmt9D3j2b9j58Zm': 'MinerGate',
  't1hASvMj8e6TXWryuB3L5TKXJB7XfNioZP3': 'Nanopool',
  't1KstPVzcNEK4ZeauQ6cogoqxQBMDSiRnGr': 'Coinmine.pl',
  't1WrgmW1uYpxsr2Pr4W8DnDV8ppfaKjNZaH': 'Dwarfpool',
  't1h6uX3zAvA8DGkxvizULntja7RS7hZUFYp': 'Zecmine.pro',
  't1Xk6GeseeV8FSDpgr359yL2LmaRtUdWgaq': 'Coinotron',
  't1Tqy2u2qgTdcVf7TRxC2KGrxwcuzfdgnSf': 'Coinotron',
  't1VpYecBW4UudbGcy4ufh61eWxQCoFaUrPs': 'Flypool',
  't1PbYh7TRXigqcdXYC1YHJS3KSBR9Yeso9W': 'SlushPool'
};


class Link extends React.Component {
  constructor(props) {
    super(props)
    this.onClick = this.onClick.bind(this)
  }

  onClick(e) {
    e.preventDefault();
    _.updateQuery(this.props.to);
  }

  render() {
    const href = pathify(queryToPath(this.props.to(deepcopy(_.query))));
    return (
      <a href={href} onClick={this.onClick} style={this.props.style || {}} >
        {this.props.children}
      </a>
    );
  }
}

class Header extends React.Component {
  constructor(props) {
    super(props)
    this.state = {tooltip: ''};
    this.handleKeyPress = this.handleKeyPress.bind(this)
    this.handleSearch = this.handleSearch.bind(this)
  }

  handleKeyPress(evt) {
    if (evt.nativeEvent.keyCode === 13) this.handleSearch();
  }

  handleSearch(evt) {
    const value = ReactDOM.findDOMNode(this.refs.search).value;
    var intVal = 0;
    try { intVal = parseInt(value); } catch(err) {}
    if (value.length === 35) {
      this.setState({tooltip: ''}, () => _.tooltip.hideTooltip({currentTarget: ReactDOM.findDOMNode(this.refs.search)}));
      _.updateQuery(() => { return {type: 'account', id: value}});
    } else if (value.length === 64) {
      this.setState({tooltip: ''}, () => _.tooltip.hideTooltip({currentTarget: ReactDOM.findDOMNode(this.refs.search)}));
      if (value.slice(0, 2) === '00') 
        _.updateQuery(() => { return {type: 'block', id: value}});
      else {
        _.updateQuery(() => { return {type: 'transaction', id: value}});
      }
    } else if (intVal != 0) {
      _.updateQuery(() => { return {type: 'block', id: value}});
    } else {
      this.setState({tooltip: 'Please enter a valid block hash, transaction hash, or account address'}, () => 
        _.tooltip.showTooltip({currentTarget: ReactDOM.findDOMNode(this.refs.search)}));
    }
  }

  render() {
    const style = {
      background: '#000',
      border: 'none',
    };
    const titleStyle = {
      color: '#fff',
      fontSize: '24px',
      marginRight: '30px',
      marginLeft: '20px',
      lineHeight: '50px'
    };
    const itemStyle = {
      color: '#fff'
    };
    return (
      <Navbar style={style} >
        <Navbar.Header>
          <Navbar.Brand>
            <Link to={() => { return {type: 'launcher'}}} style={titleStyle}>ZCHAIN</Link>
          </Navbar.Brand>
          <Navbar.Toggle />
        </Navbar.Header>
        <Navbar.Collapse>
          <Nav>
            <NavItem eventKey={1}><Link to={() => { return {type: 'blocks'}}} style={itemStyle}>Blocks</Link></NavItem>
            <NavItem eventKey={2}><Link to={() => { return {type: 'transactions'}}} style={itemStyle}>Transactions</Link></NavItem>
            <NavItem eventKey={3}><Link to={() => { return {type: 'accounts'}}} style={itemStyle}>Accounts</Link></NavItem>
            <NavItem eventKey={4}><Link to={() => { return {type: 'statistics', page: 'network', params: {}}}} style={itemStyle}>Statistics</Link></NavItem>
            <NavItem eventKey={5}><a onClick={() => { window.location.href = '/network'; }} href={'/network'} style={itemStyle}>Network</a></NavItem>
            <NavItem eventKey={6}><Link to={() => { return {type: 'misc'}}} style={itemStyle}>Misc</Link></NavItem>
            <NavItem eventKey={7}><Link to={() => { return {type: 'api'}}} style={itemStyle}>API</Link></NavItem>
            <NavItem eventKey={8}><Link to={() => { return {type: 'about'}}} style={itemStyle}>About</Link></NavItem>
          </Nav>
          <Nav pullRight>
            <Navbar.Form>
              <FormGroup>
                <FormControl data-tip={this.state.tooltip} type="text" ref={'search'} placeholder="Enter hash or address" onKeyPress={this.handleKeyPress} />
              </FormGroup>
              {' '}
              <Button type="submit" onClick={this.handleSearch}>Search</Button>
            </Navbar.Form>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    );
  }
}

class BlockTable extends React.Component {
  constructor(props) {
    super(props)
    this.state  = {blocks: []};
    this.update = this.update.bind(this);
  }

  componentDidMount() {
    this.update();
  }

  update() {
    _.http({path: 'blocks', params: {limit: 5, offset: 0, sort: 'height', direction: 'descending'}, callback: x => this.setState({blocks: x})});
  }

  render() {
    const headers = ['Height', 'Age', 'Txns', 'Size', 'Miner'];
    const divStyle = {marginTop: '10px'};
    const titleStyle = {textAlign: 'center', width: '100%', lineHeight: '40px', fontSize: '20px'};
    return (
      <div style={divStyle} >
        <h1 style={titleStyle}>Recent Blocks</h1>
        <Table>
          <thead>
            <tr>{headers.map(x => <th key={x} >{x}</th>)}</tr>
          </thead>
          <tbody>
            {this.state.blocks.map(b => <tr key={b.hash}><td><Link to={() => { return {type: 'block', id: b.hash}}}>{b.height}</Link></td>
              <td>{timeSince(b.timestamp)}</td><td>{b.transactions}</td><td>{b.size + ' B'}</td>
              <td>{<Link to={() => { return {type: 'account', id: b.miner}}}>{(b.miner ? (pools[b.miner] ? pools[b.miner] : b.miner.slice(0, 20) + '...') : '<undefined>')}</Link>}</td></tr>)}
          </tbody>
        </Table>
      </div>
    );
  }
}

class TransactionsTable extends React.Component {
  constructor(props) {
    super(props)
    this.state  = {transactions: []};
    this.update = this.update.bind(this);
  }

  componentDidMount() {
    this.update();
  }

  update() {
    _.http({path: 'transactions', params: {limit: 5, offset: 0, sort: 'blockHeight', direction: 'descending'}, callback: x => this.setState({transactions: x})});
  }

  render() {
    const headers = ['Hash', 'Type', 'Age', 'Shielded', 'Transparent'];
    const divStyle = {marginTop: '10px'};
    const titleStyle = {textAlign: 'center', width: '100%', lineHeight: '40px', fontSize: '20px'};
    return (
      <div style={divStyle} >
        <h1 style={titleStyle}>Recent Transactions</h1>
        <Table>
          <thead>
            <tr>{headers.map(x => <th key={x}>{x}</th>)}</tr>
          </thead>
          <tbody>
            {this.state.transactions.map(t => <tr key={t.hash}><td><Link to={() => { return {type: 'transaction', id: t.hash}}}>{t.hash.slice(0, 10) + '...'}</Link></td>
              <td>{capitalize(t.type)}</td><td>{timeSince(t.timestamp)}</td><td>{(t.vjoinsplit.length === 0 ? '0' : '≥ ' + t.shieldedValue) + ' ' + currency}</td><td>{t.value + ' ' + currency}</td></tr>)}
          </tbody>
        </Table>
      </div>
    );
  }
}

class AccountsTable extends React.Component {
  constructor(props) {
    super(props)
    this.state  = {accounts: []};
    this.update = this.update.bind(this);
  }

  componentDidMount() {
    this.update();
  }

  update() {
    _.http({path: 'accounts', params: {limit: 5, offset: 0, sort: 'lastSeen', direction: 'descending'}, callback: x => this.setState({accounts: x})});
  }

  render() {
    const headers = ['Address', 'Last Seen', 'Sent', 'Recv'];
    const divStyle = {marginTop: '10px'};
    const titleStyle = {textAlign: 'center', width: '100%', lineHeight: '40px', fontSize: '20px'};
    return (
      <div style={divStyle} >
        <h1 style={titleStyle}>Recent Accounts</h1>
        <Table>
          <thead>
            <tr>{headers.map(x => <th key={x}>{x}</th>)}</tr>
          </thead>
          <tbody>
            {this.state.accounts.map(a => <tr key={a.address}><td><Link to={() => { return {type: 'account', id: a.address}}}>{pools[a.address] ? pools[a.address] : a.address.slice(0, 15) + '...'}</Link></td>
              <td>{timeSince(a.lastSeen)}</td><td>{a.sentCount}</td><td>{a.recvCount}</td></tr>)}
          </tbody>
        </Table>
      </div>
    );
  }
}

class NewsTable extends React.Component {
  constructor(props) {
    super(props)
    this.state  = {news: []};
    this.update = this.update.bind(this);
  }

  componentDidMount() {
    this.update();
  }

  update() {
    _.http({path: 'news', params: {limit: 5, offset: 0, sort: 'timestamp', direction: 'descending'}, callback: x => this.setState({news: x})});
  }

  render() {
    const headers = ['Title', 'Age', 'Source'];
    const divStyle = {marginTop: '10px'};
    const titleStyle = {textAlign: 'center', width: '100%', lineHeight: '40px', fontSize: '20px'};
    return (
      <div style={divStyle} >
        <h1 style={titleStyle}>Recent News</h1>
        <Table>
          <thead>
            <tr>{headers.map(x => <th key={x} style={{minWidth: '70px'}}>{x}</th>)}</tr>
          </thead>
          <tbody>
            {this.state.news.map(n => <tr key={n.hash}><td><a href={n.link} target='_blank'>{n.title}</a></td>
              <td>{timeSince(n.timestamp)}</td><td>{n.source}</td></tr>)}
          </tbody>
        </Table>
      </div>
    );
  }
}

class Panels extends React.Component {
  constructor(props) {
    super(props)
    this.state = {price: undefined, marketCap: undefined};
  }

  componentDidMount() {
    setTimeout(() => {
      $.ajax({url: 'https://min-api.cryptocompare.com/data/price?fsym=ZEC&tsyms=BTC,USD,EUR', method: 'GET', success: val => {
        this.setState({price: '$' + Math.round(val.USD * 100) / 100, marketCap: '$' + (Math.round(val.USD * _.network.totalAmount * 100) / 100)});
      }});
    }, 100);
  }

  render() {
    const values = [
      {name: 'Chain Height', color: '#337ab7', value: _.network.blockNumber, tip: 'Main Chain Height (block count)'},
      {name: <span>Network Hashrate <a href="https://forum.z.cash/t/difference-between-hashes-vs-solutions/2930/5" style={{color: '#fff', opacity: 0.5}}>?</a></span>, color: '#5cb85c', value: (_.network.hashrate || 0) + ' Sol/s', tip: 'Network Hashrate (mean over past 120 blocks)'},
      {name: 'Difficulty', color: '#aa66cc', value: (Math.round(_.network.difficulty * 100) / 100 || 0), tip: 'Current Difficulty'},
      {name: 'Block Time', color: '#5bc0de', value: (Math.round(_.network.meanBlockTime * 100) / 100 || 0) + 's', tip: 'Block Time (mean over past 120 blocks)'},
      {name: 'Price', color: '#d9534f', value: <a href={'https://cryptocompare.com/coins/zec/overview/USD'} style={{color: '#000'}}>{this.state.price ? this.state.price : '...'}</a>, tip: 'Latest USD/' + currency + ' Exchange Rate'},
      {name: 'Total Monetary Base', color: '#000000', value: Math.round((_.network.totalAmount * 100) / 100) + ' ' + currency, tip: 'Total Monetary Base (ZCash in circulation)'},
      {name: 'Market Cap', color: '#f0ad4e', value: this.state.marketCap ? this.state.marketCap : '...', tip: 'Market Cap in USD (exchange rate * amount in circulation)'},
      {name: 'Transactions', color: '#555', value: (_.network.transactions || 0), tip: 'All-Time Transaction Count'}
    ];
    return (
      <Grid>
        <Row className="show-grid">{values.map(v => <Col data-tip={v.tip} key={v.name} xs={6} md={3}><div
          style={{border: '2px solid ' + v.color, margin: '5px'}}><div style={{padding: '10px', textAlign: 'center', fontSize: '18px'}}>{v.value}</div>
          <div style={{color: '#fff', background: v.color, padding: '10px', textAlign: 'center'}}>{v.name}</div></div></Col>)}</Row>
      </Grid>
    );
  }
}

class AdvancedPanels extends React.Component {
  constructor(props) {
    super(props)
    this.state = {};
  }

  componentDidMount() {
    ReactTooltip.rebuild()
  }

  render() {
    const reward = Math.round(100000 * Math.min(12.5, _.network.blockNumber * 0.000625)) / 100000;
    const values = [
      {name: 'Known Accounts', color: '#333', value: _.network.accounts, tip: 'All-Time Seen Accounts'},
      {name: 'Block Reward', color: '#ffbb11', value: reward + ' ' + currency, tip: 'Current Total Block Reward'},
      {name: 'Block Miner\'s Reward', color: '#aa66cc', value: (Math.round(100000 * 0.8 * reward) / 100000) + ' ' + currency, tip: 'Current Miner\'s Block Reward (80%)'},
      {name: 'Block Founder\'s Reward', color: '#5bc0de', value: (Math.round(100000 * 0.2 * reward) / 100000) + ' ' + currency, tip: 'Current Founder\'s Block Reward (20%)'},
      {name: 'Cumulative Miner\'s Reward', color: '#f0ad4e', value: (Math.round(100000 * 0.8 * _.network.totalAmount) / 100000) + ' ' + currency, tip: 'Cumulative Miner\'s Reward, All-Time'},
      {name: 'Cumulative Founder\'s Reward', color: '#777', value: (Math.round(100000 * 0.2 * _.network.totalAmount) / 100000) + ' ' + currency, tip: 'Cumulative Founder\'s Reward, All-Time'},
      {name: 'Transparent Value (Unspent TX)', color: '#5cb85c', value: Math.round(100000 * _.stats.valueShieldedSplit.public) / 100000 + ' ' + currency, tip: 'Total Transparent Value (Zcash in unspent transparent transaction outputs)'},
      {name: 'Transparent Value (Unspent Block Rewards)', color: '#4285F4', value: Math.round(100000 * _.stats.valueShieldedSplit.coinbase) / 100000 + ' ' + currency, tip: 'Total Transparent Block Reward Value (Zcash in unspent block rewards)'},
      {name: 'Shielded Value', color: '#d9534f', value: Math.round(100000 * _.stats.valueShieldedSplit.shielded) / 100000 + ' ' + currency, tip: 'Total Shielded Value (Zcash in z-addresses)'},
      {name: 'Shielded Transaction Percentage', color: '#6d4c41', value: Math.round(100000 * _.stats.transactionKindSplit.shielded / _.stats.transactionKindSplit.total) / 1000 + ' %', tip: 'Percentage of Transactions Involving Shielded ZEC (transactions including at least one JoinSplit)'},
      {name: 'Shielded Volume Percentage', color: '#90a4ae', value: '≥ ' + Math.round(100000 * _.stats.transactionVolumeSplit.shielded / _.stats.transactionVolumeSplit.transparent) / 1000 + ' %', tip: 'Ratio between [ total volume of shielded ZEC deduced from transactions ] and [ total volume of transparent ZEC visible in transactions ]. This is a lower bound, because shielded ZEC flow can be deduced only when converted to/from transparent ZEC.'}
    ];
    const style = {fontSize: '14px', lineHeight: '18px'};
    return (
      <Grid>
        <Row className="show-grid" style={style}>{values.map(v => <Col data-tip={v.tip} key={v.name} xs={6} md={4}><div
          style={{border: '2px solid ' + v.color, margin: '5px'}}><div style={{padding: '10px', textAlign: 'center', fontSize: '18px'}}>{v.value}</div>
          <div style={{color: '#fff', background: v.color, padding: '10px', textAlign: 'center'}}>{v.name}</div></div></Col>)}</Row>
      </Grid>
    );
  }
}

export class GenericTable extends React.Component {
  constructor(props) {
    super(props)
    this.state  = {sort: props.defaultSort, direction: 'descending', limit: 20, offset: 0, results: [], page: 1};
    this.update = this.update.bind(this);
    this.handlePage = this.handlePage.bind(this);
    this.handleSort = this.handleSort.bind(this);
    this.handleDirection = this.handleDirection.bind(this);
  }

  handlePage(page) {
    this.setState({page: page, offset: (page - 1) * 20}, () => this.update());
  }

  handleSort(sort) {
    this.setState({sort: sort}, () => this.update());
  }

  handleDirection(direction) {
    this.setState({direction: direction}, () => this.update());
  }

  componentDidMount() {
    this.update();
  }
  
  update() {
    _.http({path: this.props.path, params: {limit: this.state.limit, offset: this.state.offset, sort: this.state.sort, direction: this.state.direction}, callback: x => this.setState({results: x})});
  }

  render() {
    const sorts = this.props.sorts;
    const headers = this.props.headers;
    const directions = ['descending', 'ascending'];
    const maxHeight = window.innerHeight - 80 + 'px';
    const style = {maxHeight: maxHeight, overflowY: 'auto'};
    const divStyle = {marginTop: '10px'};
    const titleStyle = {textAlign: 'left', width: '100%', lineHeight: '34px', fontSize: '20px', margin: '0px'};
    const pageStyle = {float: 'right', position: 'relative', lineHeight: '20px'};
    const formStyle = {};
    const rowStyle = {marginBottom: '10px'};
    const spanStyle = {marginRight: '10px'};
    return (
      <div style={style}>
      <div style={divStyle}>
        <Grid>
        <Row style={rowStyle}>
          <Col xs={12} md={3}><h1 style={titleStyle}>{'Browse ' + this.props.title}</h1></Col>
          <Col xs={6} md={2}>
            <FormGroup style={formStyle} >
              <FormControl componentClass="select" placeholder="Sort" onChange={e => this.handleSort(e.target.value)}>
                {sorts.map(s => <option value={s}>{capitalize(s)}</option>)}
              </FormControl>
            </FormGroup>
          </Col>
          <Col xs={6} md={2}>
            <FormGroup style={formStyle} >
              <FormControl componentClass="select" placeholder="Direction" onChange={e => this.handleDirection(e.target.value)}>
                {directions.map(s => <option value={s}>{capitalize(s)}</option>)}
              </FormControl>
            </FormGroup>
          </Col>
          <Col xs={12} md={5}>
            <div style={pageStyle}>
              <Pagination prev next first last ellipsis boundaryLinks items={Math.ceil(this.props.count / 20)} maxButtons={5} activePage={this.state.page}
                onSelect={this.handlePage} style={{margin: '0px'}} />
            </div>
          </Col>
        </Row>
        <Row><Col xs={12} md={12}>
        <Table>
          <thead>
            <tr>{headers.map(x => <th key={x}>{x}</th>)}</tr>
          </thead>
          <tbody>
            {this.state.results.map(this.props.rowFunc)}
          </tbody>
        </Table>
        </Col></Row>
        </Grid>
      </div>
      </div>
    );
  }
}

export const Blocks = () => <GenericTable defaultSort='height' title='Blocks' sorts={['height', 'timestamp', 'time', 'difficulty', 'transactions']} 
    path={'blocks'} headers={['Height', 'Hash', 'Timestamp', 'Transactions', 'Size', 'Miner']}
    count={(_.network.blockNumber || 0)}
    rowFunc={b => <tr key={b.hash}><td>{b.height}</td><td><Link to={() => { return {type: 'block', id: b.hash}}}>{b.hash.slice(0, 30) + '...'}</Link></td>
      <td>{timeStr2(b.timestamp)}</td><td>{b.transactions}</td><td>{b.size + ' B'}</td>
      <td>{<Link to={() => { return {type: 'account', id: b.miner}}}>{pools[b.miner] ? pools[b.miner] : b.miner}</Link>}</td></tr>} />;

export const Transactions = () => <GenericTable defaultSort='blockHeight' title='Transactions' sorts={['blockHeight', 'timestamp', 'value', 'shieldedValue']}
    path={'transactions'} headers={['Hash', 'Timestamp', 'Block', 'Type', 'Shielded Value', 'Transparent Value']}
    count={_.network.transactions || 0}
    rowFunc={t => <tr key={t.hash}><td style={{maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
      <Link to={() => { return {type: 'transaction', id: t.hash}}}>{t.hash}</Link></td>
      <td>{timeStr2(t.timestamp)}</td><td><Link to={() => { return {type: 'block', id: t.blockHash}}}>{t.blockHeight}</Link></td>
      <td>{capitalize(t.type)}</td><td>{t.vjoinsplit.length === 0 ? '0' : '≥ ' + t.shieldedValue}</td><td>{t.value}</td></tr>} />;

export const Accounts = () => <GenericTable defaultSort='lastSeen' title='Accounts' sorts={['lastSeen']}
    path={'accounts'} headers={['Address', 'Last Seen', 'First Seen', 'Sent', 'Recv']}
    count={_.network.accounts || 0}
    rowFunc={a => <tr key={a.address}><td><Link to={() => { return {type: 'account', id: a.address}}}>{pools[a.address] ? pools[a.address] : a.address}</Link></td>
      <td>{timeStr2(a.lastSeen)}</td><td>{timeStr2(a.firstSeen)}</td><td>{a.sentCount}</td><td>{a.recvCount}</td></tr>} />;

export class InlineJoinSplit extends React.Component {
  render() {
    const val = this.props.val;
    const style = {padding: '10px', width: '100%', textAlign: 'center'};
    const innerStyle = {background: '#eee', paddingLeft: '10px', paddingRight: '10px', paddingTop: '40px', paddingBottom: '5px', margin: '0 auto',
                        overflow: 'hidden', textOverflow: 'ellipsis'};
    const leftStyle = {marginRight: '10px', whiteSpace: 'nowrap', display: 'inline-block'};
    const centerStyle = {lineHeight: '30px', marginRight: '10px', marginLeft: '10px', display: 'inline-block'};
    const rightStyle = {marginLeft: '10px', whiteSpace: 'nowrap', display: 'inline-block'};
    const em = {fontStyle: 'italic'};
    return (
      <div style={style}>
        <span style={innerStyle}>
          <span style={leftStyle}>
            <span style={em}>Input</span><br />
            <span>Transparent {val.vpub_old + ' ' + currency}</span><br />
            <span>+ Shielded {'? ' + currency}</span>
          </span>
          <span style={centerStyle}><span>▶<span style={centerStyle}>JoinSplit</span>▶</span><br /></span>
          <span style={rightStyle}>
            <span style={em}>Output</span><br />
            <span>Transparent {val.vpub_new + ' ' + currency}</span><br />
            <span>+ Shielded {'? ' + currency}</span>
          </span>
        </span>
      </div>
    );
  }
}

export class InlineInput extends React.Component {
  render() {
    const val = this.props.val;
    const style = {padding: '10px', width: '100%', textAlign: 'center'};
    const innerStyle = {background: '#eee', paddingLeft: '10px', paddingRight: '10px', paddingTop: '5px', paddingBottom: '5px', margin: '0 auto',
                        overflow: 'hidden', textOverflow: 'ellipsis'};
    const leftStyle = {marginRight: '10px', whiteSpace: 'nowrap', display: 'inline-block'};
    const rightStyle = {marginLeft: '10px', whiteSpace: 'nowrap', display: 'inline-block'};
    return (
      <div style={style} >
        <span style={innerStyle}>{val.coinbase ? 'Newly Generated Coins' : val.retrievedVout === undefined ? <span>{'Unknown  '}<br />{'  ' + val.txid}</span> : (
          <span><span style={leftStyle}>{<Link to={() => { return {type: 'account', id: val.retrievedVout.scriptPubKey.addresses[0]}}}>{' '}
          {val.retrievedVout ? val.retrievedVout.scriptPubKey.addresses[0] : '<unknown>'}</Link>}</span>
          <span style={rightStyle}>{val.retrievedVout.value + ' ' + currency}</span></span>)}</span>
      </div>
    );
  }
}

export class InlineOutput extends React.Component {
  render() {
    const val = this.props.val;
    const style = {padding: '10px', width: '100%', textAlign: 'center'};
    const innerStyle = {background: '#eee', paddingLeft: '10px', paddingRight: '10px', paddingTop: '5px', paddingBottom: '5px', margin: '0 auto',
                        overflow: 'hidden', textOverflow: 'ellipsis'};
    const leftStyle = {marginRight: '10px', whiteSpace: 'nowrap', display: 'inline-block'};
    const rightStyle = {marginLeft: '10px', whiteSpace: 'nowrap', display: 'inline-block'};
    return (
      <div style={style}>
        <span style={innerStyle}>
        {val.scriptPubKey.addresses === undefined ? 'Undecodable' : 
          <span style={leftStyle}>{<Link to={() => { return {type: 'account', id: val.scriptPubKey.addresses[0]}}}>{' '}
          {val.scriptPubKey.addresses[0]}</Link>}</span>}
        <span style={rightStyle}>{val.value + ' ' + currency}</span></span>
      </div>
    );
  }
}

export class InlineTxn extends React.Component {
  componentDidMount() {
    ReactTooltip.rebuild()
  }

  render() {
    const txn = this.props.txn;
    const style = {background: '#fff', borderTop: '2px solid #eee', marginTop: '10px', marginBottom: '10px', paddingTop: '10px', paddingBottom: '10px'};
    const typeStyle = {paddingLeft: '5px', paddingRight: '5px', float: 'right'};
    const centerStyle = {float: 'left', maxWidth: '50%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'};
    const headerStyle = {paddingTop: '10px', width: '100%', lineHeight: '20px', fontSize: '14px', margin: '0px', marginBottom: '10px', marginTop: '0px'};
    const header2Style = {textAlign: 'center', paddingTop: '10px', width: '100%', lineHeight: '20px', fontSize: '14px', margin: '0px', marginBottom: '0px', marginTop: '0px'};
    const bottomStyle = {textAlign: 'right', marginTop: '20px'};
    const bottomSpanStyle = {display: 'inline-block', marginRight: '10px'};
    const bottomLabelStyle = {fontSize: '14px', display: 'inline-block', marginBottom: '5px'};
    return (
      <Row style={style} >
        <Col xs={12} md={12} style={headerStyle}>{<span style={centerStyle}>Txn {<Link to={() => { return {type: 'transaction', id: txn.hash}}}>{txn.hash}</Link>}</span>}
          {txn.type ? <span style={typeStyle}>{<Label style={bottomLabelStyle} bsStyle='default'>{capitalize(txn.type)}</Label>}</span> : ''}</Col>
        {txn.vjoinsplit.length === 0 ? '' : <Col xs={12} md={12}>
          <div style={header2Style}>JoinSplits</div>
          {txn.vjoinsplit.map(j => <InlineJoinSplit key={Math.random()} val={j} />)}
        </Col>}
        <Col xs={12} md={6}>
          <div style={header2Style}>Inputs</div>
          {txn.vin.map(i => <InlineInput key={Math.random()} val={i} />)}
        </Col>
        <Col xs={12} md={6}>
          <div style={header2Style}>Outputs</div>
          {txn.vout.map(o => <InlineOutput key={Math.random()} val={o} />)}
        </Col>
        <Col xs={12} md={12} style={bottomStyle}>
          <span style={bottomSpanStyle}>
            <Label style={bottomLabelStyle} bsStyle='primary' data-tip='Confirmations'>{1 + _.network.blockNumber - txn.blockHeight + ' confirmations'}</Label>{' '}
            {txn.fee === 0 ? '' : <Label data-tip='Fee' bsStyle='warning' style={bottomLabelStyle}>{txn.fee + ' ' + currency}</Label>}{' '}
            {txn.vjoinsplit.length === 0 ? '' : <Label data-tip='Lower Bound on Involved Shielded Value' style={bottomLabelStyle} bsStyle='danger'>{'≥ ' + txn.shieldedValue + ' ' + currency}</Label>}{' '}
            {txn.value === 0 ? '' : <Label data-tip='Involved Transparent Value' style={bottomLabelStyle} bsStyle='success'>{txn.value + ' ' + currency}</Label>}
          </span>
        </Col>
      </Row>
    );
  }
}

export class Block extends React.Component {
  constructor(props) {
    super(props)
    this.state = {transactions: [], offset: 0, loading: true};
    this.update = this.update.bind(this);
    this.fetch  = this.fetch.bind(this);
  }

  componentDidMount() {
    this.setState({id: this.props.id})
    this.update(this.props.id);
  }

  update(id) {
    this.setState({transactions: [], offset: 0, loading: true});
    _.http({path: 'blocks/' + id, callback: x => { 
      this.setState({transactions: [], offset: 0, loading: true, block: x})
      this.fetch(0);
    }, error: () => _.updateQuery(() => { return {type: '404'}})});
  }

  fetch(offset) {
    _.http({path: 'blocks/' + this.props.id + '/transactions', params: {limit: 10, offset: this.state.offset, sort: 'index', direction: 'ascending'}, callback: x => { 
      x.sort((a, b) => a.index > b.index ? 1 : -1);
      this.setState({transactions: this.state.transactions.concat(x), loading: false});
    }});
  }

  componentWillReceiveProps(props) {
    if (props.id != this.props.id) this.update(props.id);
  }

  render() {
    if (!this.state.block) return <div></div>;
    const block = this.state.block;
    const transactions = this.state.transactions;
    const props = [
      {name: 'Height', value: block.height},
      {name: 'Timestamp', value: timeStr(block.timestamp)},
      {name: 'Previous Block', value: block.prevHash ? <Link to={() => { return {type: 'block', id: block.prevHash}}}>{block.height - 1}</Link> : undefined},
      {name: 'Next Block', value: block.nextHash ? <Link to={() => { return {type: 'block', id: block.nextHash}}}>{block.height + 1}</Link> : 'N/A (chain head)'},
      {name: 'Difficulty', value: block.difficulty},
      {name: 'Miner', value: block.miner ? <Link to={() => { return {type: 'account', id: block.miner}}}>{block.miner}</Link> : undefined},
      {name: 'Time', value: block.time ? block.time + ' seconds' : undefined},
      {name: 'Transactions', value: block.transactions},
      {name: 'Size', value: block.size + ' bytes'},
      {name: 'Bits', value: block.bits},
      {name: 'Version', value: block.version},
      {name: 'Nonce', value: block.nonce},
      {name: 'Merkle Root', value: block.merkleRoot},
      {name: 'Solution', value: block.solution}
      ].filter(x => x.value !== undefined);
    const maxHeight = window.innerHeight - 100 + 'px';
    const style = {maxHeight: maxHeight, overflowY: 'auto'};
    const divStyle = {marginTop: '10px', paddingBottom: '70px'};
    const titleStyle = {textAlign: 'center', width: '100%', lineHeight: '34px', fontSize: '20px', margin: '0px'};
    const headerStyle = {textAlign: 'center', width: '100%', lineHeight: '26px', fontSize: '14px', margin: '0px', marginBottom: '20px', marginTop: '30px'};
    const header2Style = {textAlign: 'center', width: '100%', lineHeight: '26px', fontSize: '14px',
                          textOverflow: 'ellipsis', margin: '0px', marginBottom: '0px', marginTop: '10px', overflow: 'hidden'};
    const keyStyle = {fontWeight: 'bold', width: '30%', textAlign: 'right', display: 'inline-block', paddingRight: '10px', overflow: 'hidden'};
    const valStyle = {width: '70%', textAlign: 'left', display: 'inline-block', paddingLeft: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'};
    const colStyle = {marginTop: '2px', marginBottom: '2px'};
    return (
      <div style={style} >
      <div style={divStyle} >
      <Grid>
        <Row>
          <Col xs={12} md={12}><h1 style={titleStyle}>{'Block #' + block.height}</h1></Col>
          <Col xs={12} md={12}><h2 style={header2Style}>{'Hash: ' + block.hash}</h2></Col>
          <Col xs={12} md={12}><h2 style={headerStyle}>{'Summary'}</h2></Col>
          {props.map(p => <Col key={p.name} xs={12} md={6} style={colStyle} ><div style={keyStyle}>{p.name}</div><div style={valStyle}>{p.value}</div></Col>)}
          <Col xs={12} md={12}><h2 style={headerStyle}>{'Transactions'}</h2></Col>
        </Row>
        {transactions.map(t => <InlineTxn key={t.hash} txn={t} />)}
      </Grid>
      {transactions.length == block.transactions ? '' : <div style={{width: '100px', margin: '0 auto'}}><Button onClick={() => {
        this.setState({loading: true, offset: this.state.offset + 10}, () => this.fetch(this.state.offset))
      }} disabled={this.state.loading}>Load More</Button></div>}
      </div>
      </div>
    );
  }
}

export class Account extends React.Component {
  constructor(props) {
    super(props)
    this.state = {recv: [], sent: [], offset: 0, loading: true};
    this.update = this.update.bind(this);
    this.fetch  = this.fetch.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return !equal(this.props, nextProps) || !equal(this.state, nextState);
  }

  componentDidMount() {
    this.setState({id: this.props.id})
    this.update(this.props.id);
  }

  update(id) {
    this.setState({recv: [], sent: [], offset: 0, loading: true});
    _.http({path: 'accounts/' + id, callback: x => {
      this.setState({account: x})
      this.fetch(0);
    }, error: () => _.updateQuery(() => { return {type: '404'}})});
  }

  fetch(offset) {
    _.http({path: 'accounts/' + this.props.id + '/sent', params: {limit: 5, offset: offset, sort: 'timestamp', direction: 'descending'}, callback: x => { 
      x.sort((a, b) => a.timestamp > b.timestamp ? -1 : 1);
      const sent = this.state.sent.concat(x);
      _.http({path: 'accounts/' + this.props.id + '/recv', params: {limit: 5, offset: offset, sort: 'timestamp', direction: 'descending'}, callback: x => { 
        x.sort((a, b) => a.timestamp > b.timestamp ? -1 : 1);
        this.setState({sent: sent, recv: this.state.recv.concat(x), loading: false});
      }});
    }});
  }

  componentWillReceiveProps(props) {
    if (props.id != this.props.id) this.update(props.id);
  }

  render() {
    if (!this.state.account) return <div></div>;
    const account = this.state.account;
    const recv = this.state.recv;
    const sent = this.state.sent;
    const props = [
      {name: 'First Seen', value: timeStr(account.firstSeen)},
      {name: 'Last Seen', value: timeStr(account.lastSeen)},
      {name: 'Transparent Balance', value: (Math.round(1000000000 * account.balance) / 1000000000) + ' ' + currency},
      {name: 'Blocks Mined', value: account.minedCount},
      {name: 'Txns Sent', value: account.sentCount},
      {name: 'Txns Received', value: account.recvCount},
      {name: 'Total Sent', value: (Math.round(1000000000 * account.totalSent) / 1000000000) + ' ' + currency},
      {name: 'Total Received', value: (Math.round(1000000000 * account.totalRecv) / 1000000000) + ' ' + currency}
      ].filter(x => x.value !== undefined);
    const maxHeight = window.innerHeight - 100 + 'px';
    const style = {maxHeight: maxHeight, overflowY: 'auto'};
    const divStyle = {marginTop: '10px', paddingBottom: '70px'};
    const titleStyle = {textAlign: 'center', width: '100%', lineHeight: '34px', fontSize: '20px', margin: '0px'};
    const headerStyle = {textAlign: 'center', width: '100%', lineHeight: '26px', fontSize: '14px', margin: '0px', marginBottom: '20px', marginTop: '30px'};
    const header2Style = {textAlign: 'center', width: '100%', lineHeight: '26px', fontSize: '14px',
                          textOverflow: 'ellipsis', margin: '0px', marginBottom: '0px', marginTop: '10px', overflow: 'hidden'};
    const keyStyle = {fontWeight: 'bold', width: '30%', textAlign: 'right', display: 'inline-block', paddingRight: '10px', overflow: 'hidden'};
    const valStyle = {width: '70%', textAlign: 'left', display: 'inline-block', paddingLeft: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'};
    const colStyle = {marginTop: '2px', marginBottom: '2px'};
    const loadMore = <div style={{width: '100px', margin: '0 auto'}}><Button onClick={() => {
      this.setState({loading: true, offset: this.state.offset + 5}, () => {
        this.fetch(this.state.offset);
      });
    }} disabled={this.state.loading} >Load More</Button></div>;
    return (
      <div style={style} >
      <div style={divStyle} >
      <Grid>
        <Row>
          <Col xs={12} md={12}><h1 style={titleStyle}>{'Account ' + account.address + (pools[account.address] ? ' (' + pools[account.address] + ')' : '')}</h1></Col>
          <Col xs={12} md={12}><h2 style={headerStyle}>{'Summary'}</h2></Col>
          {props.map(p => <Col key={p.name} xs={12} md={6} style={colStyle} ><div style={keyStyle}>{p.name}</div><div style={valStyle}>{p.value}</div></Col>)}
          <Col xs={12} md={12}><h2 style={headerStyle}>{'Transactions'}</h2></Col>
        </Row>
        <Tabs defaultActiveKey={1} id={'tabs'}>
          <Tab key={1} eventKey={1} title="Recv">{recv.map(t => <InlineTxn key={t.hash} txn={t} />)}{this.state.recv.length < account.recvCount ? loadMore : ''}</Tab>
          <Tab key={2} eventKey={2} title="Sent">{sent.map(t => <InlineTxn key={t.hash} txn={t} />)}{this.state.sent.length < account.sentCount ? loadMore : ''}</Tab>
        </Tabs>
      </Grid>
      </div>
      </div>
    );
  }
}

export class Transaction extends React.Component {
  constructor(props) {
    super(props)
    this.state = {};
    this.update = this.update.bind(this);
  }

  componentDidMount() {
    this.setState({id: this.props.id})
    this.update(this.props.id);
  }

  update(id) {
    _.http({path: 'transactions/' + id, callback: x => this.setState({transaction: x}), error: () => _.updateQuery(() => { return {type: '404'}})});
  }

  componentWillReceiveProps(props) {
    if (props.id != this.props.id) this.update(props.id);
  }

  render() {
    if (!this.state.transaction) return <div></div>;
    const transaction = this.state.transaction;
    const props = [
      {name: 'Received Time', value: timeStr(transaction.timestamp)},
      {name: 'Included in Block', value: <Link to={() => { return {type: 'block', id: transaction.blockHash}}}>{transaction.blockHeight}</Link>},
      {name: 'Index', value: transaction.index},
      {name: 'Lock Time', value: transaction.lockTime},
      {name: 'Version', value: transaction.version},
      {name: 'Inputs', value: transaction.vin.length},
      {name: 'Outputs', value: transaction.vout.length},
      {name: 'JoinSplits', value: transaction.vjoinsplit.length}
      ].filter(x => x.value !== undefined);
    const maxHeight = window.innerHeight - 100 + 'px';
    const style = {maxHeight: maxHeight, overflowY: 'auto'};
    const divStyle = {marginTop: '10px', paddingBottom: '70px'};
    const titleStyle = {textAlign: 'center', width: '100%', lineHeight: '34px', fontSize: '20px', margin: '0px'};
    const headerStyle = {textAlign: 'center', width: '100%', lineHeight: '26px', fontSize: '14px', margin: '0px', marginBottom: '20px', marginTop: '30px'};
    const header2Style = {textAlign: 'center', width: '100%', lineHeight: '26px', fontSize: '14px',
                          textOverflow: 'ellipsis', margin: '0px', marginBottom: '0px', marginTop: '10px', overflow: 'hidden'};
    const keyStyle = {fontWeight: 'bold', width: '30%', textAlign: 'right', display: 'inline-block', paddingRight: '10px', overflow: 'hidden'};
    const valStyle = {width: '70%', textAlign: 'left', display: 'inline-block', paddingLeft: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'};
    const colStyle = {marginTop: '2px', marginBottom: '2px'};
    return (
      <div style={style} >
      <div style={divStyle} >
      <Grid>
        <Row>
          <Col xs={12} md={12}><h1 style={titleStyle}>{'Transaction ' + transaction.hash}</h1></Col>
          <Col xs={12} md={12}><h2 style={headerStyle}>{'Summary'}</h2></Col>
          {props.map(p => <Col key={p.name} xs={12} md={6} style={colStyle} ><div style={keyStyle}>{p.name}</div><div style={valStyle}>{p.value}</div></Col>)}
          <Col xs={12} md={12}><h2 style={headerStyle}>{'Details'}</h2></Col>
        </Row>
        <InlineTxn key={transaction.hash} txn={transaction} />
      </Grid>
      </div>
      </div>
    );
  }
}

class ValueDistribution extends React.Component {
  shouldComponentUpdate() {
    return false;
  }

  render() {
    const labels = ['Transparent (TX)', 'Transparent (Unspent Block Rewards)', 'Shielded'];
    const values = [_.stats.valueShieldedSplit.public, _.stats.valueShieldedSplit.coinbase, _.stats.valueShieldedSplit.shielded];
    const colors = ['#5cb85c', '#4285F4', '#d9534f'];
    const data = {labels: labels, datasets: [{data: values, backgroundColor: colors}]};
    const style = {fontSize: '14px', marginTop: '10px', lineHeight: '18px'};
    return (
      <div>
        <Pie data={data} />
        <div style={style}>Transparent value (stored in t-addresses) vs shielded value (stored in z-addresses), in ZEC.<br />
        <br />Transparent value is one of:
        <br />• Value sent to a t-address by a regular transaction and not yet spent
        <br />• Block reward which has not been spent yet (so, to be collected, it must be moved into a z-address)</div>
      </div>
    );
  }
}

class MinerDistribution extends React.Component {
  constructor(props) {
    super(props)
    this.state = {data: [], threshold: 0};
  }

  componentDidMount() {
    _.http({path: 'stats/miners', params: {}, callback: x => {
      console.log(x)
      x.sort((a, b) => a[0] < b[0] ? -1 : 1);
      this.setState({data: x});
    }});
  }

  shouldComponentUpdate() {
    return true;
  }

  render() {
    const threshold = this.state.threshold;
    const filtered = this.state.data.filter(x => x[0] >= threshold);
    var obj = {};
    filtered.map(x => {
      const block = x[0];
      const miner = x[1];
      if (miner in obj) obj[miner] += 1;
      else obj[miner] = 1;
    });
    const sorted = Object.keys(obj).sort((x, y) => obj[x] < obj[y] ? 1 : -1);
    var labels = sorted.slice(0, 15);
    var vals   = labels.map(l => obj[l]);
    labels[labels.length - 1] = 'Other';
    for (var i = 15; i < sorted.length; i++) 
      vals[vals.length - 1] += obj[sorted[i]];
    for (var i = 0; i < labels.length; i++) {
      if (labels[i] in pools)
        labels[i] = pools[labels[i]];
    }
    const colors = [
      '#ff4444',
      '#ffbb33',
      '#00C851',
      '#33b5e5',
      '#2BBBAD',
      '#4285F4',
      '#aa66cc',
      '#4B515D',
      '#3F729B',
      '#212121',
      '#f50057',
      '#8bc34a',
      '#90a4ae',
      '#6d4c41'
    ];
    const data = {labels: labels, datasets: [{data: vals, backgroundColor: colors}]};
    const style = {fontSize: '14px', marginTop: '10px', lineHeight: '18px'};
    const base = {minWidth: '380px'};
    const options = mobile ? {legend: false} : {};
    const day = Math.round(_.network.blockNumber - (86400 / _.network.meanBlockTime));
    const sixh = Math.round(_.network.blockNumber - (3600 * 4 / _.network.meanBlockTime));
    const week = Math.round(_.network.blockNumber - (7 * 86400 / _.network.meanBlockTime));
    const month = Math.round(_.network.blockNumber - (30 * 86400 / _.network.meanBlockTime));
    const toptions = [
      [0, 'Since block 0 (Genesis)'],
      [month, 'Since block ' + month + ' (~ 1 month ago)'],
      [week, 'Since block ' + week + ' (~ 1 week ago)'],
      [day, 'Since block ' + day + ' (~ 24 hours ago)'],
      [sixh, 'Since block ' + sixh + ' (~ 6 hours ago)']
    ];
    return (
      <div style={base} >
        <FormControl componentClass="select" placeholder="Since block" onChange={e => this.setState({threshold: e.target.value})}>
          {toptions.map(o => <option value={o[0]}>{o[1]}</option>)}
        </FormControl>
        <Pie data={data} options={options} />
        <div style={style}>Top 15 miners, by count of blocks mined.</div>
      </div>
    );
  }
}

class NetworkTimeseries extends React.Component {
  shouldComponentUpdate() {
    return false;
  }

  render() {
    const base = {minWidth: '600px'};
    var labels = [];
    var hashrates = [];
    var supplies = [];
    var txPub = [];
    var txShl = [];
    for (var i = 0; i < _.stats.hashrateOverTime.length; i++) {
      const v = _.stats.hashrateOverTime[i];
      labels.push('Block ' + v.block);
      hashrates.push(v.hashrate / 1000);
      supplies.push(Math.round(100000 * v.totalSupply) / 100000);
      txPub.push(v.txStats.public);
      txShl.push(v.txStats.shielded);
    }
    const qp = {
      0: 'hashrate',
      1: 'supply',
      2: 'trnstx',
      3: 'shldtx'
    };
    const data = {labels: labels, datasets: [
      {label: 'Hashrate (KSol/s)', data: hashrates, backgroundColor: '#337ab7', borderColor: '#337ab7',fill: false, hidden: _.query.params[qp[0]] === 'false' ? true : false},
      {label: 'Total Supply (' + currency + ')', data: supplies, backgroundColor: '#aa66cc', borderColor: '#aa66cc', fill: false, hidden: _.query.params[qp[1]] === 'false' ? true : false},
      {label: 'Transparent TX Count (prev 100 blocks)', data: txPub, backgroundColor: '#5cb85c', borderColor: '#5cb85c', fill: false, hidden: _.query.params[qp[2]] === 'false' ? true : false},
      {label: 'Shielded TX Count (prev 100 blocks)', data: txShl, backgroundColor: '#d9534f', borderColor: '#d9534f', fill: false, hidden: _.query.params[qp[3]] === 'false' ? true : false}
    ]};
    const options = {legend: {onClick: (e, i) => {
      var chart = this.refs.chart.chart_instance;
      chart.config.data.datasets[i.datasetIndex].hidden = !chart.config.data.datasets[i.datasetIndex].hidden;
      var label = chart.config.data.datasets[i.datasetIndex].label;
      _.updateQuery((prev) => { prev.params[qp[i.datasetIndex]] = !chart.config.data.datasets[i.datasetIndex].hidden; return prev; });
      chart.update();
    }}};
    const infoStyle = {fontSize: '12px', lineHeight: '12px', textAlign: 'center', marginBottom: '10px'};
    return (
      <div style={base}>
        <div style={infoStyle}>Click legend items to show/hide their associated datasets.</div>
        <Line ref={'chart'} data={data} options={options} />
      </div>
    );
  }
}

class UsageStatistics extends React.Component {
  constructor(props) {
    super(props)
    this.state = {usage: undefined}
  }

  componentDidMount() {
    if (this.state.usage !== undefined) return;
    _.http({path: 'stats/usage', callback: x => { this.setState({usage: x}); }});
  }

  render() {
    if (!this.state.usage) {
      return (<div>Loading...</div>);
    }
    const base = {minWidth: '600px', fontSize: '16px', lineHeight: '24px'};
    return (
      <div style={base}>
        <Grid>
          <Row style={{marginBottom: '20px'}}>
            <Col sm={4} md={2}>Timerange</Col>
            <Col sm={4} md={2}>Transparent Tx</Col>
            <Col sm={4} md={2}>Shielded Tx</Col>
            <Col sm={4} md={2}>Fully Shielded Tx</Col>
            <Col sm={4} md={2}>Transparent Value Transacted</Col>
            <Col sm={4} md={2}>Shielded Value Transacted<br />(lower bound)</Col>
          </Row>
          {['hour', 'day', 'week', 'month'].map(k => {
            const val = this.state.usage[k];
            return (
              <Row>
                <Col sm={2} md={2}>{'Past ' + capitalize(k)}</Col>
                <Col sm={2} md={2}>{val.transparentTx}</Col>
                <Col sm={2} md={2}>{val.shieldedTx}</Col>
                <Col sm={2} md={2}>{val.fullyShieldedTx}</Col>
                <Col sm={2} md={2}>{Math.round(val.transparentValue) + ' ' + currency}</Col>
                <Col sm={2} md={2}>{Math.round(val.shieldedValue) + ' ' + currency}</Col>
              </Row>
            );
          })}
        </Grid>
      </div>
    );
  }
}

export class Statistics extends React.Component {
  constructor(props) {
    super(props)
  }

  componentDidMount() {
    _.http({path: 'stats/mainnet', callback: x => { _.stats = x; _.render(); }, error: () => _.updateQuery(() => { return {type: '404'}})});
  }

  render() {
    if (!_.stats) return <div></div>;
    const maxHeight = window.innerHeight - 180 + 'px';
    const style = {width: '100%', lineHeight: '50px', textAlign: 'center', fontSize: '24px', maxHeight: maxHeight, overflow: 'auto'};
    const navStyle = {background: '#fff', border: 'none'};
    const itemStyle = {fontSize: '14px', color: '#000'};
    const centers = {
      'network': <AdvancedPanels />,
      'usage': <UsageStatistics />,
      'timeseries': <NetworkTimeseries />,
      'value': <ValueDistribution />,
      'miners': <MinerDistribution />
    };
    return (
      <div style={style}>
        <Navbar style={navStyle}>
          <Navbar.Header>
            <Navbar.Toggle />
          </Navbar.Header>
          <Navbar.Collapse>
            <Nav activeKey={this.props.page} onSelect={k => _.updateQuery((q) => { q.page = k; q.params = {}; return q; })} >
              <NavItem eventKey={'network'} style={itemStyle}>Advanced Network Stats</NavItem>
              <NavItem eventKey={'usage'} style={itemStyle}>Usage Statistics</NavItem>
              <NavItem eventKey={'timeseries'} style={itemStyle}>Network Timeseries</NavItem>
              <NavItem eventKey={'value'} style={itemStyle}>Value Distribution</NavItem>
              <NavItem eventKey={'miners'} style={itemStyle}>Miner Distribution</NavItem>
            </Nav>
            <Nav pullRight>
            </Nav>
          </Navbar.Collapse>
        </Navbar>
        <Grid>
          <Row>
            <Col sm={12} md={12}>
            {centers[this.props.page]}
            </Col>
          </Row>
        </Grid>
      </div>
    );
  }
}

export class Misc extends React.Component {
  constructor(props) {
    super(props)
    this.state = {decoded: '', pushed: ''};
    this.decodeRawTx = this.decodeRawTx.bind(this);
    this.pushRawTx = this.pushRawTx.bind(this);
  }

  componentDidMount() {
  }

  decodeRawTx() {
    console.log(this.refs.decode.value);
    _.http({path: 'transactions/decode', data: this.refs.decode.value, callback: (res) => {
      this.setState({decoded: <textarea rows={6} cols={50} style={{textAlign: 'left', fontSize: '14px', lineHeight: '14px'}}>{JSON.stringify(res.result)}</textarea>});
    }, error: (res) => {
      this.setState({decoded: 'Error decoding transaction: ' + res.responseJSON.error});
    }});
  }

  pushRawTx() {
    _.http({path: 'transactions/broadcast', data: this.refs.push.value, callback: (res) => {
      this.setState({pushed: 'Transaction successfully broadcast to network.'});
    }, error: (res) => {
      this.setState({pushed: 'Error broadcasting transaction: ' + res.responseJSON.error});
    }});
  }

  render() {
    const maxHeight = window.innerHeight - 180 + 'px';
    const style = {width: '100%', lineHeight: '50px', textAlign: 'center', fontSize: '16px', maxHeight: maxHeight, overflow: 'auto'};
    const navStyle = {background: '#fff', border: 'none'};
    const itemStyle = {fontSize: '14px', color: '#000'};
    const inputStyle = {fontSize: '14px', lineHeight: '14px'};
    return (
      <div style={style}>
        <Grid>
          <Row>
            <Col sm={12} md={12}>
            Decode Raw Transaction
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12}>
              <textarea style={inputStyle} rows={6} cols={50} ref='decode' placeholder='Enter raw transaction data' />
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12}>
              <Button type='submit' onClick={this.decodeRawTx}>Decode</Button>
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12}>
              {this.state.decoded}
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12}>
            Broadcast Raw Transaction (submit to network)
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12}>
              <textarea style={inputStyle} rows={6} cols={50} ref='push' placeholder='Enter raw transaction data' />
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12}>
              <Button type='submit' onClick={this.pushRawTx}>Broadcast Tx</Button>
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12}>
              {this.state.pushed}
            </Col>
          </Row>
        </Grid>
      </div>
    );
  }
}


class APIEndpoint extends React.Component {
  constructor(props) {
    super(props);
    this.state = {hidden: true};
  }

  render() {
    const style = {marginTop: '10px', marginBottom: '10px', textAlign: 'center'};
    const innerStyle = {cursor: 'pointer', background: '#eee', lineHeight: '30px', marginBottom: '10px'};
    const leftStyle = {textAlign: 'right'};
    const rightStyle = {textAlign: 'left'};
    const rule = <hr style={{marginTop: '5px', marginBottom: '5px'}} />;
    return (
      <div style={style}>
        <Row style={innerStyle} onClick={() => this.setState({hidden: !this.state.hidden})}>
          <Col md={6} sm={6} style={leftStyle}>
          <strong>{this.props.endpoint}</strong>
          </Col>
          <Col md={6} sm={6} style={rightStyle}>
          {this.props.short}
          </Col>
        </Row>
        {this.state.hidden ? '' : <div>
        GET <span style={{marginBottom: '5px'}}>{'https://api.zcha.in' + this.props.endpoint}</span><br />
        {rule}
        {this.props.params.length === 0 ? '' : <div>
          PARAMETERS (URL-encoded)<br />
          <Grid>
            {this.props.params.map(p => <Row><Col md={5} sm={5} style={{textAlign: 'right', fontWeight: 'bold'}}>{p.name}</Col><Col md={7} sm={7} style={{textAlign: 'left'}}>{p.type}</Col></Row>)}
          </Grid>
          {rule}
        </div>}
        {this.props.returns.length === 0 ? '' : <div>
          RETURNS (JSON)<br />
          <Grid>
            {this.props.returns.map(r => <Row><Col md={5} sm={5} style={{textAlign: 'right', fontWeight: 'bold'}}>{r.name}</Col><Col md={7} sm={7} style={{textAlign: 'left'}}>{r.what}</Col></Row>)}
          </Grid>
          {rule}
        </div>}
        EXAMPLE <a href={this.props.example}>{this.props.example}</a><br />
        </div>}
      </div>
    );
  }
}

export class API extends React.Component {
  render() {
    const style = {width: '100%', lineHeight: '50px', textAlign: 'center', fontSize: '12px'};
    const endpoints = [
      {endpoint: '/v2/mainnet/network', short: 'Retrieve Network Information', params: [], example: 'https://api.zcha.in/v2/mainnet/network', returns: [{name: 'accounts', what: 'Count of unique seen accounts (addresses)'}, {name: 'blockHash', what: 'Current block (chain head) hash'},
        {name: 'blockNumber', what: 'Current block (chain head) number'}, {name: 'difficulty', what: 'Current difficulty'}, {name: 'hashrate', what: 'Current estimated network hashrate over the past 120 blocks'}, {name: 'meanBlockTime', what: 'Mean block time over the past 120 blocks (seconds)'}, {name: 'relayFee', what: 'Current transaction relay fee'}, {name: 'peerCount', what: 'Count of connected peers'}, {name: 'protocolVersion', what: 'Client protocol version'}, {name: 'totalAmount', what: 'Total amount of ' + currency + ' in circulation'}, {name: 'transactions', what: 'All-time transaction count (note: not realtime)'}, {name: 'version', what: 'Client version'}]},
      {endpoint: '/v2/mainnet/blocks', short: 'Retrieve multiple blocks', params: [{name: 'sort', type: 'height | timestamp | transactions | time | difficulty'}, {name: 'direction', type: 'ascending | descending'}, {name: 'limit', type: 'int'}, {name: 'offset', type: 'int'}], example: 'https://api.zcha.in/v2/mainnet/blocks?sort=height&direction=descending&limit=1&offset=0', returns: []},
      {endpoint: '/v2/mainnet/blocks/{hash}', short: 'Retrieve single block', params: [], example: 'https://api.zcha.in/v2/mainnet/blocks/00000003f30fb89e7a3ecd5db79acf1083ec97668b32b5a65efb2db8e09f1716', returns: []},
      {endpoint: '/v2/mainnet/blocks/{hash}/transactions', short: 'Retrieve transactions for single block', params: [{name: 'sort', type: 'value | timestamp | blockHeight | shieldedValue'}, {name: 'direction', type: 'ascending | descending'}, {name: 'limit', type: 'int'}, {name: 'offset', type: 'int'}], example: 'https://api.zcha.in/v2/mainnet/blocks/00000000037c2a86ce03689ae0b3704f31e29104f1a37e826d8b191585c336f8/transactions?limit=10&offset=0&sort=index&direction=ascending', returns: []},
      {endpoint: '/v2/mainnet/transactions', short: 'Retrieve multiple transactions', params: [{name: 'sort', type: 'value | timestamp | blockHeight | shieldedValue'}, {name: 'direction', type: 'ascending | descending'}, {name: 'limit', type: 'int'}, {name: 'offset', type: 'int'}], returns: [], example: 'https://api.zcha.in/v2/mainnet/transactions?sort=blockHeight&direction=descending&limit=10&offset=0'},
      {endpoint: '/v2/mainnet/transactions/{hash}', short: 'Retrieve single transaction', params: [], returns: [], example: 'https://api.zcha.in/v2/mainnet/transactions/f55c996c8ce87e78878e3718c2d2375f6f5f49a06a9d71de7408b7017d0354a5'},
      {endpoint: '/v2/mainnet/accounts', short: 'Retrieve multiple accounts', params: [{name: 'direction', type: 'ascending | descending'}, {name: 'limit', type: 'int'}, {name: 'offset', type: 'int'}], returns: [], example: 'https://api.zcha.in/v2/mainnet/accounts?sort=lastSeen&direction=descending&limit=10&offset=0'},
      {endpoint: '/v2/mainnet/accounts/{address}', short: 'Retrieve single account', params: [], returns: [], example: 'https://api.zcha.in/v2/mainnet/accounts/t3Vz22vK5z2LcKEdg16Yv4FFneEL1zg9ojd'},
      {endpoint: '/v2/mainnet/accounts/{address}/recv', short: 'Retrieve transactions received by an account', params: [{name: 'limit', type: 'int'}, {name: 'offset', type: 'int'}], returns: [], example: 'https://api.zcha.in/v2/mainnet/accounts/t3Vz22vK5z2LcKEdg16Yv4FFneEL1zg9ojd/recv?limit=5&offset=0'},
      {endpoint: '/v2/mainnet/accounts/{address}/sent', short: 'Retrieve transactions sent by an account', params: [{name: 'limit', type: 'int'}, {name: 'offset', type: 'int'}], returns: [], example: 'https://api.zcha.in/v2/mainnet/accounts/t3Vz22vK5z2LcKEdg16Yv4FFneEL1zg9ojd/sent?limit=5&offset=0'}
    ];
    return (
      <Grid>
        <Row><Col md={12} sm={12}><span style={{fontSize: '12px'}}>The ZChain API is public - no registration is necessary. Abuse will result in IP bans. If you expect to require usage in excess of ten calls / second, please <a href='mailto:lustro@protonmail.ch'>contact us</a>.</span></Col></Row>
        <br />
        <Row><Col md={12} sm={12}><span style={{fontSize: '12px'}}>This API should be considered to be in beta. Backwards-incompatible changes will be avoided when possible. Click the name of an endpoint to show further information.</span></Col></Row>
        <br />
        <Row><Col md={12} sm={12}><span style={{fontSize: '12px'}}>If you previously used the v1 endpoints, please switch to the v2 ones. v1 API calls will be handled for the near future, but continued support is not guaranteed.</span></Col></Row>
        <br />
        <Row><Col md={12} sm={12}><span style={{fontSize: '12px'}}>Click the name of an endpoint to show details.</span></Col></Row>
        <br />
        <Row><Col md={12} sm={12}><span style={{fontSize: '12px'}}>Attribution is appreciated but not required.</span></Col></Row>
        {endpoints.map(e => <Row><Col md={12} sm={12}><APIEndpoint {...e} /></Col></Row>)}
      </Grid>
    );
  }
}

export class NotFound extends React.Component {
  render() {
    const style = {width: '100%', lineHeight: '50px', textAlign: 'center', fontSize: '24px'};
    return (
      <div style={style}>
        Page not found. If you entered a search query, make sure it was a valid account address (t-address), transaction hash, or block hash.
      </div>
    );
  }
}

export class Launcher extends React.Component {
  render() {
    const maxHeight = window.innerHeight - 140 + 'px';
    const style = {maxHeight: maxHeight, overflowY: 'auto'};
    return (
      <div style={style} >
        <Panels />
        <Grid>
          <Row><Col xs={12} md={6}><BlockTable /></Col><Col xs={12} md={6} style={{borderLeft: '1px solid #ccc'}} ><TransactionsTable /></Col></Row>
          <Row><Col xs={12} md={6}><AccountsTable /></Col><Col xs={12} md={6} style={{borderLeft: '1px solid #ccc'}} ><NewsTable /></Col></Row>
        </Grid>
      </div>
    );
  }
}

export class About extends React.Component {
  render() {
    const divStyle = {fontSize: '12px', textAlign: 'center'};
    return (
      <Grid>
        <Row>
          <Col md={12} sm={12}>
            <div style={divStyle} >
              <div>Copyright (c) 2016-2017 Zchain.</div><br />
              <div>Zchain is beta software and is not formally verified against the Zcash consensus algorithm. Confirm critical information before conducting financial transactions.</div><br />
              <div>Zchain is not affiliated with the Zcash Electric Coin Company.</div><br />
              <div>Market data by <a href={'https://cryptocompare.com/coins/zec/overview/USD'}>CryptoCompare</a>.</div><br />
              <div>Alternative Zcash explorer (always advisible to double-check): <a href='https://insight.mercerweiss.com/'>https://insight.mercerweiss.com/</a>.</div>
            </div>
          </Col>
        </Row>
      </Grid>
    )
  }
}

class Footer extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    const outerStyle = {position: 'fixed', bottom: '0px', width: '100%', fontSize: '12px', lineHeight: '24px'};
    const innerStyle = {margin: '0 auto', textAlign: 'center', background: '#000', color: '#fff'};
    const style = {color: '#fff'};
    return (
      <div style={outerStyle}>
        <div style={innerStyle}>
          <Grid>
            <Row>
            <Col xs={6} md={2}>
              NETWORK {'mainnet'}
            </Col>
            <Col xs={6} md={2}>
              {_.network.subVersion}
            </Col>
            <Col xs={6} md={2}>
              {' ' + _.network.peerCount} PEERS CONNECTED
            </Col>
            <Col xs={6} md={2}>
              CHAIN HEIGHT {_.network.blockNumber}
            </Col>
            <Col xs={6} md={2}>
              <a href={'mailto:lustro@protonmail.ch'} style={style}>CONTACT ZCHAIN</a>
            </Col> 
            <Col xs={6} md={2}>
              <a href={'https://twitter.com/zchain_'} target='_blank' style={style}>TWITTER</a>
            </Col>
            </Row>
          </Grid>
        </div>
      </div>
    );
  }
}

export class Container extends React.Component {
  componentDidMount() {
    _.tooltip = this.refs.tooltip;
  }

  render() {
    const style = {padding: '0px', margin: '0px'};
    return (
      <div style={style} >
        <ReactTooltip effect={'solid'} border={true} ref={'tooltip'} delayShow={200} place={'bottom'} />
        <Header />
        {this.props.children}
        <Footer />
      </div>
    );
  }
}
