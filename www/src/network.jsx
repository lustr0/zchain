import $ from 'jquery';

var res = undefined;
const get = (callback) => {
  if (res) {
    callback(res); 
  } else {
    const remote = 'https://api.zcha.in/v2/mainnet/nodes';
    $.getJSON(remote, (r) => {
      res = r;
      callback(res);
    });
  }
};

const generate = (delta, callback) => {
  get((res) => {
    if (delta > 0) {
      const time = (Date.now() / 1000) - delta;
      res = res.filter(v => v.lastSeen > time);
    }
    var versions = {};
    var countries = {};
    var cities = {};
    var past48 = (Date.now() / 1000) - (86400 * 2);
    res.map(v => {
      versions[v.version] = versions[v.version] ? versions[v.version] + 1 : 1;
      countries[v.country] = countries[v.country] ? countries[v.country] + 1 : 1;
      cities[v.city] = cities[v.city] ? cities[v.city] + 1 : 1;
    });
    versions = Object.keys(versions).map(k => [k, versions[k]]).sort((x, y) => x[1] > y[1] ? -1 : 1);
    countries = Object.keys(countries).map(k => [k, countries[k]]).sort((x, y) => x[1] > y[1] ? -1 : 1);
    cities = Object.keys(cities).map(k => [k, cities[k]]).sort((x, y) => x[1] > y[1] ? -1 : 1);
    callback({
      count: res.length,
      versions: versions,
      countries: countries.slice(0, 5),
      cities: cities.slice(0, 5),
      nodes: res
    });
  });
};

const run = (delta) => {
  const app   = document.getElementById('app');
  console.log(app);
  app.innerHTML = '';
  const globe = new DAT.Globe(app);
  generate(delta, (res) => {
    var html = 'Unique nodes (by IP): ' + res.count + '<br />';
    $('#count').html(html);
    html = '';
    html += 'Version Distribution (last version seen)<br />"(unknown)" indicates a node behind NAT <br /><br />';
    for (var i = 0; i < res.versions.length; i++)
      html += res.versions[i][0] + ' - ' + res.versions[i][1] + '<br />';
    $('#version').html(html);
    html = '';
    html += 'Top Countries:<br />';
    for (var i = 0; i < res.countries.length; i++)
      html += res.countries[i][0] + ' - ' + res.countries[i][1] + '<br />'; 
    $('#country').html(html);
    html = '';
    html += 'Top Cities:<br />';
    for (var i = 0; i < res.cities.length; i++)
      html += (res.cities[i][0] ? res.cities[i][0] : '(unknown)') + ' - ' + res.cities[i][1] + '<br />'; 
    $('#city').html(html); 
    var data = [];
    for (var i = 0; i < res.nodes.length; i++) {
      data.push(res.nodes[i].latitude);
      data.push(res.nodes[i].longitude);
      data.push(0.1); 
    }
    globe.addData(data, {format: 'magnitude', name: 'XYZ', animated: true});
    globe.createPoints();
    globe.animate();
  });
};

var urlParams;
(window.onpopstate = function () {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    urlParams = {};
    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2]);
})();

$(() => {
  if (!Detector.webgl) {
    Detector.addGetWebGLMessage();
  } else {
    if (urlParams.delta)
      $('#deltas').val(urlParams.delta);
    run(urlParams.delta || 2592000);
    $('#deltas').on('change', val => {
      run(parseInt(val.target.value));
      const url = window.location.protocol + "//" + window.location.host + window.location.pathname + '?delta=' + val.target.value;
      window.history.pushState({path: url}, '', url);
    });
  }
});
