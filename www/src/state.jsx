import $ from 'jquery';

import { encodeQuery } from './aux.jsx';

var _ = {};

_.base = 'https://api.zcha.in/v2/mainnet/';

_.http = (config) => {
  var opts = {url: _.base + config.path, success: x => config.callback(x), error: config.error || (() => {})};
  if (config.params)
    opts.url += encodeQuery(config.params);
  if (config.data) {
    opts.method = 'POST';
    opts.data   = JSON.stringify(config.data)
  } else {
    opts.method = 'GET';
  }
  $.ajax(opts);
};

_.config = {
  timezone: require('jstimezonedetect').determine().name()
};

_.network = {
};

_.update = () => {
  _.http({path: 'network', callback: x => { _.network = x; _.render(); }});
  setTimeout(_.update, 10000);
};

_.update();

export default _;
