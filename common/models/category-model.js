'use strict';
var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
var _ = require('underscore');
const rp = require('request-promise');
const csvUtils = require('../utils/csvUtils');
const fileUtils = require('../utils/fileUtils');
const papaparse = require('papaparse');
const aws = require('aws-sdk');


module.exports = function (CategoryModel) {

    CategoryModel.uploadMinMaxFile = function (id, req, options) {
        logger.debug({
            message: 'Received file',
            functionName: 'uploadMinMaxFile',
            options
        });
        var parentCategory, storeModels, csvStoreColumnPositions = {}, minColPosition, maxColPosition, failedCategories = [], successMsg;


        const s3 = new aws.S3({
            apiVersion: '2006-03-01',
            region: CategoryModel.app.get('awsS3Region'),
            accessKeyId: CategoryModel.app.get('awsAccessKeyId'),
            secretAccessKey: CategoryModel.app.get('awsSecretAccessKey')
        });
        logger.debug({
            message: 'Received file',
            functionName: 'uploadReorderPointsMultiplierFile',
            options
        });
        let csvData, fileData, storageBucket, storageKey, fileUrl;

        return fileUtils.readFileData(req, options)
            .then(function (response) {
                logger.debug({
                    message: 'Read file data',
                    filePath: response.filePath,
                    fields: response.fields,
                    functionName: 'uploadMinMaxFile',
                    options
                });
                fileData = response.fileData;
                parentCategory = response.fields['parentCategory'][0];
                var params = {
                    Bucket: CategoryModel.app.get('awsS3ReorderPointsMultiplierBucket'),
                    Key: parentCategory + '-' + Date.now() + '.csv',
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
                csvData = result;
                //capture starting column numbers of min and max headers
                minColPosition = csvData.data[0].indexOf('min');
                maxColPosition = csvData.data[0].indexOf('max');


                //capture store names from 2nd row, 4th column onwards
                for (var i = minColPosition; i<csvData.data[1].length; i++) {
                    if (!csvStoreColumnPositions[csvData.data[1][i]]) {
                        csvStoreColumnPositions[csvData.data[1][i]] = {};
                    }
                    if (i<maxColPosition) {
                        csvStoreColumnPositions[csvData.data[1][i]].min = i;
                    }
                    else {
                        csvStoreColumnPositions[csvData.data[1][i]].max = i;
                    }
                }

                /**
                 * csvStoreColumnPositions = {
                 *      'storeX': {
                 *          'min': x,
                 *          'max': y
                 *      },
                 *      'storeY': {
                 *          'min': a,
                 *          'max': b
                 *      }
                 * }
                 */

                logger.debug({
                    message: 'Captured store column positions for both min and max values',
                    csvStoreColumnPositions,
                    functionName: 'uploadMinMaxFile',
                    options
                });

                logger.debug({
                    message: 'Will find store names to match with store short names in uploaded file',
                    functionName: 'uploadMinMaxFile',
                    options
                });
                return CategoryModel.app.models.StoreModel.find({
                    where: {
                        orgModelId: id
                    }
                });
            })
            .then(function (storeModelInstances) {
                logger.debug({
                    message: 'Found these store models',
                    storeModelInstances,
                    functionName: 'uploadMinMaxFile',
                    options
                });
                storeModels = storeModelInstances;
                var categoryMinMaxValues = [];
                for (var i = 2; i<csvData.data.length; i++) {
                    //make category name like Ladies.Activewear.Bottoms.Bottoms
                    if (csvData.data[i][1] && csvData.data[i][2] && csvData.data[i][3]) {
                        var categoryName = parentCategory + '.' + csvData.data[i][1] + '.' + csvData.data[i][2] + '.' + csvData.data[i][3] + '.' + csvData.data[i][3];
                        var categoryMinMaxObject = {};
                        categoryMinMaxObject[categoryName] = {
                            min: {},
                            max: {}
                        };
                        for (var j = 0; j<storeModelInstances.length; j++) {
                            //find store min/max column position from csv
                            if (storeModelInstances[j].shortName && csvStoreColumnPositions[storeModelInstances[j].shortName]) {
                                var storeMinColumnPosition = csvStoreColumnPositions[storeModelInstances[j].shortName].min;
                                var storeMaxColumnPosition = csvStoreColumnPositions[storeModelInstances[j].shortName].max;
                                if (storeMinColumnPosition) {
                                    categoryMinMaxObject[categoryName].min[storeModelInstances[j].id] = Number.parseInt(csvData.data[i][storeMinColumnPosition]);
                                }
                                if (storeMaxColumnPosition) {
                                    categoryMinMaxObject[categoryName].max[storeModelInstances[j].id] = Number.parseInt(csvData.data[i][storeMaxColumnPosition]);
                                }
                            }
                        }
                        categoryMinMaxValues.push(categoryMinMaxObject);
                    }
                }
                logger.debug({
                    message: 'Configured min/max data according to store names and categories, will update the categories now',
                    categoryMinMaxValues: _.sample(categoryMinMaxValues),
                    totalCategories: categoryMinMaxValues.length,
                    functionName: 'uploadMinMaxFile',
                    options
                });

                return Promise.map(categoryMinMaxValues, function (eachCategoryMinMaxValue) {

                    return CategoryModel.updateAll({
                        name: {
                            like: Object.keys(eachCategoryMinMaxValue)[0],
                            options: 'i'
                        },
                        orgModelId: id
                    }, eachCategoryMinMaxValue[Object.keys(eachCategoryMinMaxValue)[0]])
                        .then(function (result) {
                            if (result && !result.count) {
                                failedCategories.push(Object.keys(eachCategoryMinMaxValue)[0]);
                            }
                            return Promise.resolve(result);
                        });
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not update categories with min/max values',
                    error,
                    functionName: 'uploadMinMaxFile',
                    options
                });
                return Promise.reject(error);
            })
            .then(function (result) {
                var successCount = _.where(result, {count: 1}).length;
                logger.debug({
                    message: 'Updated categories with min/max values',
                    failedCategories,
                    successCount,
                    functionName: 'uploadMinMaxFile',
                    options
                });
                successMsg = 'Updated ' + successCount + ' categories out of total ' + result.length + ' categories uploaded';
                return CategoryModel.app.models.OrgModel.updateAll({id: id}, {
                    minMaxFile: {
                        storageKey: storageKey,
                        storageBucket: storageBucket,
                        fileUrl: fileUrl,
                        uploadedAt: new Date()
                    }
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Error in parsing form data',
                    functionName: 'uploadMinMaxFile',
                    options,
                    error
                });
                return Promise.reject('Error in parsing form data');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Updated min max upload details in org model',
                    response,
                    functionName: 'uploadMinMaxFile',
                    options
                });
                return Promise.resolve(successMsg);
            });

    };

    CategoryModel.downloadMinMaxFile = function (orgModelId, options) {
        const s3 = new aws.S3({
            apiVersion: '2006-03-01',
            region: CategoryModel.app.get('awsS3Region'),
            accessKeyId: CategoryModel.app.get('awsAccessKeyId'),
            secretAccessKey: CategoryModel.app.get('awsSecretAccessKey')
        });
        return CategoryModel.app.models.OrgModel.findById(orgModelId)
            .then(function (orgModel) {
                logger.debug({
                    message: 'Will download min/max CSV file',
                    options,
                    functionName: 'downloadMinMaxFile'
                });
                var s3Bucket = orgModel.minMaxFile.storageBucket;
                var s3Key = orgModel.minMaxFile.storageKey;
                var params = {
                    Bucket: s3Bucket,
                    Key: s3Key
                };
                var url = s3.getSignedUrl('getObject', params);
                return Promise.resolve(url);

            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not get signed url for min/max file',
                    error,
                    reason: error,
                    options,
                    functionName: 'downloadMinMaxFile'
                });
                return Promise.reject('Could not get signed url for min/max multiplier file');
            });
    };

};
