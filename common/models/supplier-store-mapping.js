'use strict';
var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
var Joi = Promise.promisifyAll(require('joi'));
var validate = Promise.promisify(require('joi').validate);
const _ = require('underscore');

module.exports = function (SupplierStoreMapping) {

    SupplierStoreMapping.editSupplierStoreMappings = function (id, mappings, options) {
        logger.debug({
            message: 'Will validate mappings data against default mappings schema',
            functionName: 'editSupplierStoreMappings',
            mappings,
            options
        });

        const mappingsSchema = Joi.array().items(
            Joi.object({
                storeModelId: Joi.string().required(),
                supplierModelId: Joi.string().required(),
                storeCode: Joi.string(),
                supplierCode: Joi.string()
            })
        );

        return validate(mappings, mappingsSchema)
            .catch(function (error) {
                logger.error({
                    message: 'Mappings should be a valid array',
                    functionName: 'editSupplierStoreMappings',
                    validSchema: mappingsSchema,
                    error,
                    options
                });
                return Promise.reject('Mappings should be a valid array');
            })
            .then(function () {
                logger.debug({
                    message: 'Mappings schema validated, will update all mappings',
                    functionName: 'editSupplierStoreMappings',
                    options
                });
                return Promise.map(mappings, function (eachMapping) {
                    return SupplierStoreMapping.findOrCreate({
                        where: {
                            storeModelId: eachMapping.storeModelId,
                            supplierModelId: eachMapping.supplierModelId
                        }
                    }, eachMapping);
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not findOrCreate mappings',
                    functionName: 'editSupplierStoreMappings',
                    error,
                    options
                });
                return Promise.reject('Could not update mappings');
            })
            .then(function (response) {
                logger.debug({
                    message: 'find or create response',
                    response,
                    functionName: 'editSupplierStoreMappings',
                    options
                });
                return Promise.map(response, function (eachResponse) {
                    if (!eachResponse[1]) { //meaning if the result was found and not created
                        let storeCode = _.find(mappings, function (eachMapping) {
                            //don't want type check in mongo Ids
                            return eachMapping.storeModelId == eachResponse[0].storeModelId &&
                                eachMapping.supplierModelId == eachResponse[0].supplierModelId
                        }).storeCode;
                        return SupplierStoreMapping.updateAll({
                            id: eachResponse[0].id
                        }, {
                            storeCode: storeCode
                        })
                    }
                    else {//meaning the mapping was successfully created for the first time
                        return Promise.resolve();
                    }
                });
                // return Promise.resolve();
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not update mappings',
                    functionName: 'editSupplierStoreMappings',
                    error,
                    options
                });
                return Promise.reject('Could not update mappings');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Updated mappings',
                    response,
                    functionName: 'editSupplierStoreMappings',
                    options
                });
                return Promise.resolve('Updated mappings successfully');
            });
    };

};
