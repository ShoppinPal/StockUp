const REPORT_EMPTY = 'Executing...';
const REPORT_COMPLETE = 'Complete';
const REPORT_ERROR = 'Error';
const logger = require('sp-json-logger')();
const sql = require('mssql');
const dbUrl = process.env.DB_URL;
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
var db = null; //database connected
const utils = require('./../../jobs/utils/utils.js');
const path = require('path');
sql.Promise = require('bluebird');
const _ = require('underscore');
const Promise = require('bluebird');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const TODAYS_DATE = new Date();
const rp = require('request-promise');
var runMe = function (payload, config, taskId, messageId) {

    var orgModelId = payload.orgModelId;
    var storeModelId = payload.storeModelId;
    try {
        // Global variable for logging

        logger.debug({
            commandName: commandName,
            argv: process.argv,
            env: process.env,
            orgModelId,
            storeModelId,
            messageId
        });

        try {
            logger.debug({
                commandName: commandName,
                message: 'This worker will generate a stock order for the given store',
                orgModelId,
                storeModelId,
                messageId
            });
            return Promise.resolve()
                .then(function (pool) {
                    logger.debug({
                        message: 'Will connect to Mongo DB',
                        commandName,
                        messageId
                    });
                    return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not connect to Mongo DB',
                        error,
                        commandName,
                        messageId
                    });
                    return Promise.reject('Could not connect to Mongo DB');
                })
                .then(function (dbInstance) {
                    db = dbInstance;
                    logger.debug({
                        message: 'Connected to Mongo DB',
                        commandName,
                        messageId
                    });
                    return generateStockOrder(payload, config, taskId, messageId);
                })
                .then(function (result) {
                    var options = {
                        method: 'POST',
                        uri: utils.API_URL + '/api/OrgModels/' + orgModelId + '/sendWorkerStatus',
                        json: true,
                        headers: {
                            'Authorization': payload.loopbackAccessToken.id
                        },
                        body: {
                            messageId: messageId,
                            userId: payload.loopbackAccessToken.userId,
                            data: {
                                success: true
                            }
                        }
                    };
                    logger.debug({
                        commandName: commandName,
                        message: 'Generated stock order, will send the status to worker',
                        result,
                        messageId,
                        options
                    });
                    return rp(options);
                })
                .catch(function (error) {
                    logger.error({
                        commandName: commandName,
                        message: 'Could not generate stock order, will send the following status',
                        err: error,
                        messageId
                    });
                    var options = {
                        method: 'POST',
                        uri: utils.API_URL + '/api/OrgModels/' + orgModelId + '/sendWorkerStatus',
                        json: true,
                        headers: {
                            'Authorization': payload.loopbackAccessToken.id
                        },
                        body: {
                            messageId: messageId,
                            userId: payload.loopbackAccessToken.userId,
                            data: {
                                success: false
                            }
                        }
                    };
                    logger.debug({
                        message: 'Could not insert line items to report model, will send the following error',
                        error,
                        options,
                        commandName,
                        messageId
                    });
                    var slackMessage = 'Generate stock order MSD Worker failed for storeModelId ' + storeModelId + '\n taskId' +
                        ': ' + taskId + '\nMessageId: ' + messageId;
                    utils.sendSlackMessage('Worker failed', slackMessage, false);
                    return rp(options);
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not send status to server',
                        error,
                        commandName,
                        messageId
                    });
                    return Promise.reject('Could not send status to server')
                })
                .then(function (res) {
                    logger.debug({
                        message: 'Successfully sent worker status to server',
                        res,
                        commandName,
                        messageId
                    });
                    return Promise.resolve('Successfully sent worker status to server');
                })
                .finally(function () {
                    logger.debug({
                        commandName: commandName,
                        message: 'Closing database connection',
                        messageId
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
                        err: error,
                        messageId
                    });
                    return Promise.resolve();
                    //TODO: set a timeout, after which close all listeners
                });
        }
        catch (e) {
            logger.error({
                commandName: commandName, message: '2nd last catch block', err: e,
                messageId
            });
            throw e;
        }
    }
    catch (e) {
        logger.error({
            message: 'last catch block', err: e,
            messageId
        });
        throw e;
    }
};


module.exports = {
    run: runMe
};

