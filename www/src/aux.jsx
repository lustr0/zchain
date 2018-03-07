import moment from 'moment-timezone';

export const capitalize = (s) => s[0].toUpperCase() + s.slice(1).split('').map((c) => {
    return c == c.toUpperCase() ? ' ' + c : c;
  }).join('');

export const encodeQuery = (params) => {
  var path = '';
  const keys = Object.keys(params);
  if (keys.length > 0) {
    path += '?';
    for (var i = 0; i < keys.length; i++) {
      const k = keys[i];
      path += encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      if (i != keys.length - 1) path += '&';
    };
  };
  return path;
};

export const datePrint = (d, t) => {
  try {
    var d = moment(d.toISOString()).tz(t);
  } catch (e) {
    return null;
  }
  return d.format('ddd DD MMM YYYY HH:mm:ss z') + ' (' + d.fromNow() + ')';
};

export const datePrintShort = (d, t) => {
  try {
    var d = moment(d.toISOString()).tz(t);
  } catch (e) {
    return null;
  }
  return d.format('ddd DD MMM YYYY HH:mm:ss z');
};

export const dateSince = (d, t) => {
  try {
    var d = moment(d.toISOString()).tz(t);
  } catch (e) {
    return null;
  }
  return d.fromNow(true);
}

export const pathify = (obj) => {
  var path = '/';
  while (obj.path.length > 0) {
    if (path != '/') path += '/';
    path += obj.path[0];
    obj.path = obj.path.slice(1);
  };  
  path += encodeQuery(obj.params);
  return path;
};

export const queryToPath = (query) => {
  switch(query.type) {
    case 'find':
      return {path: ['find'], params: {query: ''}};
    case 'launcher':
      return {path: [], params: {}};
    case 'block':
    case 'transaction':
    case 'account':
      return {path: [query.type + 's', query.id], params: {}};
    case 'blocks':
    case 'transactions':
    case 'accounts':
    case 'api':
    case 'about':
    case 'misc':
      return {path: [query.type], params: {}};
    case 'statistics':
      return {path: [query.type, query.page], params: query.params};
    case '404':
      return {path: ['404'], params: {}};
  };  
};

export const pathToQuery = (obj) => {
  if (obj.path.length === 0)
    return {type: 'launcher'};
  if (obj.path.length === 1 && obj.path[0] === 'find')
    return {type: 'find', query: obj.params.query || ''};
  if (obj.path.length === 2 && (obj.path[0] === 'blocks' || obj.path[0] === 'transactions' || obj.path[0] === 'accounts'))
    return {type: obj.path[0].slice(0, obj.path[0].length - 1), id: obj.path[1]};
  if (obj.path.length === 2 && (obj.path[0] === 'statistics'))
    return {type: 'statistics', page: obj.path[1], params: obj.params};
  if (obj.path.length === 1 && (obj.path[0] === 'statistics'))
    return {type: 'statistics', page: 'network'};
  if (obj.path.length === 1)
    return {type: obj.path[0]};
  return {type: '404'};
};

export const queryToTitle = (query) => {
  switch(query.type) {
    case 'find':
      return 'Zchain - Find Block/Transaction/Account';
    case 'block':
    case 'transaction':
    case 'account':
      return 'Zchain - ' + capitalize(query.type) + ' ' + query.id;
    case 'transactions':
    case 'blocks':
    case 'accounts':
      return 'Zchain - ' + capitalize(query.type);
    case 'statistics':
      return 'Zchain - ' + capitalize(query.page) + ' Statistics';
    case 'api':
      return 'Zchain - API';
    case 'about':
      return 'About Zchain';
    default:
      return 'Zchain - Zcash Blockchain Explorer & API';
  };  
};

export const parseURL = () => {
  var urlParams;
  var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = window.location.search.substring(1);

  urlParams = {}; 
  while (match = search.exec(query))
     urlParams[decode(match[1])] = decode(match[2]);

  return {
    path: window.location.pathname.split('/').filter((x) => x.length > 0), 
    params: urlParams
  };  
};
