var loopback = require('loopback');
var boot = require('loopback-boot');

var client = module.exports = loopback();

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(client, __dirname);
