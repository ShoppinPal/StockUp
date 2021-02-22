const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});
const dbUrl = process.env.DB_URL;
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
var db = null; //database connected
const utils = require('../../jobs/utils/utils.js');
const Promise = require('bluebird');

var runMe = function (payload, config, taskId, messageId) {
    var stockOrderLineItemIds = payload.stockOrderLineItemIds;
    var reportModelId = payload.reportModelId;
    var reportModelInstance;
    try {
        logger.debug({
            commandName: commandName,
            argv: process.argv,
            stockOrderLineItemIds,
            messageId,
            payload
        });
        return Promise.resolve()
            .then(function () {
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
                    message: 'Connected to Mongo DB, will look for stockLineItem model',
                    commandName,
                    messageId
                });
                return db.collection('ReportModel').findOne({
                    _id: ObjectId(reportModelId)
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find report model instance',
                    stockOrderLineItemIds,
                    reportModelId,
                    error,
                    commandName,
                    messageId
                });
                return Promise.reject('Could not find report instances');
            })
            .then(function (reportModel) {
                logger.debug({
                    message: 'Found Report Model Instance',
                    reportModel,
                    messageId
                });
                reportModelInstance = reportModel;
                if (!utils.notReceivedStates.includes(reportModel.state)) {
                    // No need to proceed if report is not in receiving state
                    return Promise.resolve([]);
                }
                return db.collection('StockOrderLineitemModel').find({
                    _id: {
                        $in: stockOrderLineItemIds.map(function (stockOrderLineItemId) {
                            return ObjectId(stockOrderLineItemId);
                        }),
                    },
                    reportModelId: ObjectId(reportModelId)
                }).toArray();
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find StockOrderLineitemModel instances',
                    stockOrderLineItemIds,
                    error,
                    commandName,
                    messageId
                });
                return Promise.reject('Could not find StockOrderLineitemModel instances');
            })
            .then(function (lineItems){
                    logger.debug({
                        message: 'Found line items to push to vend',
                        lineItems,
                        messageId
                    });
                    return Promise.map(lineItems, function (lineItem) {
                        return Promise.delay(1000)
                            .then(function () {
                                logger.debug({
                                    message: 'Will push a line item to vend',
                                    lineItem,
                                    messageId
                                });
                                return utils.updateStockOrderLineitemForVend(db, reportModelInstance, lineItem, messageId);
                            })
                            .catch(function (error){
                                logger.error({
                                    message: 'Could not push line item to vend, will set error status to true',
                                    lineItem,
                                    error,
                                    commandName,
                                    messageId
                                });
                                return db.collection('StockOrderLineitemModel').updateOne({
                                    _id: ObjectId(lineItem._id)
                                }, {
                                    $set: {
                                        asyncPushSuccess: false
                                    }
                                });
                            })
                            .then(function () {
                                logger.debug({
                                    message: 'Pushed item to vend successfully',
                                    lineItem,
                                    messageId
                                });
                                return db.collection('StockOrderLineitemModel').updateOne({
                                    _id: ObjectId(lineItem._id)
                                }, {
                                    $set: {
                                        asyncPushSuccess: true
                                    }
                                });
                            });
                    }, { concurrency: 1 });

            })
            .catch(function (error) {
                    logger.error({
                        commandName,
                        error,
                        reason: error,
                        message: 'Could not update receiving quantities for line item',
                        messageId
                    });
                    return Promise.reject('Could not update receiving quantities for line item');
            });
        // return Promise.resolve();
    } catch (e) {
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
