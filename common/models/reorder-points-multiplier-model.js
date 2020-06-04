'use strict';
const csvUtils = require('../utils/csvUtils');
var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
var aws = require('aws-sdk');
const _ = require('underscore');

module.exports = function (ReorderPointsMultiplierModel) {


    ReorderPointsMultiplierModel.uploadReorderPointsMultiplierFile = function (id, req, options) {
        logger.debug({
            message: 'Received file',
            functionName: 'uploadReorderPointsMultiplierFile',
            options
        });
        let csvData, multiplier;
        return csvUtils.parseCSVToJson(req, options)
            .then(function (result) {
                logger.debug({
                    message: 'JSON data for multiplier',
                    result,
                    functionName: 'uploadReorderPointsMultiplierFile',
                    options
                });
                let flattenedSKUs = _.flatten(result.csvData.data);
                csvData = _.filter(flattenedSKUs, function (item) {
                    return item !== '' && item !== 'SKUs'; //because first row is the header "SKUs"
                });
                logger.debug({
                    message: 'CSV Data transformed into product SKUs',
                    csvData,
                    functionName: 'uploadReorderPointsMultiplierFile',
                    options
                });
                multiplier = result.fields.multiplier;
                return ReorderPointsMultiplierModel.app.models.ProductModel.find({
                    where: {
                        orgModelId: id,
                        sku: {
                            inq: csvData
                        }
                    }
                });
            })
            .then(function (res) {
                logger.debug({
                    message: 'Found product models',
                    res,
                    functionName: 'uploadReorderPointsMultiplierFile',
                    options
                });
                if (res.length !== csvData.length) {
                    logger.error({
                        message: 'Could not find one or more products in database',
                        functionName: 'uploadReorderPointsMultiplierFile',
                        options
                    });
                    return Promise.reject('Could not find one or more products in database');
                }
                return ReorderPointsMultiplierModel.create({
                    multiplier: multiplier,
                    productSKUs: csvData,
                    orgModelId: id
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not upload reorder points multiplier',
                    error,
                    options,
                    functionName: 'uploadReorderPointsMultiplierFile'
                });
                return Promise.reject('Could not upload reorder points multiplier');
            });

    };

    ReorderPointsMultiplierModel.downloadSampleFile = function (orgModelId, options) {
        logger.debug({
            message: 'Will download sample CSV file',
            options,
            functionName: 'downloadSampleFile'
        });
        var s3 = new aws.S3({
            apiVersion: '2006-03-01',
            region: ReorderPointsMultiplierModel.app.get('awsS3Region'),
            accessKeyId: ReorderPointsMultiplierModel.app.get('awsAccessKeyId'),
            secretAccessKey: ReorderPointsMultiplierModel.app.get('awsSecretAccessKey')
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
};
