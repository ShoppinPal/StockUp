const logger = require('sp-json-logger')();
const sql = require('mssql');
const dbUrl = process.env.DB_URL;
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
var db = null; //database connected
const utils = require('./../../jobs/utils/utils.js');
const msdUtils = require('./../../jobs/utils/msd');
const path = require('path');
sql.Promise = require('bluebird');
const Promise = require('bluebird');
const PRODUCT_CATEGORIES_ENTITY = 'ProductCategories';
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

var runMe = function (orgModelId) {
    try {
        logger.debug({
            commandName: commandName,
            message: 'This worker will fetch and save category data from MSD to Stockup'
        });
        return Promise.resolve()
            .then(function () {
                logger.debug({
                    message: 'Will connect to Mongo DB',
                    commandName
                });
                return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not connect to Mongo DB',
                    error,
                    commandName
                });
                return Promise.reject('Could not connect to Mongo DB');
            })
            .then(function (dbInstance) {
                db = dbInstance;
                logger.debug({
                    message: 'Connected to Mongo DB',
                    commandName
                });
                return fetchAndSaveProductCategories(db, orgModelId, 'ProductCategories');
            })
            .catch(function (error) {
                logger.error({
                    commandName: commandName,
                    message: 'Could not fetch and save categories',
                    err: error
                });
                return Promise.reject(error);
            })
            .finally(function () {
                logger.debug({
                    commandName: commandName,
                    message: 'Closing database connection'
                });
                if (db) {
                    return db.close();
                }
                return Promise.resolve();
            })
            .catch(function (error) {
                logger.error({
                    commandName: commandName,
                    message: 'Could not close db connection',
                    err: error
                });
                return Promise.resolve();
                //TODO: set a timeout, after which close all listeners
            });
    }
    catch (e) {
        logger.error({commandName: commandName, message: '2nd last catch block', err: e});
        throw e;
    }

};


module.exports = {
    run: runMe
};

function fetchAndSaveProductCategories(db, orgModelId) {

    return msdUtils.fetchMSDData(db, orgModelId, PRODUCT_CATEGORIES_ENTITY)
        .catch(function (error) {
            logger.error({
                error,
                message: 'Could not fetch MSD Data',
                orgModelId: orgModelId,
                functionName: 'fetchAndSaveProductCategories'
            });
            return Promise.reject('Could not fetch MSD Data');
        })
        .then(function (categories) {
            if (categories.value && categories.value.length) {
                logger.debug({
                    message: 'Found categories from MSD, will save to DB',
                    numberOfCategories: categories.value.length,
                    functionName: 'fetchAndSaveProductCategories'
                });
                var batch = db.collection('CategoryModel').initializeUnorderedBulkOp();
                for (var i = 0; i<categories.value.length; i++) {
                    if (categories.value[i].CategoryName.length) {
                        batch.find({
                            name: categories.value[i].CategoryName,
                            orgModelId: ObjectId(orgModelId),
                        }).upsert().update({
                            $set: {
                                name: categories.value[i].CategoryName,
                                updatedAt: new Date()
                            }
                        });
                    }
                }

                if (batch.s && batch.s.currentBatch && batch.s.currentBatch.operations) {
                    return batch.execute();
                }
                else {
                    return Promise.resolve('NO_CATEGORIES');
                }

            }
            else {
                logger.debug({
                    message: 'No categories found in MSD',
                    orgModelId: orgModelId,
                    functionName: 'fetchAndSaveProductCategories'
                });
                return Promise.reject('No categories found in MSD');
            }
        })
        .then(function (result) {
            logger.debug({
                message: 'Saved categories to DB',
                result: result,
                functionName: 'fetchAndSaveProductCategories'
            });
            return Promise.resolve(true);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not create categories',
                orgModelId: orgModelId,
                error,
                functionName: 'fetchAndSaveProductCategories'
            });
            return Promise.reject('Could not create categories for org');
        });
}
