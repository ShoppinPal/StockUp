var Promise = require('bluebird');
var asking = Promise.promisifyAll(require('asking'));

var vendSdk = require('vend-nodejs-sdk')({});
var utils = require('./utils/utils.js');

var _ = require('underscore');
var path = require('path');
const logger = require('sp-json-logger');

// Global variable for logging
var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

var FetchProductPaginationInfo = {
    desc: 'Fetch Product Pagination Info',

    options: { // must not clash with global aliases: -t -d -f
    },

    run: function (pageSize) {
        var connectionInfo = utils.loadOauthTokens();
        commandName = commandName + '-' + connectionInfo.domainPrefix;

        if (!pageSize) {
            return Promise.reject(commandName + ' > did not get a pageSize to work with');
        }
        var args = vendSdk.args.products.fetch();
        args.orderBy.value = 'id';
        args.page.value = 1;
        args.pageSize.value = pageSize;
        args.active.value = true;

        //console.log(commandName + ' > will fetch pagination info with args: ', args);
        logger.debug({commandName: commandName, message: 'will fetch pagination info with args', args: args});
        return vendSdk.products.fetchPaginationInfo(args, connectionInfo)
            .tap(function (paginationInfo) {
                //console.log(commandName + ' > 1st tap block');
                logger.debug({message: '1st tap block', commandName: commandName});
                return utils.updateOauthTokens(connectionInfo);
            })
            .then(function (paginationInfo) {
                //console.log(commandName + ' > fetched pagination info');
                logger.tag('PaginationInfo').debug({commandName: commandName, message: 'fetched pagination info'});
                return Promise.resolve(paginationInfo);
            })
            .catch(function (e) {
                //console.error(commandName + ' > An unexpected error occurred: ', e);
                logger.error({err: e, commandName: commandName, message: 'An unexpected error occurred'});
            });
    }
};

module.exports = FetchProductPaginationInfo;
