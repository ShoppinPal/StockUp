'use strict';

const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
const Promise = require('bluebird');

module.exports = function (OrderConfigModel) {

    OrderConfigModel.on('dataSourceAttached', function (obj) {

        OrderConfigModel.fetchFileImportHeaders = function (id, options) {
            var importableHeaders = {
                Inventory: ['orderQuantity', 'fulfilledQuantity'],
                Product: ['name', 'sku'],
                Store: ['name', 'storeNumber', 'supplierStoreId'],
                Supplier: ['name']
            };
            logger.debug({
                message: 'Will return file import headers',
                importableHeaders,
                options,
                functionName: 'fetchFileImportHeaders'
            });
            return Promise.resolve(importableHeaders);
        };

    });

};
