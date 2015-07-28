exports.config = {
  seleniumAddress: 'http://localhost:4723/wd/hub',

  specs: ['spec.js'],

  /**
   * Available on my developer laptop:
   *
   * "iPad 2 (8.2 Simulator),
   * "iPad Air (8.2 Simulator),
   * "iPad Retina (8.2 Simulator)",
   * "iPhone 4s (8.2 Simulator)",
   * "iPhone 5 (8.2 Simulator)",
   * "iPhone 5s (8.2 Simulator)",
   * "iPhone 6 (8.2 Simulator)",
   * "iPhone 6 Plus (8.2 Simulator)"
   *
   * You'll find your own ... if and when the process fails, it will tell
   * you what's actually available for you in its logs.
   */

  // Reference: https://github.com/appium/sample-code/blob/master/sample-code/examples/node/helpers/caps.js
  capabilities: {
    browserName: 'safari',
    'appium-version': '1.0',
    platformName: 'iOS',
    platformVersion: '8.2',
    deviceName: 'iPad Air',
    orientation: 'LANDSCAPE'
  },

  baseUrl: 'https://mppulkit1.localtunnel.me',

  // configuring wd in onPrepare
  // wdBridge helps to bridge wd driver with other selenium clients
  // See https://github.com/sebv/wd-bridge/blob/master/README.md
  onPrepare: function () {
    var wd = require('wd'),
      protractor = require('protractor'),
      wdBridge = require('wd-bridge')(protractor, wd);
    wdBridge.initFromProtractor(exports.config);
  }
};