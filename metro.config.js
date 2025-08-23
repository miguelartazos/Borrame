const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Set Metro server port to 8082 to avoid conflict with other app
config.server = {
  ...config.server,
  port: 8082,
};

module.exports = withNativeWind(config, { input: './global.css' });
