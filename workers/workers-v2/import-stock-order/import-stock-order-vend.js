const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});
const multiparty = require("multiparty");
const excel = require('excel-stream');
const Promise = require('bluebird');
const _ = require('underscore');
const fs = require('fs');
const aws = require('aws-sdk');
const ObjectId = require('mongodb').ObjectID;
const utils = require('./../../jobs/utils/utils.js');
const REPORT_STATES = utils.REPORT_STATES;

let runMe = function (payload, config, taskId, messageId) {

    try {
        const dbUrl = process.env.DB_URL;
        const MongoClient = require('mongodb').MongoClient;
        let db = null; //database connected
        const rp = require('request-promise');
        let productInstances, inventoryInstances, reportModel, userRoles;
        let orderConfigModel, createdOrders;

        logger.debug({
            messageId: messageId,
            config: config,
            taskId: taskId,
            payload,
            argv: process.argv
        });

        process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;

        logger.debug({
            messageId: messageId,
            message: `This worker will import stock order`
        });
        return Promise.resolve()
            .then(function () {
                logger.debug({
                    message: 'Will connect to Mongodb',
                    messageId
                });
                return MongoClient.connect(dbUrl, {
                    promiseLibrary: Promise
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not connect to Mongodb',
                    messageId,
                    error
                });
                return Promise.reject('Could not connect to Mongodb');
            })
            .then(function (dbInstance) {
                db = dbInstance;
                logger.debug({
                    message: 'Connected to db, will fetch order config model',
                    messageId
                });
                return db.collection('OrderConfigModel').findOne({
                    _id: ObjectId(payload.orderConfigModelId)
                });
            })
            .catch(function (error) {
                logger.debug({
                    message: 'Could not find order config model instance',
                    error,
                    orderConfigModelId: payload.orderConfigModelId,
                    messageId
                });
                return Promise.reject('Could not find order config model instance');
            })
            .then(function (orderConfigModelInstance) {
                orderConfigModel = orderConfigModelInstance;
                logger.debug({
                    message: 'Found order config model instance, will read file data',
                    orderConfigModelInstance,
                    messageId
                });
                return readSpreadSheetFromS3(payload.s3params.bucket, payload.s3params.key, messageId)
            })
            .catch(function (err) {
                logger.error({
                    message: 'Could not fetch file from s3',
                    err,
                    reason: err,
                    messageId
                });
                return Promise.reject('Could not fetch file from s3');
            })
            .then(function (result) {
                logger.debug({
                    message: 'Parsed rows successfully, will map data from orderConfigModel',
                    messageId,
                    sampleRow: result[0]
                });
                return mapSpreadSheetDataToOrders(db, orderConfigModel, result, payload.loopbackAccessToken.userId, messageId);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not map spreadsheet data to orders',
                    error,
                    messageId
                });
                return Promise.reject('Could not map spreadsheet data to orders');
            })
            .then(function (result) {
                logger.debug({
                    message: 'Mapped spreadsheet data to orders, will save these orders to database',
                    ordersCount: result.length,
                    messageId
                });
                if (orderConfigModel.orderStatus === REPORT_STATES.FULFILMENT_PENDING) {
                    var fulfillOrderFromFile = require('./fulfill-order-from-file-vend');
                    return fulfillOrderFromFile.run(db, result, messageId);
                } else {
                    return createNewOrders(db, result, orderConfigModel, payload, config, taskId, messageId);
                }
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not import reports',
                    error,
                    messageId
                });
                return Promise.reject('Could not import reports');
            })
            .then(function (result) {
                var options = {
                    method: 'POST',
                    uri: utils.PUBLISH_URL,
                    json: true,
                    headers: {
                        'Authorization': payload.loopbackAccessToken.id
                    },
                    body: new utils.Notification(
                        utils.workerType.GENERATE_STOCK_ORDER_VEND,
                        payload.eventType,
                        utils.workerStatus.SUCCESS,
                        {
                            success: true,
                            reportModelId: payload.reportModelId,
                            messageId: messageId,
                            userId: payload.loopbackAccessToken.userId
                        },
                        payload.callId
                    )

                };
                logger.debug({
                    commandName: commandName,
                    message: 'Imported order from file, will send the status to worker',
                    result,
                    messageId,
                    options
                });
                return rp(options);
            })
            .catch(function (error) {
                logger.error({
                    commandName: commandName,
                    message: 'Could not import order, will send the following status',
                    reason: error,
                    messageId
                });
                var options = {
                    method: 'POST',
                    uri: utils.PUBLISH_URL,
                    json: true,
                    headers: {
                        'Authorization': payload.loopbackAccessToken.id
                    },
                    body: new utils.Notification(
                        utils.workerType.GENERATE_STOCK_ORDER_VEND,
                        payload.eventType,
                        utils.workerStatus.FAILED,
                        {
                            success: false,
                            reportModelId: payload.reportModelId,
                            messageId: messageId,
                            userId: payload.loopbackAccessToken.userId
                        },
                        payload.callId
                    )

                };
                var slackMessage = 'Import order Vend Worker failed' + messageId + '\n taskId' +
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
        logger.error({messageId: messageId, message: 'last catch block', err: e});
        throw e; // use `throw` for `catch()` and `reject` for `.catch()`
    }

};

