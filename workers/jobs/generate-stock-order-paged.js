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

var runMe = function (connectionInfo, userId, reportId, outletId, resolvedSupplierName, pageNumber, pageSize, messageId) {
  if (!pageNumber) return Promise.reject(commandName + ' > missing page number');

  var args = vendSdk.args.products.fetch();
  args.orderBy.value = 'id';
  args.page.value = pageNumber;
  args.pageSize.value = pageSize || 200;
  args.active.value = true;
  //console.log('[MessageId : '+messageId+']'+commandName + ' > will work on page # ' + args.page.value + ' w/ pageSize: ' + args.pageSize.value);
  logger.debug({
    messageId: messageId,
    commandName: commandName,
    message: `will work on page # ${args.page.value} w/ pageSize: ${args.pageSize.value}`
  });

  return vendSdk.products.fetch(args, connectionInfo)
  /*.tap(function(products) {
   return utils.exportToJsonFileFormat(commandName, products);
   })*/
    .then(function (products) {
      //console.log('[MessageId : '+messageId+']'+commandName + ' > 1st tap block');
      logger.debug({ messageId: messageId, commandName: commandName, message: '1st tap block' });

      if (products && _.isObject(products) && !_.isArray(products)) {
        //console.log('[MessageId : '+messageId+']'+commandName + ' > 1st tap block > extract products array from object');
        logger.debug({
          messageId: messageId,
          commandName: commandName,
          message: '1st tap block > extract products array from object'
        });
        products = products.products; // we only care about the array values
      }
      if (!_.isArray(products)) {
        return Promise.reject(commandName + ' > did not get an array of products to work with');
      }
      //console.log('[MessageId : '+messageId+']'+commandName + ' > original products.length: ' + products.length);
      logger.debug({
        messageId: messageId,
        commandName: commandName,
        message: `original products.length: ${products.length}`
      });

      // keep only the products that have an inventory field
      // and belong to the store/outlet of interest to us
      // and belong to the supplier of interest to us
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
      //console.log('[MessageId : '+messageId+']'+commandName + ' > filtered products.length: ' + filteredProducts.length);
      logger.debug({
        messageId: messageId,
        commandName: commandName,
        message: `filtered products.length: ${filteredProducts.length}`
      });

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
        var neoProduct = _.pick(product, 'name', 'supply_price', 'id', 'sku', 'type', 'tags');
        neoProduct.inventory = _.find(product.inventory, function (inv) {
          return inv.outlet_id === outletId;
        });
        return [product.id, neoProduct];
      }));
      //console.log('[MessageId : '+messageId+']'+commandName + ' > diluted products.length: ' + _.keys(dilutedProducts).length);
      logger.debug({
        messageId: messageId,
        commandName: commandName,
        message: `diluted products.length: ${_.keys(dilutedProducts).length}`
      });

      /*return utils.exportToJsonFileFormat(commandName+'-dilutedProducts', dilutedProducts)
       .then(function() {
       //console.log(dilutedProducts);
       return Promise.resolve(dilutedProducts);
       });*/
      return Promise.resolve(dilutedProducts);
    })
    .then(function (dilutedProducts) {
      var rows = [];
      _.each(dilutedProducts, function (dilutedProduct) {
        var useRow = true;

        var caseQuantity = undefined;
        if (dilutedProduct.tags) {
          var tagsAsCsv = dilutedProduct.tags.trim();
          //console.log( 'tagsAsCsv: ' + tagsAsCsv );
          var tagsArray = tagsAsCsv.split(',');
          if (tagsArray && tagsArray.length>0) {
            _.each(tagsArray, function (tag) {
              tag = tag.trim();
              if (tag.length>0) {
                //console.log( 'tag: ' + tag );
                // http://stackoverflow.com/questions/8993773/javascript-indexof-case-insensitive
                var prefix = 'CaseQuantity:'.toLowerCase();
                if (tag.toLowerCase().indexOf(prefix) === 0) {
                  var caseQty = tag.substr(prefix.length);
                  //console.log('based on a prefix, adding CaseQuantity: ' +  caseQty);
                  caseQuantity = Number(caseQty);
                }
                else {
                  //console.log('ignoring anything without a prefix');
                }
              }
            });
          }
        }

        var quantityOnHand = Number(dilutedProduct.inventory.count);
        var desiredStockLevel = Number(dilutedProduct.inventory['reorder_point']);
        var orderQuantity = 0;
        if (quantityOnHand<0) {
          // console.log('[MessageId : '+messageId+']'+'TODO: how should negative inventory be handled?',
          //   'DSL minus QOH w/ a negative QOH will lead to a positive! Example:',
          //   '100 - (-2) = 102');
          logger.debug({
              messageId: messageId,
              message: 'how should negative inventory be handled? DSL minus QOH w/ a negative QOH will lead to a positive! Example:\n 100 - (-2) = 102'
          });
        }
        if (!_.isNaN(desiredStockLevel) && _.isNumber(desiredStockLevel)) {
          orderQuantity = desiredStockLevel - quantityOnHand;
          if (orderQuantity>0) {
            useRow = true;
            if (caseQuantity) {
              if ((orderQuantity % caseQuantity) === 0) {
                //console.log('NO-OP: orderQuantity is already a multiple of caseQuantity');
              }
              else {
                orderQuantity = Math.ceil(orderQuantity / caseQuantity) * caseQuantity;
              }
            }
          }
          else {
            logger.debug({
              messageId: messageId,
              message: 'do not waste time on negative or zero orderQuantity',
              dilutedProduct: dilutedProduct
            });
            useRow = false;
          }
        }
        else {
          //console.log('[MessageId : '+messageId+']'+'give humans a chance to look over dubious data', dilutedProduct);
          desiredStockLevel = undefined;
          orderQuantity = undefined;
          useRow = true;
        }
        if (useRow) {
          var row = {
            productId: dilutedProduct.id,
            sku: dilutedProduct.sku,
            name: dilutedProduct.name,
            quantityOnHand: quantityOnHand,
            desiredStockLevel: desiredStockLevel,
            orderQuantity: orderQuantity,
            caseQuantity: caseQuantity,
            supplyPrice: dilutedProduct.supply_price,
            type: dilutedProduct.type,
            reportId: reportId,
            userId: userId
          };
          rows.push(row);
          logger.debug({ commandName: commandName, row: row });
        }
        else {
          logger.debug({ messageId: messageId, message: 'Skipping', dilutedProduct: dilutedProduct });
        }
      });

      logger.debug({ messageId: messageId, commandName: commandName, message: 'DONE' });
      return Promise.resolve(rows);
    })
    .catch(function (e) {
      //console.error('[MessageId : '+messageId+']'+commandName + ' > An unexpected error occurred: ', e);
      logger.error({err: e, messageId: messageId, commandName: commandName, message: 'An unexpected error occurred'});
    });
};

var GenerateStockOrderPaged = {
  desc: 'Generate a stock order for warehouse (for a given page)',

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
    },
    userId: {
      type: 'string'
    },
    pageNumber: {
      type: 'number'
    }
  },

  run: function (reportId, outletId, supplierId, userId, pageNumber, pageSize, messageId) {
    logger.debug({
      messageId: messageId,
      reportId: reportId,
      outletId: outletId,
      supplierId: supplierId,
      userId: userId,
      pageNumber: pageNumber,
      pageSize: pageSize
    });

    var connectionInfo = utils.loadOauthTokens();
    //commandName = commandName + '-'+ connectionInfo.domainPrefix;

    return validateSupplier(supplierId, connectionInfo)
      .tap(function (resolvedSupplierName) {
        //console.log(commandName + ' > 1st tap block');
        return utils.updateOauthTokens(connectionInfo);
      })
      .then(function (resolvedSupplierName) {
        return validateOutlet(outletId, connectionInfo)
          .then(function (resolvedOutletId) {
            outletId = resolvedOutletId;
            return runMe(connectionInfo, userId, reportId, outletId, resolvedSupplierName, pageNumber, pageSize, messageId);
          });
      });
  }
};

module.exports = GenerateStockOrderPaged;
