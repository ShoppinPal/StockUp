var Promise = require('bluebird');
var asking = Promise.promisifyAll(require('asking'));

var vendSdk = require('vend-nodejs-sdk')({});
var utils = require('./utils/utils.js');

var _ = require('underscore');
var path = require('path');
const logger = require('sp-json-logger');

// Global variable for logging
var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

var DeleteStockOrderRow = {
    desc: 'Delete a Stock Order row by id\n' +
    '\t\t\t\t\t' + '--rowId <consignmentProductId>',

    options: { // must not clash with global aliases: -t -d -f
        rowId: {
            type: 'string',
            required: true
        }
    },

    run: function (rowId) {
        logger.debug({rowId: rowId});

        var connectionInfo = utils.loadOauthTokens();
        commandName = commandName + '-' + connectionInfo.domainPrefix;

        var args = vendSdk.args.consignments.products.remove();
        args.apiId.value = rowId;
        return vendSdk.consignments.products.remove(args, connectionInfo)
            .tap(function () {
                //console.log(commandName + ' > 1st tap block');
                return utils.updateOauthTokens(connectionInfo);
            })
            .catch(function (e) {
                //console.error(commandName + ' > An unexpected error occurred: ', e);
                logger.error({err: e, commandName: commandName, message: 'An unexpected error occurred'});
            });
    }
};

module.exports = DeleteStockOrderRow;
