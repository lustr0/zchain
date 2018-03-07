const webpack = require('webpack');

module.exports = { 
  entry: {
    app: './src/app.jsx',
    network: './src/network.jsx',
  },
  output: {
    path: './build',
    filename: '[name].js'
  },  
  debug: false,
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: { warnings: false },
      output: { comments: false }
    }), 
    new webpack.DefinePlugin({'process.env': {NODE_ENV: JSON.stringify('production')}}),
  ],  
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style!css' },
      { test: /\.jsx?$/, exclude: /(node_modules)/, loader: 'babel-loader', query: { presets: ['es2015', 'react'] } },
      { test: /\.json$/, loader: 'json' },
      { test: /\.(jpe?g|png|gif|svg)$/i,
        loaders: [
            'file?hash=sha512&digest=hex&name=[hash].[ext]',
            'image-webpack?bypassOnDebug&optimizationLevel=7&interlaced=false'
        ]   
      }   
    ]   
  },  
  node: {fs: 'empty', net: 'empty', tls: 'empty'}
};
