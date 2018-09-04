'use strict';
var Promise = require('bluebird');
var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('./../lib/debug-extension')('common:models:' + fileName);

module.exports = function (ProductModel) {

    /**
     * @description Updates bin location of a product
     * @param id
     * @param productId
     * @param binLocation
     * @return {Promise.<TResult>}
     */
    ProductModel.updateBinLocation = function (id, productId, binLocation) {
        log('updateBinLocation').debug('Will update bin location for product', productId);
        return ProductModel.app.models.StoreConfigModel.findById(id)
            .then(function (storeConfigModelInstance) {
                if (!storeConfigModelInstance) {
                    log('updateBinLocation').error('Couldn\'t find the store config model with this id', id);
                    return Promise.reject('Couldn\'t find the organisation');
                }
                log('updateBinLocation').debug('Found the store config model', storeConfigModelInstance);
                return ProductModel.findById(productId);
            })
            .then(function (productInstance) {
                if (!productInstance) {
                    log('updateBinLocation').error('Couldn\'t find the product with this id', productId);
                    return Promise.reject('Couldn\'t find the product');
                }
                log('updateBinLocation').debug('Found this product instance', productInstance);
                return productInstance.updateAttribute('binLocation', binLocation);
            })
            .then(function (response) {
                log('updateBinLocation').debug('Updated bin location for product', response);
                return Promise.resolve(response);
            })
            .catch(function (error) {
                log('updateBinLocation').error('Error in updating bin location', error);
                return Promise.reject(error);
            });
    }

};
