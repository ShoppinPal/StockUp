'use strict';
const csvUtils = require('../utils/csvUtils');
var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
var aws = require('aws-sdk');

module.exports = function (ReorderPointsMultiplierModel) {


    ReorderPointsMultiplierModel.uploadReorderPointsMultiplierFile = function (id, req, options) {
        logger.debug({
            message: 'Received file',
            functionName: 'uploadReorderPointsMultiplierFile',
            options
        });
        var csvData, parentCategory, storeModels, csvStoreColumnPositions = {}, minColPosition, maxColPosition, failedCategories = [];
        return csvUtils.parseCSVToJson(req, options)
            .then(function (result) {
                logger.debug({
                    message: 'JSON data for multiplier',
                    result
                });
                return Promise.resolve();
                /*csvData = result.csvData;
                 parentCategory = result.parentCategory;
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

                 /!**
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
                 *!/

                 logger.debug({
                 message: 'Captured store column positions for both min and max values',
                 csvStoreColumnPositions,
                 functionName: 'uploadReorderPointsMultiplierFile',
                 options
                 });

                 logger.debug({
                 message: 'Will find store names to match with store short names in uploaded file',
                 functionName: 'uploadReorderPointsMultiplierFile',
                 options
                 });
                 return CategoryModel.app.models.StoreModel.find({
                 orgModelId: id
                 });*/
            })
        /*.then(function (storeModelInstances) {
         logger.debug({
         message: 'Found these store models',
         storeModelInstances,
         functionName: 'uploadReorderPointsMultiplierFile',
         options
         });
         storeModels = storeModelInstances;
         var categoryMinMaxValues = [];
         for (var i = 2; i<csvData.data.length; i++) {
         //make category name like Ladies.Activewear.Bottoms.Bottoms
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
         logger.debug({
         message: 'Configured min/max data according to store names and categories, will update the categories now',
         categoryMinMaxValues,
         totalCategories: categoryMinMaxValues.length,
         functionName: 'uploadReorderPointsMultiplierFile',
         options
         });

         return Promise.map(categoryMinMaxValues, function (eachCategoryMinMaxValue) {
         var regexPattern = new RegExp(Object.keys(eachCategoryMinMaxValue)[0], 'i');
         return CategoryModel.updateAll({
         name: {
         like: regexPattern
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
         functionName: 'uploadReorderPointsMultiplierFile',
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
         functionName: 'uploadReorderPointsMultiplierFile',
         options
         });
         return Promise.resolve('Updated ' + successCount + ' categories out of total ' + result.length + ' categories uploaded');
         })
         .catch(function (error) {
         logger.error({
         message: 'Error in parsing form data',
         functionName: 'uploadReorderPointsMultiplierFile',
         options,
         error
         });
         return Promise.reject('Error in parsing form data');
         });*/

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
            Key: 'StockUp Reorder Multiplier.xlsx'
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
