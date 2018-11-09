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
        logger.debug({ message: `supplier.name: ${supplier.name}` });
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

var runMe = function (connectionInfo, userId, reportId, outletId, resolvedSupplierName) {
  return vendSdk.products.fetchAll(connectionInfo)
  /*.tap(function(products) {
   return utils.exportToJsonFileFormat(commandName, products);
   })*/
    .then(function (products) {
      // console.log(commandName + ' > 1st tap block');
      // console.log(commandName + ' > original products.length: ' + products.length);
      logger.debug({
        commandName: commandName,
        message: `1st tap block. original products.length: ${products.length}`
      });

      // keep only the products that have an inventory field
      // and belong to the store/outlet of interest to us
      // and belong to the supplier of interest to us
      //console.log(commandName + ' > filtering for supplier ' + resolvedSupplierName + ' and outlet ' + outletId);
      logger.debug({
        commandName: commandName,
        message: `filtering for supplier ${resolvedSupplierName} adn outlet ${outletId}`
      });
      var filteredProducts = _.filter(products, function (product) {
        return ( product.inventory &&
          _.contains(_.pluck(product.inventory, 'outlet_id'), outletId) &&
          resolvedSupplierName === product.supplier_name
        );
      });
      logger.debug({ commandName: commandName, message: `filtered products.length: ${filteredProducts.length}` });

      /*return utils.exportToJsonFileFormat(commandName+'-filteredProducts', filteredProducts)
       .then(function() {
       return Promise.resolve(filteredProducts);
       });*/
      return Promise.resolve(filteredProducts);
    })
    .then(function (filteredProducts) {
      // let's dilute the product data even further
      //console.log(commandName + ' > filtered products:\n', JSON.stringify(filteredProducts,null,2));
      var dilutedProducts = _.object(_.map(filteredProducts, function (product) {
        var neoProduct = _.pick(product, 'name', 'supply_price', 'id', 'sku', 'type');
        neoProduct.inventory = _.find(product.inventory, function (inv) {
          return inv.outlet_id === outletId;
        });
        //return [product.id, neoProduct]; // IDs will server as keys
        return [product.sku, neoProduct]; // SKUs will serve as keys
      }));
      //console.log(commandName + ' > diluted products.length: ' + _.keys(dilutedProducts).length);
      logger.debug({
        commandName: commandName,
        message: `diluted products.length: ${_.keys(dilutedProducts).length}`
      });

      /*return utils.exportToJsonFileFormat(commandName+'-dilutedProducts', dilutedProducts)
       .then(function() {
       //console.log(dilutedProducts);
       return Promise.resolve(dilutedProducts);
       });*/ // NOTE: useful for quicker testing
      return Promise.resolve(dilutedProducts);
    })
    .catch(function (e) {
      //console.error(commandName + ' > An unexpected error occurred: ', e);
      logger.error({err: e, commandName: commandName, message: 'An unexpected error occurred'});
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

  run: function (reportId, outletId, supplierId, userId) {
    //console.log('reportId', reportId, 'outletId', outletId, 'supplierId', supplierId, 'userId', userId);
    logger.debug({ reportId: reportId, outletId: outletId, supplierId: supplierId, userId: userId });

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
            return runMe(connectionInfo, userId, reportId, outletId, resolvedSupplierName);
          });
      });
  }
};

module.exports = FetchVendProductsForStockOrder;
