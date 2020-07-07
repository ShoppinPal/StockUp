'use strict';
const csvUtils = require('../utils/csvUtils');
var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
var aws = require('aws-sdk');
const _ = require('underscore');
const CustomException = require('../utils/exceptions');
const fileUtils = require('../utils/fileUtils');
const papaparse = require('papaparse');

module.exports = function (ReorderPointsMultiplierModel) {


    ReorderPointsMultiplierModel.on('dataSourceAttached', function (obj) {

        // wrap the whole model in Promise
        // but we need to avoid 'validate' method
        ReorderPointsMultiplierModel = Promise.promisifyAll(
            ReorderPointsMultiplierModel,
            {
                filter: function (name, func, target) {
                    return !( name == 'validate');
                }
            }
        );


        /**
         * Check if the products are valid and not already
         * present in other multipliers in case of uploading new multipliers
         * or even if existing multipliers are being set as active
         */
        ReorderPointsMultiplierModel.observe('before save', function (ctx, next) {
            let currentInstance, productModelInstances;
            logger.debug({
                cur: ctx.currentInstance
            });
            if (ctx.isNewInstance) {
                currentInstance = ctx.instance;
            }
            else if (ctx.data.isActive && ctx.data.isActive !== ctx.currentInstance.isActive) {
                currentInstance = ctx.currentInstance;
            }
            if (currentInstance) {
                return Promise.resolve()
                    .then(function () {
                        if (ctx.isNewInstance) {
                            return ReorderPointsMultiplierModel.app.models.ProductModel.find({
                                where: {
                                    orgModelId: currentInstance.orgModelId,
                                    sku: {
                                        inq: currentInstance.productSKUs
                                    }
                                }
                            })
                                .then(function (res) {
                                    productModelInstances = res;
                                    logger.debug({
                                        message: 'Found product models, will check for invalid product SKUs',
                                        productsFoundCount: res.length,
                                        toFind: currentInstance.productSKUs.length,
                                        functionName: 'uploadReorderPointsMultiplierFile',
                                        options: ctx.options
                                    });
                                    /**
                                     * If one or more product SKUs in uploaded file are invalid
                                     */
                                    if (res.length !== currentInstance.productSKUs.length) {
                                        let productsNotFound = currentInstance.productSKUs.length - res.length;
                                        logger.error({
                                            message: 'Could not find one or more products in database',
                                            functionName: 'uploadReorderPointsMultiplierFile',
                                            count: productsNotFound,
                                            options: ctx.options
                                        });
                                        throw new CustomException('Could not find ' + productsNotFound + ' products in database', 400);
                                    }
                                    return Promise.resolve();
                                });
                        }
                        else {
                            return ReorderPointsMultiplierModel.findOne({
                                where: {
                                    id: currentInstance.id
                                },
                                include: 'productModels'
                            });
                        }
                    })
                    .then(function (res) {
                        if (res) {
                            logger.debug({
                                message: 'Found products for this reorderPointsMultiplierModel being updated',
                                count: res.productModels().length,
                                functionName: 'uploadReorderPointsMultiplierFile',
                                options: ctx.options
                            });
                            productModelInstances = res.productModels();
                        }
                        logger.debug({
                            message: 'Will look for existing multiplier models with same products',
                            functionName: 'uploadReorderPointsMultiplierFile',
                            options: ctx.options
                        });
                        return ReorderPointsMultiplierModel.find({
                            where: {
                                orgModelId: currentInstance.orgModelId,
                                isActive: true
                            }
                        });
                    })
                    .then(function (multipliers) {
                        logger.debug({
                            message: 'Found existing reorder point multipliers',
                            total: multipliers ? multipliers.length : '',
                            functionName: 'uploadReorderPointsMultiplierFile',
                            options: ctx.options
                        });
                        return ReorderPointsMultiplierModel.app.models.ProductsReorderPointsMultiplierMappings.count({
                            productModelId: {
                                inq: _.pluck(productModelInstances, 'id')
                            },
                            reorderPointsMultiplierModelId: {
                                inq: _.pluck(multipliers, 'id')
                            }
                        });
                    })
                    .then(function (result) {
                        logger.debug({
                            message: 'Found existing skus with multipliers',
                            count: result,
                            functionName: 'uploadReorderPointsMultiplierFile',
                            options: ctx.options
                        });
                        /**
                         * If one or more product SKUs in uploaded file already have multipliers
                         */
                        if (result !== 0) {
                            throw new CustomException('Total of ' + result + ' products already have multipliers', 400);
                        }
                        else {
                            if (ctx.isNewInstance) {
                                ctx.instance.unsetAttribute('productSKUs');
                                ctx.hookState.productModelInstances = productModelInstances;
                            }
                        }
                    });
            }
            next();
        });

        ReorderPointsMultiplierModel.observe('after save', function (ctx, next) {
            if (ctx.isNewInstance && ctx.hookState.productModelInstances) {
                logger.debug({
                    message: 'Will create products and reorderPointsMultiplier mappings',
                    functionName: 'uploadReorderPointsMultiplierFile',
                    options: ctx.options,
                    sampleProduct: ctx.hookState.productModelInstances[0]
                });
                let mappingsToAdd = [];
                _.each(ctx.hookState.productModelInstances, function (eachProductModel) {
                    mappingsToAdd.push({
                        productModelId: eachProductModel.id,
                        reorderPointsMultiplierModelId: ctx.instance.id
                    });
                });
                return Promise.resolve()
                    .then(function () {
                        return ReorderPointsMultiplierModel.app.models.ProductsReorderPointsMultiplierMappings.create(mappingsToAdd);
                    })
                    .catch(function (error) {
                        logger.error({
                            message: 'Could not create products and reorderPointsMultiplier mappings',
                            error,
                            functionName: 'uploadReorderPointsMultiplierFile',
                            options: ctx.options
                        });
                        return Promise.reject('Some error occurred');
                    });
            }
            next();
        });


        ReorderPointsMultiplierModel.uploadReorderPointsMultiplierFile = function (id, req, options) {
            const s3 = new aws.S3({
                apiVersion: '2006-03-01',
                region: ReorderPointsMultiplierModel.app.get('awsS3Region'),
                accessKeyId: ReorderPointsMultiplierModel.app.get('awsAccessKeyId'),
                secretAccessKey: ReorderPointsMultiplierModel.app.get('awsSecretAccessKey')
            });
            logger.debug({
                message: 'Received file',
                functionName: 'uploadReorderPointsMultiplierFile',
                options
            });
            let csvData, multiplier, name, fileData, storageBucket, storageKey, fileUrl;

            return fileUtils.readFileData(req, options)
                .then(function (response) {
                    logger.debug({
                        message: 'Read file data',
                        filePath: response.filePath,
                        fields: response.fields,
                        functionName: 'uploadReorderPointsMultiplierFile',
                        options
                    });
                    fileData = response.fileData;
                    name = response.fields['name'][0];
                    multiplier = response.fields['multiplier'][0];
                    var params = {
                        Bucket: ReorderPointsMultiplierModel.app.get('awsS3ReorderPointsMultiplierBucket'),
                        Key: name + '-' + Date.now() + '.csv',
                        Body: response.fileData
                    };
                    var uploadAsync = Promise.promisify(s3.upload, s3);
                    return uploadAsync(params);
                })
                .then(function (response) {
                    logger.debug({
                        message: 'Uploaded file to s3',
                        response,
                        functionName: 'uploadReorderPointsMultiplierFile',
                        options
                    });
                    storageBucket = response.Bucket;
                    storageKey = response.Key;
                    fileUrl = response.Location;
                    return papaparse.parse(fileData);
                })
                .then(function (result) {
                    logger.debug({
                        message: 'JSON data for multiplier',
                        count: result.data.length,
                        functionName: 'uploadReorderPointsMultiplierFile',
                        options
                    });
                    let flattenedSKUs = _.flatten(result.data);
                    csvData = _.filter(flattenedSKUs, function (item) {
                        return item !== '' && item !== 'SKUs'; //because first row is the header "SKUs"
                    });
                    logger.debug({
                        message: 'CSV Data transformed into product SKUs',
                        count: csvData.length,
                        functionName: 'uploadReorderPointsMultiplierFile',
                        options
                    });
                    return ReorderPointsMultiplierModel.create({
                        name: name,
                        multiplier: multiplier,
                        productSKUs: csvData,
                        orgModelId: id,
                        storageBucket,
                        storageKey,
                        fileUrl
                    });
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not upload reorder points multiplier',
                        error,
                        options,
                        functionName: 'uploadReorderPointsMultiplierFile'
                    });
                    return Promise.reject(error instanceof CustomException ? error : 'Some error occurred');
                });

        };

        ReorderPointsMultiplierModel.downloadSampleFile = function (orgModelId, options) {
            const s3 = new aws.S3({
                apiVersion: '2006-03-01',
                region: ReorderPointsMultiplierModel.app.get('awsS3Region'),
                accessKeyId: ReorderPointsMultiplierModel.app.get('awsAccessKeyId'),
                secretAccessKey: ReorderPointsMultiplierModel.app.get('awsSecretAccessKey')
            });
            logger.debug({
                message: 'Will download sample CSV file',
                options,
                functionName: 'downloadSampleFile'
            });
            var s3Bucket = ReorderPointsMultiplierModel.app.get('awsS3ReorderPointsMultiplierBucket');
            var params = {
                Bucket: s3Bucket,
                Key: 'StockUp Reorder Multiplier.csv'
            };
            var url = s3.getSignedUrl('getObject', params);
            return Promise.resolve(url)
                .catch(function (error) {
                    logger.error({
                        message: 'Could not get signed url for reorder points multiplier file',
                        error,
                        reason: error,
                        options,
                        functionName: 'downloadSampleFile'
                    });
                    return Promise.reject('Could not get signed url for reorder points multiplier file');
                });
        };

        ReorderPointsMultiplierModel.downloadReorderPointsMultiplierFile = function (orgModelId, multiplierId, options) {
            const s3 = new aws.S3({
                apiVersion: '2006-03-01',
                region: ReorderPointsMultiplierModel.app.get('awsS3Region'),
                accessKeyId: ReorderPointsMultiplierModel.app.get('awsAccessKeyId'),
                secretAccessKey: ReorderPointsMultiplierModel.app.get('awsSecretAccessKey')
            });
            logger.debug({
                message: 'Will download CSV file',
                options,
                functionName: 'downloadReorderPointsMultiplierFile'
            });
            return ReorderPointsMultiplierModel.findById(multiplierId)
                .then(function (multiplier) {
                    logger.debug({
                        message: 'Found multiplier model',
                        options,
                        functionName: 'downloadReorderPointsMultiplierFile'
                    });
                    var params = {
                        Bucket: multiplier.storageBucket,
                        Key: multiplier.storageKey
                    };
                    var url = s3.getSignedUrl('getObject', params);
                    return Promise.resolve(url);
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not get signed url for reorder points multiplier file',
                        error,
                        reason: error,
                        options,
                        functionName: 'downloadReorderPointsMultiplierFile'
                    });
                    return Promise.reject('Could not get signed url for reorder points multiplier file');
                });
        };
    });
};