function generateStockOrder(payload, config, taskId, messageId) {
    var orgModelId = payload.orgModelId;
    var storeModelId = payload.storeModelId;
    logger.debug({
        message: 'Will generate stock order for the following store',
        storeModelId,
        orgModelId,
        commandName,
        messageId
    });
    logger.debug({
        message: 'Looking for store in database',
        storeModelId,
        orgModelId,
        commandName,
        messageId
    });
    var reportModel, totalRows;
    return db.collection('StoreModel').findOne({
        _id: ObjectId(storeModelId)
    })
        .catch(function (error) {
            logger.error({
                message: 'Could not find a store with this id',
                storeModelId,
                error,
                commandName,
                messageId
            });
            return Promise.reject('Could not find a store with this id');
        })
        .then(function (storeModelInstance) {
            logger.debug({
                message: 'Found store, will create a report model',
                storeModelInstance,
                commandName,
                messageId
            });
            return db.collection('ReportModel').insert({
                name: storeModelInstance.name + ' - ' + TODAYS_DATE.getFullYear() + '-' + (TODAYS_DATE.getMonth() + 1) + '-' + TODAYS_DATE.getDate(),
                orgModelId: ObjectId(orgModelId),
                storeModelId: ObjectId(storeModelId),
                created: new Date(),
                updated: new Date(),
                state: REPORT_EMPTY
            });
        })
        .catch(function (error) {
            logger.error({
                error,
                message: 'Could not create report model for this store',
                storeModelId,
                commandName,
                messageId
            });
            return Promise.reject('Could not create report model for this store');
        })
        .then(function (result) {
            reportModel = result.ops[0];
            logger.debug({
                message: 'Created report model instance for store, will generate new reorder points',
                result,
                commandName,
                messageId
            });
            var generateReorderPointsMSD = require('./../generate-reorder-points/generate-reorder-points-msd');
            return generateReorderPointsMSD.run(payload, config, taskId, messageId);
        })
        .then(function (result) {
            logger.debug({
                message: 'Created reorder points for store, will find its inventory models',
                result,
                commandName,
                messageId
            });
            return db.collection('InventoryModel').find({
                $and: [
                    {
                        storeModelId: ObjectId(storeModelId)
                    },
                    {
                        $where: 'this.inventory_level <= this.reorder_threshold'
                    }
                ]
            }).toArray()
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not find the inventory model instances of the store, will exit',
                error,
                commandName,
                orgModelId,
                storeModelId,
                messageId
            });
            return Promise.reject(error);
        })
        .then(function (inventoryModelInstances) {
            logger.debug({
                message: 'Found inventory model instances with inventory level less than reorder threshold',
                count: inventoryModelInstances.length,
                commandName,
                storeModelId,
                orgModelId,
                messageId
            });
            var lineItemsToOrder = [];
            for (var i = 0; i<inventoryModelInstances.length; i++) {
                lineItemsToOrder.push({
                    reportModelId: ObjectId(reportModel._id),
                    productModelId: ObjectId(inventoryModelInstances[i].productModelId),
                    storeModelId: ObjectId(storeModelId),
                    orgModelId: ObjectId(orgModelId),
                    orderQuantity: inventoryModelInstances[i].reorder_point - inventoryModelInstances[i].inventory_level,
                    fulfilledQuantity: inventoryModelInstances[i].reorder_point - inventoryModelInstances[i].inventory_level,
                    state: 'unboxed',
                    approved: false
                });
            }
            totalRows = lineItemsToOrder.length;
            logger.debug({
                message: 'Prepared to push these items to stock order',
                lineItemsToOrder,
                commandName,
                messageId
            });
            return db.collection('StockOrderLineitemModel').insertMany(lineItemsToOrder);
        })
        .catch(function (error) {
            logger.debug({
                message: 'Could not insert line items to report model',
                error,
                commandName,
                messageId
            });
            return Promise.resolve('ERROR_REPORT');
        })
        .then(function (result) {
            if (result === 'ERROR_REPORT') {
                logger.debug({
                    message: 'Will update report model with error',
                    error,
                    commandName,
                    messageId
                });
                return db.collection('ReportModel').updateOne({
                    _id: reportModel._id
                }, {
                    $set: {
                        state: REPORT_ERROR,
                        totalRows: totalRows
                    }
                });
            }
            else {
                logger.debug({
                    message: 'Inserted items into report model successfully, will update report model',
                    result,
                    commandName,
                    messageId
                });
                return db.collection('ReportModel').updateOne({
                    _id: reportModel._id
                }, {
                    $set: {
                        state: REPORT_COMPLETE,
                        totalRows: totalRows
                    }
                });
            }
        });
}