module.exports = {
    run: runMe
};

function createNewOrders(db, result, orderConfigModel, payload, config, taskId, messageId) {
    var createdOrders;
    return createOrders(db, result, messageId)
        .catch(function (error) {
            logger.error({
                message: 'Could not save orders to database',
                error,
                messageId
            });
            return Promise.reject('Could not save orders to database');
        })
        .then(function (response) {
            createdOrders = response;
            logger.debug({
                message: 'Saved orders to db successfully',
                createdOrders,
                messageId
            });
            let notApprovedStates = [
                REPORT_STATES.APPROVAL_IN_PROCESS,
                REPORT_STATES.GENERATED,
                REPORT_STATES.PROCESSING
            ];
            if (!notApprovedStates.includes(orderConfigModel.orderStatus)) {
                logger.debug({
                    message: `Orders should be in state ${orderConfigModel.orderStatus}, will push order to Vend`,
                    messageId
                });
                return Promise.map(createdOrders, function (eachCreatedOrder) {
                    return Promise.resolve()
                        // Call generate worker
                        .then(function (){
                            let generatePurchaseOrderVend = require('../generate-purchase-order-vend/generate-purchase-order-vend');
                            let purchaseOrderPayload = {
                                loopbackAccessToken: payload.loopbackAccessToken,
                                orgModelId: ObjectId(orderConfigModel.orgModelId),
                                reportModelId: ObjectId(eachCreatedOrder._id) //get the reportModelId from lineItem saved
                            };
                            return generatePurchaseOrderVend.run(purchaseOrderPayload, config, taskId, messageId);
                        })
                        // get state of report after generate
                        .then(function (){
                            return db.collection('ReportModel')
                                .findOne({
                                    _id: ObjectId(eachCreatedOrder._id)
                                });
                        })
                        // Update State to desired State
                        .then(function (reportInstance){
                            if (reportInstance.state !== REPORT_STATES.ERROR_SENDING_TO_SUPPLIER) {
                                return db.collection('ReportModel').updateOne({
                                    _id: ObjectId(eachCreatedOrder._id)
                                }, {
                                    $set: {
                                        state: orderConfigModel.orderStatus
                                    }
                                });
                            }

                            return Promise.resolve();
                        });

                }, {
                    concurrency: 1 //don't want to refresh vend access token for all orders
                });
            }
            else {
                logger.debug({
                    message: `Orders should be in state ${orderConfigModel.orderStatus}, need not push order to Vend`,
                    messageId
                });
                return Promise.map(createdOrders, function (eachCreatedOrder) {
                    return Promise.resolve()
                        .then(function() {
                            return db.collection('ReportModel').updateOne({
                                _id: ObjectId(eachCreatedOrder._id)
                            }, {
                                $set: {
                                    state: orderConfigModel.orderStatus
                                }
                            });
                        });
                });
            }
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not push order to Vend',
                error,
                reason: error,
                messageId
            });
            return Promise.reject('Could not push order to Vend');
        })
        .then(function () {
            return Promise.resolve(createNewOrders);
        });
}



