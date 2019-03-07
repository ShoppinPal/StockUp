var SUCCESS = 0;
var FAILURE = 1;

var REPORT_EMPTY = 'report_empty';
var MANAGER_NEW_ORDERS = 'manager_new_orders';
var MANAGER_IN_PROCESS = 'manager_in_process';
var WAREHOUSE_FULFILL = 'warehouse_fulfill';
var MANAGER_RECEIVE = 'manager_receive';
var REPORT_COMPLETE = 'report_complete';

var BOXED = 'boxed';

const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});


var runMe = function (payload, config, taskId, messageId) {

    try {
        var Promise = require('bluebird');
        var _ = require('underscore');
        var dbUrl = process.env.DB_URL;
        var MongoClient = require('mongodb').MongoClient;
        var ObjectId = require('mongodb').ObjectID;
        var fs = require('fs');
        var utils = require('./../../jobs/utils/utils.js');
        var db = null; //database connected
        const rp = require('request-promise');
        var productInstances, inventoryInstances, reportModel, userRoles;

        logger.debug({
            messageId: messageId,
            payload: payload,
            config: config,
            taskId: taskId,
            argv: process.argv,
            env: process.env
        });

        process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;

        logger.debug({
            messageId: messageId,
            message: `This worker will generate stock order for outlet ${payload.storeModelId} and supplier ${payload.supplierModelId}`
        });
        // return utils.savePayloadConfigToFiles(payload)
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
                    message: 'Will look for user role mappings',
                    userModelId: payload.loopbackAccessToken.userId,
                    messageId
                });
                return db.collection('RoleMapping').find({
                    principalId: ObjectId(payload.loopbackAccessToken.userId)
                }).toArray();
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find user\'s role mappings',
                    messageId,
                    userModelId: payload.loopbackAccessToken.userId,
                    error
                });
                return Promise.reject('Could not find user\'s role mappings');
            })
            .then(function (roleMappings) {
                logger.debug({
                    message: 'Found user\'s role mappings, will look for user\'s roles, store and supplier info',
                    roleMappings,
                    messageId
                });
                return Promise.all([
                    db.collection('StoreModel').findOne({
                        _id: ObjectId(payload.storeModelId)
                    }),
                    db.collection('SupplierModel').findOne({
                        _id: ObjectId(payload.supplierModelId)
                    }),
                    db.collection('Role').find({
                        _id: {
                            $in: _.pluck(roleMappings, 'roleId')
                        }
                    }).toArray()
                ]);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find roles, store and supplier details',
                    error,
                    messageId
                });
                return Promise.reject('Could not find store and supplier details');
            })
            .then(function (response) {
                var storeModelInstance = response[0];
                var supplierModelInstance = response[1];
                userRoles = response[2];
                if (!storeModelInstance) {
                    logger.error({
                        message: 'Could not find store info, will exit',
                        response,
                        messageId
                    });
                    return Promise.reject('Could not find store info, will exit');
                }
                if (!supplierModelInstance) {
                    logger.error({
                        message: 'Could not find supplier info, will exit',
                        response,
                        messageId
                    });
                    return Promise.reject('Could not find supplier info, will exit');
                }
                logger.debug({
                    message: 'Found supplier and store info, will create a new report model',
                    response
                });
                var supplierStoreCode = supplierModelInstance.storeIds ? supplierModelInstance.storeIds[payload.storeModelId] : '';
                supplierStoreCode = supplierStoreCode ? '#' + supplierStoreCode : '';
                var TODAYS_DATE = new Date();
                return db.collection('ReportModel').insertOne({
                    name: storeModelInstance.name + ' - ' + supplierStoreCode + ' ' + supplierModelInstance.name + ' - ' + TODAYS_DATE.getFullYear() + '-' + (TODAYS_DATE.getMonth() + 1) + '-' + TODAYS_DATE.getDate(),
                    userModelId: ObjectId(payload.loopbackAccessToken.userId), // explicitly setup the foreignKeys for related models
                    state: REPORT_EMPTY,
                    storeModelId: ObjectId(payload.storeModelId),
                    supplierModelId: ObjectId(payload.supplierModelId),
                    orgModelId: ObjectId(payload.orgModelId),
                    createdAt: new Date()
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not create a report model',
                    error,
                    messageId
                });
                return Promise.reject('Could not create a report model');
            })
            .then(function (response) {
                logger.debug({
                    messageId: messageId,
                    response,
                    message: `Created report model, Will look for products belonging to supplier ID ${payload.supplierModelId}`
                });
                reportModel = response.ops[0];
                return db.collection('ProductModel').find({
                    $and: [
                        {
                            orgModelId: ObjectId(payload.orgModelId)
                        },
                        {
                            supplierModelId: ObjectId(payload.supplierModelId)
                        }
                    ]
                }).toArray();
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not fetch supplier products',
                    error,
                    messageId
                });
                return Promise.reject('Could not fetch supplier products');
            })
            .then(function (supplierProducts) {
                productInstances = supplierProducts;
                var productModelIds = _.pluck(supplierProducts, '_id');
                logger.debug({
                    messageId: messageId,
                    message: `Found ${supplierProducts.length} products belonging to supplier ID ${payload.supplierModelId}`
                });
                logger.debug({
                    messageId: messageId,
                    message: `Will look for their inventories for outlet id ${payload.storeModelId}`
                });
                return db.collection('InventoryModel').find({
                    $and: [
                        {
                            orgModelId: ObjectId(payload.orgModelId)
                        },
                        {
                            productModelId: {
                                $in: productModelIds
                            }
                        },
                        {
                            storeModelId: ObjectId(payload.storeModelId) //TODO: track using payload.storeModelId instead for ids consistency, but this works too
                        }
                    ]
                }).toArray();
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find inventory for products',
                    messageId,
                    error
                });
                return Promise.reject('Could not find inventory for products');
            })
            .then(function (response) {
                try {
                    inventoryInstances = response;
                    logger.debug({
                        messageId: messageId,
                        message: `Found ${inventoryInstances.length} inventories against ${productInstances.length} products`
                    });
                    var rows = [];
                    _.each(productInstances, function (eachProduct) {
                        var useRow = true;

                        var caseQuantity = undefined;
                        if (eachProduct.tags) {
                            var tagsAsCsv = eachProduct.tags.trim();
                            //logger.debug({ tagsAsCsv: tagsAsCsv });
                            var tagsArray = tagsAsCsv.split(',');
                            if (tagsArray && tagsArray.length>0) {
                                _.each(tagsArray, function (tag) {
                                    tag = tag.trim();
                                    if (tag.length>0) {
                                        //logger.debug({ tag: tag });
                                        // http://stackoverflow.com/questions/8993773/javascript-indexof-case-insensitive
                                        var prefix = 'CaseQuantity:'.toLowerCase();
                                        if (tag.toLowerCase().indexOf(prefix) === 0) {
                                            var caseQty = tag.substr(prefix.length);
                                            //logger.debug({ message: `based on a prefix, adding CaseQuantity: ${caseQty}` });
                                            caseQuantity = Number(caseQty);
                                        }
                                        else {
                                            //logger.debug({ message: 'ignoring anything without a prefix' });
                                        }
                                    }
                                });
                            }
                        }
                        var inventory = _.find(inventoryInstances, function (eachInventory) {
                            return eachInventory.productModelId.toString() === eachProduct._id.toString();
                        });
                        if (!inventory) {
                            useRow = false;
                        }
                        else {
                            var quantityOnHand = Number(inventory.inventory_level);
                            var desiredStockLevel = Number(inventory.reorder_point);
                            var orderQuantity = 0;
                            if (quantityOnHand<0) {
                                logger.debug({
                                    messageId: messageId,
                                    message: `TODO: how should negative inventory be handled? DSL minus QOH w/ a negative QOH will lead to a positive! Example: 100 - (-2) = 102`
                                });
                            }
                            if (!_.isNaN(desiredStockLevel) && _.isNumber(desiredStockLevel)) {
                                orderQuantity = desiredStockLevel - quantityOnHand;
                                if (orderQuantity>0) {
                                    useRow = true;
                                    if (caseQuantity) {
                                        if ((orderQuantity % caseQuantity) === 0) {
                                            //logger.debug({ message: 'NO-OP: orderQuantity is already a multiple of caseQuantity' });
                                        }
                                        else {
                                            orderQuantity = Math.ceil(orderQuantity / caseQuantity) * caseQuantity;
                                        }
                                    }
                                }
                                else {
                                    logger.debug({
                                        messageId: messageId,
                                        message: `do not waste time on negative or zero orderQuantity ${eachProduct.sku}`
                                    });
                                    useRow = false;
                                }
                            }
                            else {
                                //logger.debug({ messageId: messageId, message: 'give humans a chance to look over dubious data', dilutedProduct: dilutedProduct });
                                desiredStockLevel = undefined;
                                orderQuantity = undefined;
                                useRow = true;
                            }
                        }

                        if (useRow) {
                            var row = {
                                productModelId: ObjectId(eachProduct._id),
                                storeInventory: quantityOnHand,
                                desiredStockLevel: desiredStockLevel,
                                orderQuantity: orderQuantity,
                                fulfilledQuantity: orderQuantity,
                                caseQuantity: caseQuantity,
                                supplyPrice: eachProduct.supply_price,
                                supplierModelId: ObjectId(eachProduct.supplierModelId),
                                type: eachProduct.type,
                                approved: false,
                                reportModelId: ObjectId(reportModel._id),
                                userModelId: ObjectId(payload.loopbackAccessToken.userId),
                                createdAt: new Date(),
                                orgModelId: ObjectId(payload.orgModelId)
                            };
                            rows.push(row);
                            logger.debug({messageId: messageId, row: row});
                        }
                        else {
                            logger.debug({
                                messageId: messageId,
                                message: `skipping ${eachProduct.sku}`
                            });
                        }
                    });

                    logger.debug({
                        messageId: messageId,
                        message: `Saving total line items ${rows.length}`
                    });
                }
                catch (e) {
                    logger.error({
                        message: 'Error in generating line items',
                        e,
                        messageId
                    });
                }
                return db.collection('StockOrderLineitemModel').insertMany(rows);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not save line items to db',
                    messageId,
                    error
                });
                return Promise.reject('Could not save line items to db');
            })
            .then(function (response) {
                logger.debug({
                    messageId: messageId,
                    message: `Done updating the stock order line item models with required product and inventory info ${response.insertedCount}`
                });
                var reportState = _.some(userRoles, function (eachRole) {
                   return eachRole.name === 'warehouseManager' || eachRole.name === 'orgAdmin'
                }) ? WAREHOUSE_FULFILL : MANAGER_NEW_ORDERS;
                logger.debug({
                    messageId: messageId,
                    message: `Will change the status of report to ${reportState}`
                });
                return db.collection('ReportModel').updateOne({_id: ObjectId(reportModel._id)}, {
                    $set: {
                        state: reportState,
                        totalRows: response.insertedCount
                    }
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not update report status',
                    error,
                    messageId
                });
                return Promise.reject('Could not update report status');
            })
            .then(function (response) {
                logger.debug({
                    messageId: messageId,
                    message: 'Updated the report status, will exit worker now',
                    result: response.result
                });
                var options = {
                    method: 'POST',
                    uri: utils.API_URL + '/api/OrgModels/' + payload.orgModelId + '/sendWorkerStatus',
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
                    message: 'Generated stock order, will send the status to worker',
                    response,
                    messageId,
                    options
                });
                return rp(options);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not generate stock order, will send the following status',
                    err: error,
                    messageId
                });
                var options = {
                    method: 'POST',
                    uri: utils.API_URL + '/api/OrgModels/' + payload.orgModelId + '/sendWorkerStatus',
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
                    messageId
                });
                var slackMessage = 'Generate stock order MSD Worker failed for storeModelId ' + payload.storeModelId + '\n taskId' +
                    ': ' + taskId + '\nMessageId: ' + messageId;
                utils.sendSlackMessage('Worker failed', slackMessage, false);
                return rp(options);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not send status to server',
                    error,
                    messageId
                });
                return Promise.reject('Could not send status to server')
            })
            .then(function (res) {
                logger.debug({
                    message: 'Successfully sent worker status to server',
                    res,
                    messageId
                });
                return Promise.resolve('Successfully sent worker status to server');
            })
            .catch(function (error) {
                logger.error({
                    messageId: messageId,
                    message: 'last dot-catch block',
                    err: error
                });
                return Promise.reject(error);
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
