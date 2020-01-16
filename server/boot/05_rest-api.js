const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'server:boot:' + fileName});

module.exports = function mountRestApi(server) {
    logger.debug({message: 'Defining restApiRoot'});
    var restApiRoot = server.get('restApiRoot');
    server.use(restApiRoot, server.loopback.rest());
};
