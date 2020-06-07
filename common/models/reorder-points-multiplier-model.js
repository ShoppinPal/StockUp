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


    /**
     * Check if the products are valid and not already
     * present in other multipliers in case of uploading new multipliers
     * or even if existing multipliers are being set as active
     */
    ReorderPointsMultiplierModel.observe('before save', function (ctx, next) {
        let currentInstance;
        if (ctx.instance) {
            currentInstance = ctx.instance;
        }
        else if (ctx.data.isActive && ctx.data.isActive !== ctx.currentInstance.isActive) {
            currentInstance = ctx.currentInstance;
        }
        if (currentInstance) {
            return ReorderPointsMultiplierModel.find({
                where: {
                    orgModelId: currentInstance.orgModelId,
                    isActive: true
                }
            })
                .then(function (multipliers) {
                    logger.debug({
                        message: 'Found existing reorder point multipliers',
                        multipliers,
                        functionName: 'uploadReorderPointsMultiplierFile',
                        options: ctx.options
                    });
                    /**
                     * If there are SKUs in any of the existing multiplier settings,
                     * then we can't add this multiplier coz there will be conflicts
                     * of multiplier
                     */
                    let conflict = false, conflictSKU, conflictMultiplier;

                    for (let i = 0; i<multipliers.length; i++) {
                        for (let j = 0; j<multipliers[i].productSKUs.length; j++) {
                            if (currentInstance.productSKUs.indexOf(multipliers[i].productSKUs[j].trim()) !== -1) {
                                conflict = true;
                                conflictSKU = multipliers[i].productSKUs[j];
                                conflictMultiplier = multipliers[i];
                                break;
                            }
                        }
                    }
                    if (conflict) {
                        logger.debug({
                            message: 'One of the product SKUs already present in another multiplier, cannot go on',
                            conflictSKU,
                            conflictMultiplier,
                            functionName: 'uploadReorderPointsMultiplierFile',
                            options: ctx.options
                        });
                        throw new CustomException(conflictSKU + ' is already present in multiplier: ' + conflictMultiplier.name + ', cannot go on', 400);
                    }
                    logger.debug({
                        message: 'No sku conflicts found in multipliers, will go on to check products',
                        functionName: 'uploadReorderPointsMultiplierFile',
                        options: ctx.options
                    });
                    return ReorderPointsMultiplierModel.app.models.ProductModel.find({
                        where: {
                            orgModelId: currentInstance.orgModelId,
                            sku: {
                                inq: currentInstance.productSKUs
                            }
                        }
                    });
                })
                .then(function (res) {
                    logger.debug({
                        message: 'Found product models',
                        res,
                        functionName: 'uploadReorderPointsMultiplierFile',
                        options: ctx.options
                    });

                    let skusNotFound = _.reject(currentInstance.productSKUs, function (eachSKU) {
                        return _.findWhere(res, {sku: eachSKU.trim()});
                    });

                    if (skusNotFound.length) {
                        logger.error({
                            message: 'Could not find one or more products in database',
                            functionName: 'uploadReorderPointsMultiplierFile',
                            skusNotFound,
                            options: ctx.options
                        });
                        throw new CustomException('Could not find products: ' + skusNotFound.toString() + '  in database', 400);
                    }
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
                    result,
                    functionName: 'uploadReorderPointsMultiplierFile',
                    options
                });
                let flattenedSKUs = _.flatten(result.data);
                csvData = _.filter(flattenedSKUs, function (item) {
                    return item !== '' && item !== 'SKUs'; //because first row is the header "SKUs"
                });
                logger.debug({
                    message: 'CSV Data transformed into product SKUs',
                    csvData,
                    functionName: 'uploadReorderPointsMultiplierFile',
                    options
                });
                logger.debug({
                    message: 'Will look for existing multipliers for these skus',
                    csvData,
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
                    multiplier,
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
};
