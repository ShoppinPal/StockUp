var Promise = require('bluebird');
var asking = Promise.promisifyAll(require('asking'));
//var choose = require('asking').choose;
//var ask = require('asking').ask;

var vendSdk = require('vend-nodejs-sdk')({});
var utils = require('./utils/utils.js');

var _ = require('underscore');
var path = require('path');
const logger = require('sp-json-logger');

// Global variable for logging
var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

var validateSupplier = function (supplierId, connectionInfo) {
    if (supplierId) {
        // we still need to get a supplier name for the given supplierId
        return vendSdk.suppliers.fetchById({apiId: {value: supplierId}}, connectionInfo)
            .then(function (supplier) {
                //console.log(supplier);
                //console.log('supplier.name', supplier.name);
                logger.debug({message: `supplier.name: ${supplier.name}`});
                return Promise.resolve(supplier.name);
            });
    }
    else {
        throw new Error('--supplierId should be set');
    }
};

var validateOutlet = function (outletId, connectionInfo) {
    if (outletId) {
        return Promise.resolve(outletId);
    }
    else {
        throw new Error('--outletId should be set');
    }
};

/*var myCacheStrategy = function myCacheStrategy (pagedData, previousData) {
 log.debug('fetchAllProducts - custom myCacheStrategy()');
 if (previousData && previousData.length>0) {
 //log.verbose(JSON.stringify(pagedData.products,replacer,2));
 if (pagedData.products && pagedData.products.length>0) {
 console.log('previousData: ', previousData.length);
 pagedData.products = pagedData.products.concat(previousData);
 console.log('combined: ', pagedData.products.length);
 }
 else {
 pagedData.products = previousData;
 }
 }
 return Promise.resolve();
 };*/

var runMe = function (connectionInfo, userId, reportId, outletId, resolvedSupplierName, cache, cachePostfix, messageId) {
    return vendSdk.products.fetchAll(connectionInfo, function myCacheStrategy(pagedData) {
        //console.log('[MessageId : '+messageId+']'+'myCacheStrategy > inside...');
        logger.debug({messageId: messageId, message: 'myCacheStrategy > inside...'});

        //console.log('[MessageId : '+messageId+']'+commandName, '> myCacheStrategy', '> original products.length: ', pagedData.products.length);
        logger.debug({
            messageId: messageId,
            commandName: commandName,
            message: `original products.length: ${pagedData.products.length}`
        });
        var products = pagedData.products;

        // keep only the products that have an inventory field
        // and belong to the store/outlet of interest to us
        // and belong to the supplier of interest to us
        //console.log('[MessageId : '+messageId+']'+commandName, '> myCacheStrategy', '> filtering for supplier ' + resolvedSupplierName + ' and outlet ' + outletId);
        logger.debug({
            messageId: messageId,
            commandName: commandName,
            message: `filtering for supplier ${resolvedSupplierName} and outlet ${outletId}`
        });
        var filteredProducts = _.filter(products, function (product) {
            return ( product.inventory &&
                _.contains(_.pluck(product.inventory, 'outlet_id'), outletId) &&
                resolvedSupplierName === product.supplier_name
            );
        });
        //console.log('[MessageId : '+messageId+']'+commandName, '> myCacheStrategy', '> filtered products.length: ' + filteredProducts.length);
        logger.tag('myCacheStrategy').debug({
            messageId: messageId,
            commandName: commandName,
            message: `filtered products.length: ${filteredProducts.length}`
        });

        // let's dilute the product data even further
        //console.log(commandName + ' > filtered products:\n', JSON.stringify(filteredProducts,null,2));
        var dilutedProducts = _.map(filteredProducts, function (product) {
            var neoProduct = _.pick(product, 'name', 'supply_price', 'id', 'sku', 'type');
            neoProduct.inventory = _.find(product.inventory, function (inv) {
                return inv.outlet_id === outletId;
            });
            return neoProduct;
        });
        //console.log('[MessageId : '+messageId+']'+commandName, '> myCacheStrategy', '> diluted products.length: ' + dilutedProducts.length);
        logger.tag('myCacheStrategy').debug({
            messageId: messageId,
            commandName: commandName,
            message: `diluted products.length: ${dilutedProducts.length}`,
            dilutedProducts: dilutedProducts
        });

        //console.log('[MessageId : '+messageId+']'+commandName, '> myCacheStrategy', '> diluted products: ' + dilutedProducts);
        return Promise.map(
            dilutedProducts,
            function (product) {
                //var key = product.sku + ':' + resolvedSupplierName + ':' + outletId; // the side performing `get from cache` does not have the supplier or outlet info
                var key = product.sku + ':' + cachePostfix;
                //console.log('[MessageId : '+messageId+']'+commandName, '> myCacheStrategy', '> caching w/ key:', key);
                logger.tag('myCacheStrategy').debug({
                    messageId: messageId,
                    commandName: commandName,
                    message: `caching w/ key: ${key}`
                });
                return cache.setAsync(key, JSON.stringify(product, null, 0), 60 * 20) // expires in 20 minutes
                    .then(function () {
                        //console.log('[MessageId : '+messageId+']'+commandName, '> myCacheStrategy', '> after putAsync:', arguments);
                        logger.debug({
                            messageId: messageId,
                            commandName: commandName,
                            message: 'after putAsync',
                            arguments: arguments
                        });
                        return Promise.resolve();
                    });
            },
            {concurrency: 1}
        )
            .then(function () {
                //console.log('[MessageId : '+messageId+']'+commandName, '> myCacheStrategy', '> cached all entries for this page');
                logger.debug({
                    messageId: messageId,
                    commandName: commandName,
                    message: 'cached all entries for this page'
                });
                return Promise.resolve();
            });
    })
        .catch(function (e) {
            //console.error('[MessageId : '+messageId+']'+commandName, '> myCacheStrategy', '> An unexpected error occurred: ', e);
            logger.error({
                err: e,
                messageId: messageId,
                commandName: commandName,
                message: 'An unexpected error occurred'
            });
            return Promise.reject(e);
        });
};

