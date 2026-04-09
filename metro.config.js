const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.resolverMainFields = ["react-native", "browser", "main"];

// Explicitly alias to CJS to avoid ESM resolution issues in Metro
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'socket.io-client': path.resolve(__dirname, 'node_modules/socket.io-client/build/cjs/index.js'),
};

module.exports = withNativeWind(config, { input: './global.css' });
