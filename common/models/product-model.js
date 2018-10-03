'use strict';
var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});

module.exports = function (ProductModel) {

    /**
     * @description Updates bin location of a product
     * @param id
     * @param productId
     * @param binLocation
     * @return {Promise.<TResult>}
     */
    ProductModel.updateBinLocation = function (id, productId, binLocation, options) {
        logger.debug({
            message: 'Will update bin location for product',
            productId,
            options,
            functionName: 'updateBinLocation'
        });
        return ProductModel.app.models.OrgModel.findById(id)
            .then(function (orgModelInstance) {
                if (!orgModelInstance) {
                    logger.error({
                        message: 'Couldn\'t find the orgModel with this id',
                        id,
                        options,
                        functionName: 'updateBinLocation'
                    });
                    return Promise.reject('Couldn\'t find the organisation');
                }
                logger.debug({
                    message: 'Found the orgmodel',
                    orgModelInstance,
                    options,
                    functionName: 'updateBinLocation'
                });
                return ProductModel.findById(productId);
            })
            .then(function (productInstance) {
                if (!productInstance) {
                    logger.error({
                        message: 'Couldn\'t find the product with this id',
                        productId,
                        options,
                        functionName: 'updateBinLocation'
                    });
                    return Promise.reject('Couldn\'t find the product');
                }
                logger.debug({
                    message: 'Found this product instance',
                    productInstance,
                    options,
                    functionName: 'updateBinLocation'
                });
                return productInstance.updateAttribute('binLocation', binLocation);
            })
            .then(function (response) {
                logger.debug({
                    message: 'Updated bin location for product',
                    response,
                    options,
                    functionName: 'updateBinLocation'
                });
                return Promise.resolve(response);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Error in updating bin location',
                    error,
                    options,
                    functionName: 'updateBinLocation'
                });
                return Promise.reject(error);
            });
    };

};