var FetchVendProductsForStockOrder = {
    desc: 'Fetch vend products for preparing on a stock order',

    options: { // must not clash with global aliases: -t -d -f
        reportId: {
            type: 'string',
            aliases: ['r'] // TODO: once Ronin is fixed to accept 2 characters as an alias, use 'ri' alias
        },
        outletId: {
            type: 'string',
            aliases: ['o'] // TODO: once Ronin is fixed to accept 2 characters as an alias, use 'oi' alias
        },
        supplierId: {
            type: 'string',
            aliases: ['s'] // TODO: once Ronin is fixed to accept 2 characters as an alias, use 'si' alias
        }
    },

    run: function (reportId, outletId, supplierId, userId, cache, cachePostfix, messageId) {
        // console.log('reportId', reportId, 'outletId', outletId, 'supplierId', supplierId, 'userId', userId,
        //   'cachePostfix', cachePostfix,
        //   'cache', cache,
        //   'messageId',messageId);
        logger.debug({
            reportId: reportId,
            outletId: outletId,
            supplierId: supplierId,
            userId: userId,
            cachePostfix: cachePostfix,
            cache: cache,
            messageId: messageId
        });

        var connectionInfo = utils.loadOauthTokens();
        commandName = commandName + '-' + connectionInfo.domainPrefix;

        return validateSupplier(supplierId, connectionInfo)
            .tap(function (resolvedSupplierName) {
                //console.log(commandName + ' > 1st tap block');
                return utils.updateOauthTokens(connectionInfo);
            })
            .then(function (resolvedSupplierName) {
                return validateOutlet(outletId, connectionInfo)
                    .then(function (resolvedOutletId) {
                        outletId = resolvedOutletId;
                        return runMe(connectionInfo, userId, reportId, outletId, resolvedSupplierName, cache, cachePostfix, messageId);
                    });
            });
    }
};

module.exports = FetchVendProductsForStockOrder;
