var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});

// HINT(s):
//   Getting the app object: http://docs.strongloop.com/display/public/LB/Working+with+LoopBack+objects
//   From a model script: http://docs.strongloop.com/display/public/LB/Working+with+LoopBack+objects#WorkingwithLoopBackobjects-Fromamodelscript
module.exports = function (StoreModel) {

    // https://github.com/strongloop/loopback/issues/418
    // once a model is attached to the data source
    StoreModel.on('dataSourceAttached', function (obj) {
        // wrap the whole model in Promise
        // but we need to avoid 'validate' method
        StoreModel = Promise.promisifyAll(
            StoreModel,
            {
                filter: function (name, func, target) {
                    return !( name == 'validate');
                }
            }
        );
    });

    StoreModel.assignStoreToSupplier = function (id, storeModelId, supplierModelId, options) {
        logger.debug({
            message: 'Will assign store to supplier',
            storeModelId,
            supplierModelId,
            options
        });
        return StoreModel.findOne({
            where: {
                ownerSupplierModelId: supplierModelId
            }
        })
            .then(function (storeModelInstance) {
                logger.debug({
                    message: 'Found store model instance',
                    storeModelInstance,
                    options
                });
                if (storeModelInstance) {
                    storeModelInstance.unsetAttribute('ownerSupplierModelId');
                    return storeModelInstance.save();
                }
                else {
                    return Promise.resolve();
                }
            })
            .then(function (result) {
                logger.debug({
                    message: 'Removed supplier mapping from store, will add it to new store',
                    result,
                    options
                });
                return StoreModel.updateAll({
                    objectId: storeModelId
                }, {
                    ownerSupplierModelId: supplierModelId
                });
            })
            .then(function (result) {
                logger.debug({
                    message: 'Assigned new store to supplier',
                    result,
                    options
                });
                return Promise.resolve();
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not assign store to supplier',
                    error,
                    options
                });
                return Promise.reject('Could not assign store to supplier');
            });
    }

};
