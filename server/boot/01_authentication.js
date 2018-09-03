const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'server:boot:' + fileName});

module.exports = function enableAuthentication(server) {
    // enable authentication
    logger.debug({
        message: 'Enabling authentication'
    });
    server.enableAuth();
};
