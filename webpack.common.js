const path = require('path');

module.exports = {
  entry: {
    app: './js/app.js',
    // Add lib components as separate entries so they can be imported as modules
    'lib/components/map/map-component': './lib/components/map/map-component.ts',
    'lib/components/map-overlay/simple-map-overlay': './lib/components/map-overlay/simple-map-overlay.ts',
    'lib/components/overlay-info-panel/overlay-info-panel': './lib/components/overlay-info-panel/overlay-info-panel.ts',
    // Add new components for fullscreen map
    'lib/components/map-overlay/yaml-map-overlay': './lib/components/map-overlay/yaml-map-overlay.ts',
    'lib/managers/fullscreen-map-manager': './lib/managers/fullscreen-map-manager.ts',
    'lib/utils/overlay-yaml-manager-browser': './lib/utils/overlay-yaml-manager-browser.ts',
    'lib/utils/svg-manager': './lib/utils/svg-manager.ts',
    // Add JavaScript files that are being imported
    'lib/components/map-overlay/overlay-linked-list': './lib/components/map-overlay/overlay-linked-list.js',
    'lib/components/map-overlay/map-overlay': './lib/components/map-overlay/map-overlay.js',
    // Add additional JavaScript files that were excluded from compilation
    'js/components': './js/components.js',
    'js/island-map-canvas': './js/island-map-canvas.js',
    'js/utils/iterable-utils': './js/utils/iterable-utils.js',
    'js/map': './js/map.js',
    'js/utils/svg-utils': './js/utils/svg-utils.js',
  },
  output: {
    path: path.resolve(__dirname, '.'),
    clean: false,
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'lib'),
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      "fs": false,
      "path": require.resolve("path-browserify"),
      "util": require.resolve("util/"),
      "buffer": require.resolve("buffer/"),
      "stream": require.resolve("stream-browserify")
    }
  },
};