function readSpreadSheetFromS3(s3Bucket, s3BucketKey, messageId) {
    let spreadSheetRows = [];
    let s3 = new aws.S3({
        apiVersion: '2006-03-01',
        region: process.env.AWS_S3_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
    let params = {
        Bucket: s3Bucket,
        Key: s3BucketKey
    };
    return new Promise(function (resolve, reject) {
        s3.getObject(params).createReadStream()
            .pipe(excel({enclosedChar: '"'}))
            .on('data', function (rows) {
                if (rows)
                    spreadSheetRows.push(rows);
            })
            .on('error', function (err) {
                logger.error({
                    message: 'Error parsing spreadsheet data',
                    err,
                    reason: err,
                    messageId
                });
                reject('Error parsing spreadsheet data');
            })
            .on('end', function () {
                logger.debug({
                    message: 'Parsed rows successfully',
                    messageId
                });
                resolve(spreadSheetRows);
            });
    });
}


function readFileData(req, messageId) {
    return new Promise(function (resolve, reject) {
        let form = new multiparty.Form();
        form.parse(req, function (err, fields, files) {
            if (err) {
                logger.error({
                    message: 'Error in parsing form data',
                    functionName: 'readFileData',
                    messageId
                });
                reject(err);
            }else {
                //TODO: add file and fields validation
                logger.debug({
                    message: 'Received the following file, will parse it to json',
                    files,
                    fields,
                    functionName: 'readFileData',
                    messageId
                });
                // let fileData = fs.readFileSync(files.file[0].path, 'utf8');
                let fileData = files.file[0].path;
                resolve({
                    fileData: fileData
                });
            }
        });
    });
}

function mapSpreadSheetDataToOrders(db, orderConfigModel, spreadSheetRows, userModelId, messageId) {
    let reportModelsToCreate = [], lineItemsToCreate = [];
    let supplierStoreCodeFileHeader = _.findWhere(orderConfigModel.mappings.Store, {stockupHeader: 'supplierStoreId'}).fileHeader;
    let supplierStoreCodes = _.uniq(_.pluck(spreadSheetRows, supplierStoreCodeFileHeader));
    let skuFileHeader = _.findWhere(orderConfigModel.mappings.Product, {stockupHeader: 'sku'}).fileHeader;
    let orderQuantityFileHeader = _.findWhere(orderConfigModel.mappings.Inventory, {stockupHeader: 'orderQuantity'}).fileHeader;
    let fulfilledQuantityFileHeader = _.findWhere(orderConfigModel.mappings.Inventory, {stockupHeader: 'fulfilledQuantity'}).fileHeader;
    let skusToAdd = _.uniq(_.pluck(spreadSheetRows, skuFileHeader));
    //just to make sure to st\ringify if any sku contains just numbers
    let skusToAddStringified = _.map(skusToAdd, function (eachSku) {
        return typeof eachSku === 'string' ? eachSku : JSON.stringify(eachSku);
    });
    let productModelInstances, storeModelInstances;
    //remove the rows that have 0 as order quantity
    spreadSheetRows = _.reject(spreadSheetRows, function (eachSpreadSheetRow) {
        return eachSpreadSheetRow[orderQuantityFileHeader] === 0;
    });
    logger.debug({
        message: 'Found following store codes and skus, will find product models',
        supplierStoreCodes,
        suppliersCount: supplierStoreCodes.length,
        skuCount: skusToAdd.length,
        skusToAddStringified,
        messageId
    });
    return db.collection('ProductModel').aggregate([
        {
            $match: {
                $and: [
                    {
                        orgModelId: ObjectId(orderConfigModel.orgModelId)
                    },
                    {
                        sku: {
                            $in: skusToAddStringified
                        }
                    }
                ]

            }
        },
        {
            $lookup: {
                from: "CategoryModel",
                localField: "categoryModelId",
                foreignField: "_id",
                as: "categoryModel"
            }
        }
    ]).toArray()
        .then(function (response) {
            productModelInstances = response;
            logger.debug({
                message: 'Found product instances, will find supplier model instances',
                count: productModelInstances.length,
                sample: productModelInstances[0],
                messageId
            });
            let supplierModelIds = _.uniq(_.pluck(productModelInstances, 'supplierModelId'));
            return db.collection('SupplierStoreMapping').find({
                supplierModelId: {
                    $in: supplierModelIds
                }
            }).toArray();
        })
        .then(function (supplierStoreMappings) {
            logger.debug({
                message: 'Found supplier model instances',
                count: supplierStoreMappings.length,
                sample: supplierStoreMappings[0],
                messageId
            });
            _.each(spreadSheetRows, function (eachSpreadSheetRow) {
                if (eachSpreadSheetRow[orderQuantityFileHeader]) {

                    let productFound = _.find(productModelInstances, function (eachProductModelInstance) {
                        return eachProductModelInstance.sku == eachSpreadSheetRow[skuFileHeader];
                    });
                    if (productFound) {
                        eachSpreadSheetRow.productModelId = productFound._id;
                        eachSpreadSheetRow.productModelName = productFound.name;
                        eachSpreadSheetRow.productModelSku = productFound.sku;
                        eachSpreadSheetRow.supplierModelId = productFound.supplierModelId;
                        eachSpreadSheetRow.categoryModelId = productFound.categoryModelId;
                        eachSpreadSheetRow.categoryModelName = productFound.categoryModel && productFound.categoryModel.length ? productFound.categoryModel[0].name : 'No Category';
                        eachSpreadSheetRow.supplyPrice = productFound.supply_price;
                        eachSpreadSheetRow.binLocation = productFound.binLocation;
                        eachSpreadSheetRow.groupBy = eachSpreadSheetRow[orderConfigModel.groupBy];
                        let correspondingSupplierStoreMapping = _.find(supplierStoreMappings, function (eachMapping) {
                            return (
                                    typeof eachSpreadSheetRow[supplierStoreCodeFileHeader] === 'string' ?
                                        eachSpreadSheetRow[supplierStoreCodeFileHeader] :
                                        JSON.stringify(eachSpreadSheetRow[supplierStoreCodeFileHeader])) ===
                                eachMapping.storeCode;
                        });
                        eachSpreadSheetRow.storeModelId = correspondingSupplierStoreMapping ? correspondingSupplierStoreMapping.storeModelId : '';
                        let existingOrderIndex = _.findIndex(reportModelsToCreate, function (eachOrder) {
                            return eachSpreadSheetRow.supplierModelId.toString() === eachOrder.supplierModelId.toString() &&
                                eachSpreadSheetRow.storeModelId.toString() === eachOrder.storeModelId.toString() &&
                                eachSpreadSheetRow.groupBy === eachOrder.groupBy;
                        });
                        let approvedStates = [
                            REPORT_STATES.FULFILMENT_PENDING,
                            REPORT_STATES.FULFILMENT_IN_PROCESS,
                            REPORT_STATES.RECEIVING_PENDING,
                            REPORT_STATES.RECEIVING_IN_PROCESS,
                            REPORT_STATES.COMPLETE
                        ];
                        let fulfilledStates = [
                            REPORT_STATES.RECEIVING_PENDING,
                            REPORT_STATES.RECEIVING_IN_PROCESS,
                            REPORT_STATES.COMPLETE
                        ];
                        let receivedStates = [
                            REPORT_STATES.COMPLETE
                        ];

                        let isApproved = approvedStates.includes(orderConfigModel.orderStatus) || null; // move to 'Needs Review'
                        let isFulfilled = fulfilledStates.includes(orderConfigModel.orderStatus) || null;
                        let isReceived = receivedStates.includes(orderConfigModel.orderStatus);
                        let lineItem = {
                            productModelId: ObjectId(eachSpreadSheetRow.productModelId),
                            productModelName: eachSpreadSheetRow.productModelName, //need for sorting
                            productModelSku: eachSpreadSheetRow.productModelSku, //need for sorting
                            storeModelId: ObjectId(eachSpreadSheetRow.storeModelId),
                            orgModelId: ObjectId(orderConfigModel.orgModelId),
                            orderQuantity: eachSpreadSheetRow[orderQuantityFileHeader],
                            originalOrderQuantity: eachSpreadSheetRow[orderQuantityFileHeader],
                            fulfilledQuantity: eachSpreadSheetRow[fulfilledQuantityFileHeader],
                            categoryModelId: ObjectId(eachSpreadSheetRow.categoryModelId),
                            categoryModelName: eachSpreadSheetRow.categoryModelName, //need for sorting
                            binLocation: eachSpreadSheetRow.binLocation,
                            supplyPrice: eachSpreadSheetRow.supplyPrice,
                            approved: isApproved,
                            fulfilled: isFulfilled,
                            received: isReceived,
                            userModelId: ObjectId(userModelId),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        if (existingOrderIndex === -1) {

                            let name = orderConfigModel.orderName;
                            _.each(orderConfigModel.orderNameSuffixes, function (eachSuffix) {
                                if (eachSpreadSheetRow[eachSuffix.header]) {
                                    name += '_' + eachSpreadSheetRow[eachSuffix.header];
                                }
                                else {
                                    name += '_' + eachSuffix.defaultValue
                                }
                            });
                            let newOrder = {
                                storeModelId: ObjectId(eachSpreadSheetRow.storeModelId),
                                supplierModelId: ObjectId(eachSpreadSheetRow.supplierModelId),
                                name: name,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                state: orderConfigModel.orderStatus,
                                orgModelId: ObjectId(orderConfigModel.orgModelId),
                                userModelId: ObjectId(userModelId),
                                lineItems: [lineItem],
                                groupBy: eachSpreadSheetRow[orderConfigModel.groupBy]
                            };
                            reportModelsToCreate.push(newOrder);
                        }
                        else {
                            reportModelsToCreate[existingOrderIndex].lineItems.push(lineItem);
                        }
                    }
                    else {
                        logger.debug({
                            message: 'Could not find corresponding product for this item',
                            eachSpreadSheetRow,
                            messageId
                        });
                    }
                }
            });
            logger.debug({
                message: 'Successfully created orders',
                messageId
            });
            return Promise.resolve(reportModelsToCreate);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not create orders',
                error,
                messageId
            });
            return Promise.reject('Could not create orders');
        });
}

function createOrders(db, orders, messageId) {
    let createdOrders = [];
    return Promise.map(orders, function (eachOrder) {
        logger.debug({
            message: 'Will look for supplier\'s virtual store',
            eachOrder,
            messageId
        });
        return db.collection('StoreModel').findOne({
            ownerSupplierModelId: ObjectId(eachOrder.supplierModelId)
        })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find supplier\'s virtual store',
                    eachOrder,
                    messageId
                });
                return Promise.reject('Could not find supplier\'s virtual store');
            })
            .then(function (storeModelInstance) {
                if (!storeModelInstance) {
                    logger.error({
                        message: 'Could not find supplier\'s virtual store',
                        eachOrder,
                        messageId
                    });
                    return Promise.reject('Could not find supplier\'s virtual store');
                }
                logger.debug({
                    message: 'Found supplier\'s virtual store',
                    storeModelInstance,
                    messageId
                });
                eachOrder.deliverFromStoreModelId = ObjectId(storeModelInstance._id);
                eachOrder.importedFromFile = true;
                return db.collection('ReportModel').insert(
                    Object.assign(
                        {},
                        _.omit(eachOrder, 'lineItems', 'groupBy'),
                        {
                            state: ""
                        }
                    )

                );
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not create report model',
                    error,
                    reason: error,
                    messageId
                });
                return Promise.reject('Could not create report model');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Created order',
                    response,
                    messageId
                });
                createdOrders.push(response.ops[0]);
                return db.collection('StockOrderLineitemModel').insertMany(_.map(eachOrder.lineItems, function (eachLineItem) {
                    return _.extend(eachLineItem, {reportModelId: ObjectId(response.ops[0]._id)});
                }));
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not create line items',
                    error,
                    messageId
                });
                return Promise.resolve('Could not create line items, move on to next order?');
            });
    })
        .then(function (response) {
            logger.debug({
                message: 'Saved orders to db successfully',
                createdOrders,
                messageId
            });
            return Promise.resolve(createdOrders);
        });
}
