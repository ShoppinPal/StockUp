'use strict';
var aws = require('aws-sdk');
var Promise = require('bluebird');
var request = require('request-promise');
var _ = require('underscore');
var path = require('path');
var modulePath = require('mongodb');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
const papaparse = require('papaparse');
const fs = Promise.promisifyAll(require('fs'));
var workerUtils = require('../utils/workers');

module.exports = function (ReportModel) {

    // https://github.com/strongloop/loopback/issues/418
    // once a model is attached to the data source
    ReportModel.on('dataSourceAttached', function (obj) {
        // wrap the whole model in Promise
        // but we need to avoid 'validate' method
        ReportModel = Promise.promisifyAll(
            ReportModel,
            {
                filter: function (name, func, target) {
                    return !( name == 'validate');
                }
            }
        );
    });

    ReportModel.ReportModelStates = {
        'REPORT_EMPTY': 'report_empty',
        'MANAGER_NEW_ORDERS': 'manager_new_orders',
        'MANAGER_IN_PROCESS': 'manager_in_process',
        'WAREHOUSE_FULFILL': 'warehouse_fulfill',
        'MANAGER_RECEIVE': 'manager_receive',
        'REPORT_COMPLETE': 'report_complete'
    };

    ReportModel.remoteMethod('getWorkerStatus', {
        accepts: [
            {arg: 'id', type: 'string', required: true}
        ],
        http: {path: '/:id/getWorkerStatus', verb: 'get'},
        returns: {arg: 'reportModelInstance', type: 'object', root: true}
    });

    ReportModel.remoteMethod('generateStockOrderReportForManager', {
        accepts: [
            {arg: 'id', type: 'string', required: true}
        ],
        http: {path: '/:id/generateStockOrderReportForManager', verb: 'get'},
        returns: {arg: 'reportModelInstance', type: 'object', root: true}
    });

    /*ReportModel.remoteMethod('getRows', {
     accepts: [
     {arg: 'id', type: 'string', required: true}
     ],
     http: {path: '/:id/rows', verb: 'get'},
     returns: {arg: 'rows', type: 'array', root:true}
     });*/

    ReportModel.remoteMethod('getRows', {
        accepts: [
            {arg: 'id', type: 'string', required: true},
            {arg: 'pageSize', type: 'number', required: false},
            {arg: 'pageNumber', type: 'number', required: false},
            {arg: 'where', type: 'object', required: false}
        ],
        http: {path: '/getRows', verb: 'get'},
        returns: {arg: 'rows', type: 'array', root: true}
    });

    ReportModel.remoteMethod('updateRows', {
        accepts: [
            {arg: 'id', type: 'string', required: true},
            {arg: 'rows', type: 'array', required: true}
        ],
        http: {path: '/updateRows', verb: 'put'}
    });

    ReportModel.remoteMethod('removeReport', {
        accepts: [
            {arg: 'id', type: 'string', required: true}
        ],
        http: {path: '/:id/remove', verb: 'post'}
    });

    ReportModel.remoteMethod('lookupAndAddProductBySku', {
        accepts: [
            {arg: 'id', type: 'string', required: true},
            {arg: 'sku', type: 'string', required: true},
            {arg: 'boxNumber', type: 'number', required: false}
        ],
        http: {path: '/:id/lookupAndAddProductBySku', verb: 'post'},
        returns: {arg: 'stockOrderLineitemModelInstance', type: 'object', root: true}
    });

    ReportModel.remoteMethod('sendReportAsEmail', {
        accepts: [
            {arg: 'id', type: 'string', required: true},
            {arg: 'toEmailArray', type: 'array', required: true},
            {arg: 'ccEmailArray', type: 'array'},
            {arg: 'bccEmailArray', type: 'array'}
        ],
        http: {path: '/:id/sendReportAsEmail', verb: 'post'},
        returns: {arg: 'emailStatus', type: 'boolean', root: true}
    });

    var ClientError = function ClientError(e) {
        return e.statusCode>=400 && e.statusCode<500;
    };
    var successHandler = function (response) {
        if (_.isArray(response)) {
            //console.log('response is an array');
            logger.debug({log: {message: 'response is an array'}});
        }
        else if (_.isObject(response)) {
            //console.log('response is an object');
            logger.debug({log: {message: 'response is an object'}});
            return Promise.resolve(response);
        }
        else if (_.isString(response)) {
            //console.log('response is a string');
            logger.debug({log: {message: 'response is an string'}});
            try {
                var responseObject = JSON.parse(response);
                //console.log(responseObject);
                return Promise.resolve(responseObject);
            }
            catch (error) {
                //console.error('caught an error: ', error);
                logger.error({err: error});
                throw error;
            }
        }
        else {
            //console.log(response);
            logger.debug({log: {response: response}});
        }
    };

    /**
     * @description Returns the report, the store it belongs to, and the configuration
     * for that particular store
     * @param id
     * @return {*}
     */
    ReportModel.getAllRelevantModelInstancesForReportModel = function (id) {
        /// TODO: once the loopback framework starts supporting the INCLUDE filter with FINDBYID() ... use it!
        return ReportModel.findById(id) // chain the promise via a return statement so unexpected rejections/errors float up
            .then(function (reportModelInstance) {
                //log.trace('print object for reportModelInstance: ', reportModelInstance);
                logger.trace({
                    log: {
                        message: 'print object for reportModelInstance',
                        reportModelInstance: reportModelInstance
                    }
                });
                // TODO: is findOne buggy? does it return a result even when there are no matches?
                return ReportModel.app.models.StoreModel.findOne( // chain the promise via a return statement so unexpected rejections/errors float up
                    {
                        where: {'api_id': reportModelInstance.outlet.id}, //assumption: there aren't any duplicate entries
                        include: 'storeConfigModel' // (4) also fetch the store-config
                    }
                )
                    .then(function (storeModelInstance) {
                        //log.trace('print object for storeModelInstance: ', storeModelInstance);
                        logger.trace({
                            log: {
                                message: 'print object for storeModelInstance',
                                storeModelInstance: storeModelInstance
                            }
                        });
                        var storeConfigInstance = storeModelInstance.storeConfigModel();
                        //log.trace('print object for storeConfigInstance: ', storeConfigInstance);
                        logger.trace({
                            log: {
                                message: 'print object for storeConfigInstance',
                                storeConfigInstance: storeConfigInstance
                            }
                        });
                        return Promise.resolve([reportModelInstance, storeModelInstance, storeConfigInstance]);
                    });
            });
    };

    ReportModel.getRows = function (id, pageSize, pageNumber, where, cb) {
        var currentUser = ReportModel.getCurrentUserModel(cb); // returns immediately if no currentUser
        if (currentUser) {
            ReportModel.findById(id)
                .then(function (reportModelInstance) {
                    //log.debug('reportModelInstance', reportModelInstance);
                    logger.debug({log: {reportModelInstance: reportModelInstance}});

                    // TODO: check if the currentUser is the $owner of ReportModel or not?
                    //log.trace('Is %s equal to %s?', reportModelInstance.userModelToReportModelId, currentUser.id); // not needed? commented out!

                    var filters = {};
                    if (_.isNumber(pageSize)) {
                        filters.limit = pageSize;
                        if (_.isNumber(pageNumber)) {
                            filters.skip = ( ( pageNumber - 1 ) * pageSize );
                        }
                    }
                    if (where) {
                        filters.where = where;
                    }
                    reportModelInstance.stockOrderLineitemModels(filters, function (err, data) {
                        if (err) {
                            //console.error(err);
                            logger.error({err: err});
                            cb(err);
                        }
                        //log.trace('data', data);
                        cb(null, data);
                    });
                });
        }
    };

    ReportModel.updateRows = function (id, rows, cb) {
        var currentUser = ReportModel.getCurrentUserModel(cb); // returns immediately if no currentUser
        if (currentUser) {
            ReportModel.findById(id)
                .then(function (reportModelInstance) {
                    //log.debug('reportModelInstance', reportModelInstance);
                    //log.debug('rows.length', rows.length);
                    logger.debug({
                        log: {
                            reportModelInstance: reportModelInstance,
                            rowsLength: rows.length
                        }
                    });

                    // TODO: check if the currentUser is the $owner of ReportModel or not?
                    //log.trace('Is %s equal to %s?', reportModelInstance.userModelToReportModelId, currentUser.id);

                    // NOTE(s):
                    // http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#initializeUnorderedBulkOp

                    // (1) Get the collection
                    var col = ReportModel.dataSource.adapter.collection('StockOrderLineitemModel');
                    //log.trace('collection', col); // not required? already commented!

                    // (2) Initialize the unordered Batch
                    var batch = col.initializeUnorderedBulkOp();

                    // (3) Add some operations to be executed
                    _.each(rows, function (row) {
                        //log.trace('_.omit(row,\'id\')', _.omit(row,'id'));
                        var ObjectID = modulePath.ObjectID;
                        // TODO: need to (a) either remove all the ObejctId(s) otherwise they'll be overwritten as Strings,
                        //      or (b) cast them properly before sending,
                        //      or (c) cast them properly and instead of sending the whole object, send the diff only
                        batch.find({'_id': new ObjectID(row.id)}).updateOne({$set: _.omit(row, 'id', 'reportId', 'userId')});
                        // TODO: updatedAt doesn't get a new timestamp
                    });

                    // (4) Execute the operations
                    batch.execute(function (err, result) {
                        //log.trace('(4) result', result);
                        cb(null);
                    }, function (error) {
                        //console.error('report-model.js - updateRows - An unexpected error occurred: ', error);
                        logger.error({
                            err: error,
                            message: 'report-model.js - updateRows - An unexpected error occurred'
                        });
                        cb(error);
                    });

                });
        }
    };

    ReportModel.removeReport = function (id, cb) {
        //log.debug('removeReport > id:', id);
        logger.debug({log: {message: `removeReport > id: ${id}`}});
        var currentUser = ReportModel.getCurrentUserModel(cb); // returns immediately if no currentUser
        if (currentUser) {
            //log.debug('removeReport > will fetch report and related models for Vend calls');
            logger.debug({log: {message: 'removeReport > will fetch report and related models for Vend calls'}});
            ReportModel.getAllRelevantModelInstancesForReportModel(id)
                .spread(function (reportModelInstance, storeModelInstance/*, storeConfigInstance*/) {
                        var conditionalPromise;
                        if (reportModelInstance.vendConsignmentId) {
                            //log.debug('removeReport > will delete Vend consignment', reportModelInstance.vendConsignmentId);
                            logger.debug({log: {message: `removeReport > will delete Vend consignment ${reportModelInstance.vendConsignmentId}`}});
                            var oauthVendUtil = require('./../../common/utils/vend')({
                                'GlobalConfigModel': ReportModel.app.models.GlobalConfigModel,
                                'StoreConfigModel': ReportModel.app.models.StoreConfigModel,
                                'currentUser': currentUser
                            });
                            conditionalPromise = oauthVendUtil.deleteStockOrder(storeModelInstance, reportModelInstance);
                        }
                        else {
                            //log.debug('removeReport > no vendConsignmentId found for deletion');
                            logger.debug({log: {message: 'removeReport > no vendConsignmentId found for deletion'}});
                            conditionalPromise = Promise.resolve();
                        }

                        return conditionalPromise.then(function () {
                            //log.debug('removeReport > will fetch related lineitems');
                            logger.debug({log: {message: 'removeReport > will fetch related lineitems'}});
                            var StockOrderLineitemModel = ReportModel.app.models.StockOrderLineitemModel;
                            return StockOrderLineitemModel.destroyAll({reportId: id}, function (err, info) {
                                //log.debug('removeReport > destroy related lineitems > DONE!', info);
                                logger.debug({
                                    log: {
                                        message: 'removeReport > destroy related lineitems > DONE!',
                                        info: info
                                    }
                                });
                                if (err) {
                                    cb(err);
                                }
                                else {
                                    return ReportModel.destroyById(id, function () {
                                        //log.debug('removeReport > destroyById(): DONE!');
                                        logger.debug({log: {message: 'removeReport > destroyById(): DONE!'}});
                                        if (err) {
                                            cb(err);
                                        }
                                        else {
                                            cb(null);
                                        }
                                    });
                                }
                            });
                        });
                    },
                    function (error) {
                        cb(error);
                    });
        }
    };

    ReportModel.lookupAndAddProductBySku = function (id, sku, boxNumber, cb) {
        var commandName = 'lookupAndAddProductBySku';
        //log.debug(commandName + ' > ', 'id:' + id, 'sku:' + sku, 'boxNumber:' + boxNumber);
        logger.debug({log: {commandName: commandName, id: id, sku: sku, boxNumber: boxNumber}});
        var currentUser = ReportModel.getCurrentUserModel(cb); // returns immediately if no currentUser
        if (currentUser) {
            //log.debug(commandName + ' >  will fetch report and related models for Vend calls');
            logger.debug({
                log: {
                    commandName: commandName,
                    message: `${commandName}  >  will fetch report and related models for Vend calls`
                }
            });
            ReportModel.getAllRelevantModelInstancesForReportModel(id)
                .spread(function (reportModelInstance, storeModelInstance/*, storeConfigInstance*/) {
                    //log.debug(commandName + ' > will loopkup product by SKU');
                    logger.debug({
                        log: {
                            commandName: commandName,
                            message: `${commandName} will lookup product by SKU`
                        }
                    });
                    var oauthVendUtil = require('./../../common/utils/vend')({
                        'GlobalConfigModel': ReportModel.app.models.GlobalConfigModel,
                        'StoreConfigModel': ReportModel.app.models.StoreConfigModel,
                        'currentUser': currentUser
                    });
                    return oauthVendUtil.lookupBySku(sku, storeModelInstance, reportModelInstance)
                        .then(function (results) {
                            // log.debug(commandName + ' > filter & dilute the search results to match the inventory for store and supplier tied with this report');
                            // log.debug(commandName + ' > results products.length: ' + results.products.length);
                            logger.debug({
                                log: {
                                    commandName: commandName,
                                    message: `${commandName} filter & dilute the search results to match the inventory for store and supplier tied with this report`,
                                    productsLength: results
                                }
                            });

                            // NOTE: there is a lot of overlap in business logic with the worker code

                            // keep only the products that have an inventory field
                            // and belong to the store/outlet of interest to us
                            // and belong to the supplier of interest to us
                            //log.debug(commandName + ' > filtering for supplier ' + reportModelInstance.supplier.name + ' and outlet ' + reportModelInstance.outlet.name);
                            logger.debug({
                                log: {
                                    commandName: commandName,
                                    message: `${commandName} > filtering for supplier ${reportModelInstance.supplier.name} and outlet ${reportModelInstance.outlet.name}`
                                }
                            });
                            var filteredProducts = _.filter(results.products, function (product) {
                                return ( product.inventory &&
                                    _.contains(_.pluck(product.inventory, 'outlet_id'), reportModelInstance.outlet.id) &&
                                    (reportModelInstance.supplier.name === product.supplier_name || reportModelInstance.supplier.name === "ANY")
                                );
                            });
                            //log.debug(commandName + ' > filtered products.length: ' + filteredProducts.length);
                            logger.debug({
                                log: {
                                    commandName: commandName,
                                    message: `${commandName} > filtered products.length: ${filteredProducts.length}`
                                }
                            });

                            // let's dilute the product data even further
                            var dilutedProducts = [];
                            _.each(filteredProducts, function (product) {
                                var neoProduct = _.pick(product, 'name', 'supply_price', 'id', 'sku', 'type', 'tags');
                                neoProduct.inventory = _.find(product.inventory, function (inv) {
                                    return inv.outlet_id === reportModelInstance.outlet.id;
                                });
                                dilutedProducts.push(neoProduct);
                            });
                            //log.debug(commandName + ' > diluted products.length: ' + _.keys(dilutedProducts).length);
                            logger.debug({
                                log: {
                                    commandName: commandName,
                                    message: ` > diluted products.length: ${_.keys(dilutedProducts).length}`
                                }
                            });

                            return Promise.resolve(dilutedProducts);
                        })
                        .then(function (dilutedProducts) {
                            //log.trace(commandName + ' > dilutedProducts:', dilutedProducts);
                            if (dilutedProducts.length === 1) {
                                var dilutedProduct = dilutedProducts[0];
                                if (dilutedProducts[0].sku !== sku) {
                                    var error = new Error('No exact matches found for given SKU. Comparison is case-sensitive.');
                                    error.statusCode = 400;
                                    logger.error(commandName + ' > ', error.statusCode, error.message);
                                    return cb(error);
                                }
                                else {
                                    // add an instance of StockOrderLineitemModel to the report
                                    //log.debug(commandName + ' > putting together data to create a StockOrderLineitemModel from:', dilutedProduct);
                                    logger.debug({
                                        log: {
                                            commandName: commandName,
                                            message: `${commandName} > putting together data to create a StockOrderLineitemModel from dilutedProduct`,
                                            dilutedProduct: dilutedProduct
                                        }
                                    });

                                    // NOTE: there is a lot of overlap in business logic with the worker code
                                    var caseQuantity = undefined;
                                    if (dilutedProduct.tags) {
                                        var tagsAsCsv = dilutedProduct.tags.trim();
                                        //console.log( 'tagsAsCsv: ' + tagsAsCsv );
                                        var tagsArray = tagsAsCsv.split(',');
                                        if (tagsArray && tagsArray.length>0) {
                                            _.each(tagsArray, function (tag) {
                                                tag = tag.trim();
                                                if (tag.length>0) {
                                                    //console.log( 'tag: ' + tag );
                                                    // http://stackoverflow.com/questions/8993773/javascript-indexof-case-insensitive
                                                    var prefix = 'CaseQuantity:'.toLowerCase();
                                                    if (tag.toLowerCase().indexOf(prefix) === 0) {
                                                        var caseQty = tag.substr(prefix.length);
                                                        //console.log('based on a prefix, adding CaseQuantity: ' +  caseQty);
                                                        caseQuantity = Number(caseQty);
                                                    }
                                                    else {
                                                        //console.log('ignoring anything without a prefix');
                                                    }
                                                }
                                            });
                                        }
                                    }

                                    var quantityOnHand = Number(dilutedProduct.inventory.count);
                                    var desiredStockLevel = Number(dilutedProduct.inventory['reorder_point']);
                                    var orderQuantity = 0;
                                    if (!_.isNaN(desiredStockLevel) && _.isNumber(desiredStockLevel)) {
                                        orderQuantity = desiredStockLevel - quantityOnHand;
                                        if (caseQuantity) {
                                            if ((orderQuantity % caseQuantity) === 0) {
                                                //console.log('NO-OP: orderQuantity is already a multiple of caseQuantity');
                                            }
                                            else {
                                                orderQuantity = Math.ceil(orderQuantity / caseQuantity) * caseQuantity;
                                            }
                                        }
                                    }
                                    else {
                                        desiredStockLevel = undefined;
                                        orderQuantity = undefined;
                                    }

                                    var StockOrderLineitemModel = ReportModel.app.models.StockOrderLineitemModel;
                                    var lineitem = {
                                        productId: dilutedProduct.id,
                                        sku: dilutedProduct.sku,
                                        name: dilutedProduct.name,
                                        quantityOnHand: quantityOnHand,
                                        desiredStockLevel: desiredStockLevel,
                                        orderQuantity: orderQuantity,
                                        caseQuantity: caseQuantity,
                                        supplyPrice: dilutedProduct.supply_price,
                                        type: dilutedProduct.type,
                                        reportId: reportModelInstance.id,
                                        userId: reportModelInstance.userModelToReportModelId
                                    };

                                    if (reportModelInstance.state === ReportModel.ReportModelStates.MANAGER_RECEIVE) {
                                        if (boxNumber === undefined || boxNumber === null) {
                                            var error = new Error('Your request did not specify which boxNumber the product should be placed in.');
                                            error.statusCode = 400;
                                            //log.error(commandName + ' > ', error.statusCode, error.message);
                                            logger.error({
                                                err: error,
                                                commandName: commandName,
                                                statusCode: error.statusCode,
                                                message: error.message
                                            });
                                            return cb(error);
                                        }
                                        else {
                                            lineitem.orderQuantity = 0;
                                            lineitem.fulfilledQuantity = 0;
                                            lineitem.state = StockOrderLineitemModel.StockOrderLineitemModelStates.BOXED; // boxed by default
                                            lineitem.boxNumber = boxNumber;
                                        }
                                    }
                                    // NOTE: ReportModel.ReportModelStates.MANAGER_IN_PROCESS also goes through this workflow
                                    //       but as of now, there isn't any reason for us to set `lineitem.state`
                                    //       for that state explicitly

                                    //log.debug(commandName + ' > will create a StockOrderLineitemModel');
                                    logger.debug({
                                        log: {
                                            commandName: commandName,
                                            message: `${commandName} > will create a StockOrderLineitemModel`
                                        }
                                    });
                                    return StockOrderLineitemModel.create(lineitem)
                                        .then(function (stockOrderLineitemModelInstance) {
                                            //log.debug(commandName + ' > created stockOrderLineitemModelInstance:', stockOrderLineitemModelInstance);
                                            logger.debug({
                                                log: {
                                                    commandName: commandName,
                                                    message: 'created stockOrderLineitemModelInstance',
                                                    stockOrderLineitemModelInstance: stockOrderLineitemModelInstance
                                                }
                                            });
                                            return cb(null, stockOrderLineitemModelInstance);
                                        });
                                }
                            }
                            else if (dilutedProducts.length>1) {
                                var error = new Error('More than one match found, SKU is not unique.');
                                error.statusCode = 400;
                                //log.error(commandName + ' > ', error.statusCode, error.message);
                                logger.error({
                                    err: error,
                                    statusCode: error.statusCode,
                                    commandName: commandName,
                                    message: error.message
                                });
                                return cb(error);
                            }
                            else if (dilutedProducts.length === 0) {
                                var error = new Error('No matches found.');
                                error.statusCode = 400;
                                //log.error(commandName + ' > ', error.statusCode, error.message);
                                logger.error({
                                    err: error,
                                    statusCode: error.statusCode,
                                    commandName: commandName,
                                    message: error.message
                                });
                                return cb(error);
                            }
                            else {
                                var error = new Error('An unexpected error occurred, could not find a match.');
                                error.statusCode = 500;
                                //log.error(commandName + ' > ', error.statusCode, error.message);
                                logger.error({
                                    log: {
                                        commandName: commandName,
                                        err: error,
                                        statusCode: error.statusCode,
                                        message: error.message
                                    }
                                });
                                return cb(error);
                            }
                        });
                })
                .catch(function (error) {
                    return cb(error);
                });
        }
    };

    ReportModel.generateStockOrderReportForManager = function (id, cb) {
        var currentUser = ReportModel.getCurrentUserModel(cb); // returns  immediately if no currentUser
        if (currentUser) {
            // (1) generate a token for the worker to use on the currentUser's behalf
            currentUser.createAccessTokenAsync(1209600)// can't be empty ... time to live (in seconds) 1209600 is 2 weeks (default of loopback)
                .then(function (newAccessToken) {
                        // (2) fetch the report, store and store-config
                        return ReportModel.getAllRelevantModelInstancesForReportModel(id)
                            .spread(function (reportModelInstance, storeModelInstance, storeConfigInstance) {
                                // (3) extract domainPrefix from store-config's posUrl
                                var posUrl = storeConfigInstance.posUrl;
                                var regexp = /^https?:\/\/(.*)\.vendhq\.com$/i;
                                var matches = posUrl.match(regexp);
                                var domainPrefix = matches[1];

                                // (4) Prepare payload for worker
                                var options = ReportModel.preparePayload(
                                    storeModelInstance,
                                    domainPrefix,
                                    newAccessToken,
                                    reportModelInstance,
                                    ReportModel.app.get('generateStockOrderWorker')
                                );
                                var queueUrl;
                                if (storeConfigInstance.usesWorkersV2 && storeConfigInstance.usesWorkersV2.generateOrders) {
                                    queueUrl = ReportModel.app.get('awsQueueUrl2');
                                }
                                else {
                                    queueUrl = ReportModel.app.get('awsQueueUrl');
                                }
                                return ReportModel.sendPayload(reportModelInstance, options, queueUrl, cb)
                                    .then(function (updatedReportModelInstance) {
                                        //log.debug('return the updated ReportModel');
                                        logger.debug({log: {message: 'return the updated ReportModel'}});
                                        cb(null, updatedReportModelInstance);
                                    });
                            });
                    },
                    function (error) {
                        cb(error);
                    });
        }
    };

    //Assumption: THis function is being called at multiple places, where workerName varies
    ReportModel.preparePayload = function (storeModelInstance, domainPrefix, newAccessToken, reportModelInstance, workerName) {
        //log.debug('prepare payload for worker');
        var vendConfig = ReportModel.app.get('integrations').vend;
        logger.debug({log: {message: 'prepare payload for worker'}});
        var supplierIdForPayload = '', supplierNameForPayload = '';
        if (reportModelInstance.supplier) {
            supplierIdForPayload = reportModelInstance.supplier.id; //TODO: excel sheet import contains only supplierName: ANY with no supplierId. Does this go undefined?
            supplierNameForPayload = reportModelInstance.supplier.name;
        }

        if (ReportModel.app.get('workerType') == "AWS") {
            return {
                json: {
                    op: workerName || ReportModel.app.get('stockOrderWorker'),
                    tokenService: 'https://{DOMAIN_PREFIX}.vendhq.com/api/1.0/token', //TODO: fetch from global-config or config.*.json
                    clientId: vendConfig.client_id,
                    clientSecret: vendConfig.client_secret,
                    tokenType: 'Bearer',
                    accessToken: storeModelInstance.storeConfigModel().vendAccessToken,
                    refreshToken: storeModelInstance.storeConfigModel().vendRefreshToken,
                    domainPrefix: domainPrefix, //'fermiyontest',
                    loopbackServerUrl: process.env['site:baseUrl'] || ReportModel.app.get('site').baseUrl,
                    //loopbackServerHost: 'mppulkit1.localtunnel.me',
                    //loopbackServerPort: '443',
                    loopbackAccessToken: newAccessToken, // let it be the full json object
                    reportId: reportModelInstance.id,
                    outletName: reportModelInstance.outlet.name,
                    supplierName: supplierNameForPayload,
                    outletId: reportModelInstance.outlet.id,//'aea67e1a-b85c-11e2-a415-bc764e10976c',
                    supplierId: supplierIdForPayload,//'c364c506-f8f4-11e3-a0f5-b8ca3a64f8f4'
                    storeConfigModelId: reportModelInstance.storeConfigModelId
                }
            };
        }
        else if (ReportModel.app.get('workerType') == "IronWorker") {
            return {
                url: ReportModel.app.get('ironWorkersUrl'),
                qs: {
                    'oauth': ReportModel.app.get('ironWorkersOauthToken'),
                    'code_name': workerName || ReportModel.app.get('stockOrderWorker'),
                    'priority': 1
                },
                json: {
                    tokenService: 'https://{DOMAIN_PREFIX}.vendhq.com/api/1.0/token', //TODO: fetch from global-config or config.*.json
                    clientId: ReportModel.app.get('vend').client_id,
                    clientSecret: ReportModel.app.get('vend').client_secret,
                    tokenType: 'Bearer',
                    accessToken: storeModelInstance.storeConfigModel().vendAccessToken,//'XN4ceup1M9Rp6Sf1AqeqarDjN9TMa06Mwr15K7lk',
                    refreshToken: storeModelInstance.storeConfigModel().vendRefreshToken,//'qSl8JF9fD2UMGAZfpsN2yr2d8XRNZgmQEKh7v5jp',
                    domainPrefix: domainPrefix, //'fermiyontest', // TODO: extract from storeConfigModelInstance.posUrl
                    loopbackServerUrl: process.env['site:baseUrl'] || ReportModel.app.get('site').baseUrl,
                    //loopbackServerHost: 'mppulkit1.localtunnel.me',
                    //loopbackServerPort: '443',
                    loopbackAccessToken: newAccessToken, // let it be the full json object
                    reportId: reportModelInstance.id,
                    outletName: reportModelInstance.outlet.name,
                    supplierName: supplierNameForPayload,
                    outletId: reportModelInstance.outlet.id,//'aea67e1a-b85c-11e2-a415-bc764e10976c',
                    supplierId: supplierIdForPayload//'c364c506-f8f4-11e3-a0f5-b8ca3a64f8f4'
                }
            };
        }
        else {
            return {
                url: ReportModel.app.get('ironWorkersUrl'),
                qs: {
                    'oauth': ReportModel.app.get('ironWorkersOauthToken'),
                    'code_name': workerName || ReportModel.app.get('stockOrderWorker'),
                    'priority': 1
                },
                json: {
                    tokenService: 'https://{DOMAIN_PREFIX}.vendhq.com/api/1.0/token', //TODO: fetch from global-config or config.*.json
                    clientId: ReportModel.app.get('vend').client_id,
                    clientSecret: ReportModel.app.get('vend').client_secret,
                    tokenType: 'Bearer',
                    accessToken: storeModelInstance.storeConfigModel().vendAccessToken,
                    refreshToken: storeModelInstance.storeConfigModel().vendRefreshToken,
                    domainPrefix: domainPrefix, //'fermiyontest', // TODO: extract from storeConfigModelInstance.posUrl
                    loopbackServerUrl: process.env['site:baseUrl'] || ReportModel.app.get('site').baseUrl,
                    //loopbackServerHost: 'mppulkit1.localtunnel.me',
                    //loopbackServerPort: '443',
                    loopbackAccessToken: newAccessToken, // let it be the full json object
                    reportId: reportModelInstance.id,
                    outletName: reportModelInstance.outlet.name,
                    supplierName: supplierNameForPayload,
                    outletId: reportModelInstance.outlet.id,//'aea67e1a-b85c-11e2-a415-bc764e10976c',
                    supplierId: supplierIdForPayload//'c364c506-f8f4-11e3-a0f5-b8ca3a64f8f4'
                }
            };
        }


    };

    ReportModel.sendPayload = function (reportModelInstance, options, queueUrl, cb) {
        //log.debug('will send a request with', 'options.json', JSON.stringify(options.json, null, 2));
        logger.debug({
            log: {
                message: 'will send a request with following options property and queueUrl',
                options: options.json,
                queueUrl: queueUrl
            }
        });

        if (ReportModel.app.get('workerType') == "IronWorker") {
            return request.post(options)
                .then(successHandler)
                .then(function (data) {
                    //log.debug('save the task info in ReportModel', JSON.stringify(data, null, 2));
                    logger.debug({log: {message: 'save the task info in ReportModel', data: data}});
                    return reportModelInstance.updateAttributes({
                        workerTaskId: data.id,
                        workerStatus: data.msg
                    });
                })
                .catch(ClientError, function (e) {
                    var message = e.response.body;
                    if (_.isObject(message)) {
                        message = JSON.stringify(message, null, 2);
                    }
                    console.error('A ClientError happened: \n'
                        + e.statusCode + ' ' + message + '\n'
                        /*+ JSON.stringify(e.response.headers,null,2)
                         + JSON.stringify(e,null,2)*/
                    );
                    // TODO: add retry logic?
                    //return Promise.reject(e.statusCode + ' ' + message); // TODO: throw unknown errors but reject well known errors?
                    cb(e.statusCode + ' ' + message);
                })
                .catch(function (e) {
                    console.error('report-model.js - generateStockOrderReportForManager - An unexpected error occurred: ', e);
                    //throw e; // TODO: throw unknown errors but reject well known errors?
                    //return Promise.reject(e);
                    cb(e);
                });
        }
        else if (ReportModel.app.get('workerType') == "AWS") {
            var AWS = require('aws-sdk');
            var sqs = new AWS.SQS({
                region: ReportModel.app.get('awsQueueRegion'),
                accessKeyId: ReportModel.app.get('awsQueueAccessKeyId'),
                secretAccessKey: ReportModel.app.get('awsQueueSecretAccessKey')
            });
            //var msg = { payload: 'a message' };
            var sqsParams = {
                MessageBody: JSON.stringify(options.json),
                QueueUrl: queueUrl
            };
            var sendMessageAsync = Promise.promisify(sqs.sendMessage, sqs);

            return sendMessageAsync(sqsParams)
                .then(successHandler)
                .then(function (data) {
                    //log.debug('save the task info in ReportModel', JSON.stringify(data, null, 2));
                    logger.debug({log: {message: 'save the task info in ReportModel', data: data}});
                    /*SQS sample response:
                     {
                     "ResponseMetadata": {
                     "RequestId": "aaa"
                     },
                     "MD5OfMessageBody": "bbb",
                     "MessageId": "ccc"
                     }*/
                    return reportModelInstance.updateAttributes({
                        workerTaskId: data.MessageId //data.id
                        //,workerStatus: data.msg
                    });
                })
                .catch(ClientError, function (e) {
                    logger.err({err: e});
                    var message = e.response.body; //TODO: TypeError: Cannot read property 'body' of undefined
                    if (_.isObject(message)) {
                        message = JSON.stringify(message, null, 2);
                    }
                    // console.error('A ClientError happened: \n'
                    //   + e.statusCode + ' ' + message + '\n'
                    //   /*+ JSON.stringify(e.response.headers,null,2)
                    //    + JSON.stringify(e,null,2)*/
                    // );
                    logger.error({
                        err: {
                            message: 'A ClientError happened',
                            statusCode: statusCode
                        }
                    });
                    // TODO: add retry logic?
                    //return Promise.reject(e.statusCode + ' ' + message); // TODO: throw unknown errors but reject well known errors?
                    cb(e.statusCode + ' ' + message);
                })
                .catch(function (e) {
                    //console.error('report-model.js - generateStockOrderReportForManager - An unexpected error occurred: ', e);
                    logger.error({
                        err: e,
                        message: 'report-model.js - generateStockOrderReportForManager - An unexpected error occurred'
                    });
                    //throw e; // TODO: throw unknown errors but reject well known errors?
                    //return Promise.reject(e);
                    cb(e);
                });
        }
        else {
            return request.post(options)
                .then(successHandler)
                .then(function (data) {
                    //log.debug('save the task info in ReportModel', JSON.stringify(data, null, 2));
                    logger.debug({log: {message: 'save the task info in ReportModel', data: data}});
                    return reportModelInstance.updateAttributes({
                        workerTaskId: data.id,
                        workerStatus: data.msg
                    });
                })
                .catch(ClientError, function (e) {
                    var message = e.response.body;
                    if (_.isObject(message)) {
                        message = JSON.stringify(message, null, 2);
                    }
                    // console.error('A ClientError happened: \n'
                    //   + e.statusCode + ' ' + message + '\n'
                    //   /*+ JSON.stringify(e.response.headers,null,2)
                    //    + JSON.stringify(e,null,2)*/
                    // );
                    logger.error({
                        err: {
                            message: 'A ClientError happened',
                            statusCode: e.statusCode
                        }
                    });
                    // TODO: add retry logic?
                    //return Promise.reject(e.statusCode + ' ' + message); // TODO: throw unknown errors but reject well known errors?
                    cb(e.statusCode + ' ' + message);
                })
                .catch(function (e) {
                    //console.error('report-model.js - generateStockOrderReportForManager - An unexpected error occurred: ', e);
                    logger.error({
                        err: e,
                        message: 'report-model.js - generateStockOrderReportForManager - An unexpected error occurred'
                    });
                    //throw e; // TODO: throw unknown errors but reject well known errors?
                    //return Promise.reject(e);
                    cb(e);
                });
        }

    };

    // DEPRECATED: remove from loopback-server and angular-UI side as well
    ReportModel.getWorkerStatus = function (id, cb) {
        if (ReportModel.app.get('workerType') == "AWS") {
            cb(null);
        }
        else if (ReportModel.app.get('workerType') == "IronWorker") {
            var currentUser = ReportModel.getCurrentUserModel(cb); // returns  immediately if no currentUser
            if (currentUser) {
                // (1) fetch the report
                ReportModel.findById(id, function (error, reportModelInstance) {
                    //log.trace('reportModelInstance:', reportModelInstance);

                    // (2) setup the iron worker client
                    var IronWorker = require('iron_worker');
                    var workerClient = new IronWorker.Client({
                        token: ReportModel.app.get('ironWorkersOauthToken'),
                        'project_id': ReportModel.app.get('ironWorkersProjectId')
                    });

                    // (3) fetch the task status
                    if (reportModelInstance.workerTaskId) {
                        workerClient.tasksGet(reportModelInstance.workerTaskId, function (error, body) {
                            if (error) {
                                console.error(error);
                                return cb(error);
                            }
                            //log.debug(JSON.stringify(body, null, 2));
                            logger.debug({log: {body: body, message: 'Fetching task status'}});
                            //return cb(null, body);
                            return reportModelInstance.updateAttributes({
                                workerStatus: body.status //body.msg || body.status
                            })
                                .then(function (updatedReportModelInstance) {
                                    //log.debug('return the updated ReportModel');
                                    logger.debug({log: {message: 'return the updated ReportModel'}});
                                    cb(null, updatedReportModelInstance);
                                });
                        });
                    }
                    else {
                        cb(null);
                    }
                });
            }
        }
        else {
            var currentUser = ReportModel.getCurrentUserModel(cb); // returns  immediately if no currentUser
            if (currentUser) {
                // (1) fetch the report
                ReportModel.findById(id, function (error, reportModelInstance) {
                    //log.trace('reportModelInstance:', reportModelInstance);

                    // (2) setup the iron worker client
                    var IronWorker = require('iron_worker');
                    var workerClient = new IronWorker.Client({
                        token: ReportModel.app.get('ironWorkersOauthToken'),
                        'project_id': ReportModel.app.get('ironWorkersProjectId')
                    });

                    // (3) fetch the task status
                    if (reportModelInstance.workerTaskId) {
                        workerClient.tasksGet(reportModelInstance.workerTaskId, function (error, body) {
                            if (error) {
                                console.error(error);
                                return cb(error);
                            }
                            //log.debug(JSON.stringify(body, null, 2));
                            logger.debug({log: {body: body}});
                            //return cb(null, body);
                            return reportModelInstance.updateAttributes({
                                workerStatus: body.status //body.msg || body.status
                            })
                                .then(function (updatedReportModelInstance) {
                                    //log.debug('return the updated ReportModel');
                                    logger.debug({log: {message: 'return the updated ReportModel'}});
                                    cb(null, updatedReportModelInstance);
                                });
                        });
                    }
                    else {
                        cb(null);
                    }
                });
            }
        }
    };

    ReportModel.setReportStatus = function (id, reportModelId, from, to, options) {
        logger.debug({
            message: `Will set report status from ${from} to ${to}`,
            options,
            reportModelId,
            functionName: 'setReportStatus'
        });
        ReportModel.findOne({
            where: {
                id: reportModelId
            },
            include: ['storeModel', 'supplierModel', {
                relation: 'orgModel',
                scope: {
                    include: {
                        relation: 'integrationModels'
                    }
                }
            }]
        })
            .then(function (reportModelInstance) {
                logger.debug({
                    message: 'Found report model',
                    reportModelInstance,
                    options,
                    functionName: 'setReportStatus'
                });
                var storeModelInstance = reportModelInstance.storeModel();
                var supplierModelInstance = reportModelInstance.supplierModel();
                var oauthVendUtil = require('./../../common/utils/vend')({
                    'OrgModel': ReportModel.app.models.OrgModel
                });
                var domainPrefix = reportModelInstance.orgModel().integrationModels()[0].domain_prefix;
                if (from === reportModelInstance.state &&
                    reportModelInstance.state === ReportModel.ReportModelStates.MANAGER_NEW_ORDERS &&
                    to === ReportModel.ReportModelStates.MANAGER_IN_PROCESS) {
                    //log.debug('inside setReportStatus() - will create a stock order in Vend');
                    logger.debug({
                        log: {
                            message: 'inside setReportStatus() - will create a stock order in Vend'
                        }
                    });
                    oauthVendUtil.createStockOrderForVend(storeModelInstance, reportModelInstance)
                        .then(function (newStockOrder) {
                                //log.debug('inside setReportStatus() - PASS - created a stock order in Vend', newStockOrder);
                                logger.debug({
                                    log: {
                                        message: 'inside setReportStatus() - PASS - created a stock order in Vend',
                                        newStockOrder: newStockOrder
                                    }
                                });
                                reportModelInstance.vendConsignmentId = newStockOrder.id;
                                reportModelInstance.vendConsignment = newStockOrder;
                                reportModelInstance.state = ReportModel.ReportModelStates.MANAGER_IN_PROCESS;
                                reportModelInstance.save()
                                    .then(function (updatedReportModelInstance) {
                                        //log.debug('inside setReportStatus() - PASS - updated the report model');
                                        logger.debug({log: {message: 'inside setReportStatus() - PASS - updated the report model'}});
                                        cb(null, updatedReportModelInstance);
                                    });
                            },
                            function (error) {
                                cb(error);
                            });
                }
                else if (from === reportModelInstance.state &&
                    reportModelInstance.state === ReportModel.ReportModelStates.MANAGER_IN_PROCESS &&
                    to === ReportModel.ReportModelStates.WAREHOUSE_FULFILL) {
                    //log.debug('inside setReportStatus() - will update the status of stock order in Vend to SENT');
                    logger.debug({log: {message: 'inside setReportStatus() - will update the status of stock order in Vend to SENT'}});
                    oauthVendUtil.markStockOrderAsSent(storeModelInstance, reportModelInstance)
                        .then(function (updatedStockOrder) {
                                //log.debug('inside setReportStatus() - PASS - updated stock order in Vend to SENT', updatedStockOrder);
                                logger.debug({
                                    log: {
                                        message: 'inside setReportStatus() - PASS - updated stock order in Vend to SENT',
                                        updatedStockOrder: updatedStockOrder
                                    }
                                });
                                reportModelInstance.vendConsignment = updatedStockOrder;
                                reportModelInstance.state = ReportModel.ReportModelStates.WAREHOUSE_FULFILL;
                                reportModelInstance.save()
                                    .then(function (updatedReportModelInstance) {
                                        //log.debug('inside setReportStatus() - PASS - updated the report model');
                                        logger.debug({log: {message: 'inside setReportStatus() - PASS - updated the report model'}});
                                        cb(null, updatedReportModelInstance);
                                    });
                            },
                            function (error) {
                                cb(error);
                            });
                }
                else if (from === reportModelInstance.state &&
                    reportModelInstance.state === ReportModel.ReportModelStates.WAREHOUSE_FULFILL &&
                    to === ReportModel.ReportModelStates.MANAGER_RECEIVE) {
                    //When submit button is pressed by warehouse manager
                    if (!reportModelInstance.vendConsignmentId) {
                        var accessTokenForWorker, updatedReportModelInstance;
                        //log.debug('inside setReportStatus() - will create a stock order in Vend (for imported order)');
                        logger.debug({
                            message: 'inside setReportStatus() - will create a stock order in Vend (for imported order)',
                            options,
                            reportModelId,
                            functionName: 'setReportStatus'
                        });
                        return oauthVendUtil.createStockOrderForVend(storeModelInstance, reportModelInstance, supplierModelInstance, options)
                            .then(function (newStockOrder) {
                                //log.debug('inside setReportStatus() - PASS - created a stock order in Vend (for imported order)', newStockOrder);
                                logger.debug({
                                    message: 'inside setReportStatus() - PASS - created a stock order in Vend (for imported order)',
                                    newStockOrder: newStockOrder,
                                    options,
                                    reportModelId,
                                    functionName: 'setReportStatus'
                                });
                                reportModelInstance.vendConsignmentId = newStockOrder.id;
                                reportModelInstance.vendConsignment = newStockOrder;
                                return reportModelInstance.save();
                            })
                            .then(function (reportModelInstance) {
                                updatedReportModelInstance = reportModelInstance;
                                //log.debug('inside setReportStatus() - PASS - updated the report model (for imported order)');
                                logger.debug({
                                    message: 'inside setReportStatus() - PASS - updated the report model (for imported order)',
                                    options,
                                    reportModelId,
                                    functionName: 'setReportStatus'
                                });
                                // (a) submit long running task as a job to iron
                                // (a.1) generate a token for the worker to use on the currentUser's behalf
                                // (a.3) Prepare payload for worker
                                var payload = ReportModel.preparePayload(
                                    storeModelInstance,
                                    domainPrefix,
                                    options.accessToken,
                                    updatedReportModelInstance,
                                    ReportModel.app.get('importStockOrderToPos')
                                );
                                var queueUrl = ReportModel.app.get('awsQueueUrl');
                                // (a.4) Submit it
                                return ReportModel.sendPayload(updatedReportModelInstance, payload, queueUrl);
                            })
                            .then(function (reportModelInstance) {
                                //log.debug('return the updated ReportModel');
                                logger.debug({
                                    message: 'return the updated ReportModel',
                                    options,
                                    reportModelId,
                                    functionName: 'setReportStatus'
                                });
                                return Promise.resolve(reportModelInstance);
                            })
                            .catch(function (error) {
                                //log.error(error);
                                logger.error({
                                    err: error,
                                    options,
                                    reportModelId,
                                    functionName: 'setReportStatus'
                                });
                                return Promise.reject(error);
                            });
                    }
                    else {
                        logger.debug({
                            message: 'inside setReportStatus() - stock order in Vend already exists (assuming generated order)',
                            options,
                            reportModelId,
                            functionName: 'setReportStatus'
                        });
                        reportModelInstance.state = ReportModel.ReportModelStates.MANAGER_RECEIVE;
                        return reportModelInstance.save()
                            .then(function (updatedReportModelInstance) {
                                // log.debug('inside setReportStatus() - updated the report model (assuming generated order)' +
                                //   ' - will kick off a worker to removeUnfulfilledProducts');
                                logger.debug({
                                    message: 'inside setReportStatus() - updated the report model (assuming generated order)  - will kick off a worker to removeUnfulfilledProducts',
                                    options,
                                    reportModelId,
                                    functionName: 'setReportStatus'
                                });


                                var payload = ReportModel.preparePayload(
                                    storeModelInstance,
                                    domainPrefix,
                                    options.accessToken,
                                    updatedReportModelInstance,
                                    ReportModel.app.get('removeUnfulfilledProducts')
                                );
                                if (ReportModel.app.get('workerType') == "IronWorker") {
                                    payload.json.op = 'removeUnfulfilledProducts';
                                }
                                else if (ReportModel.app.get('workerType') == "AWS") {

                                }
                                else {
                                    payload.json.op = 'removeUnfulfilledProducts';
                                }
                                // log.debug('inside setReportStatus() - updated the report model (assuming generated order)' +
                                //   ' removeUnfulfilledProducts > payload ready');
                                logger.debug({
                                    message: 'inside setReportStatus() - updated the report model (assuming generated order) removeUnfulfilledProducts > payload ready',
                                    options,
                                    reportModelId,
                                    functionName: 'setReportStatus'
                                });

                                // (a.4) Submit it
                                var queue = ReportModel.app.get('awsQueueUrl');
                                return ReportModel.sendPayload(updatedReportModelInstance, payload, queue, cb)
                                    .then(function (updatedReportModelInstance) {
                                        // log.debug('inside setReportStatus() - updated the report model (assuming generated order)' +
                                        //   ' removeUnfulfilledProducts > payload sent > return the updated ReportModel');
                                        logger.debug({
                                            message: 'inside setReportStatus() - updated the report model (assuming generated order)' +
                                            ' removeUnfulfilledProducts > payload sent > return the updated ReportModel',
                                            options,
                                            reportModelId,
                                            functionName: 'setReportStatus'
                                        });
                                        return Promise.resolve(updatedReportModelInstance);
                                    });
                            })
                            .catch(function (error) {
                                logger.error({
                                    error,
                                    err: error,
                                    options,
                                    reportModelId,
                                    functionName: 'setReportStatus'
                                });
                                return Promise.reject(error);
                            });
                    }
                }
                else if (from === reportModelInstance.state &&
                    reportModelInstance.state === ReportModel.ReportModelStates.MANAGER_RECEIVE &&
                    to === ReportModel.ReportModelStates.REPORT_COMPLETE) {
                    //log.debug('inside setReportStatus() - will update the state of stock order in Warehouse as REPORT_COMPLETE');
                    logger.debug({
                        log: {
                            message: 'inside setReportStatus() - will update the state of stock order in Warehouse as REPORT_COMPLETE'
                        }
                    });
                    reportModelInstance.state = ReportModel.ReportModelStates.REPORT_COMPLETE;
                    reportModelInstance.save()
                        .then(function (updatedReportModelInstance) {
                                // log.debug('inside setReportStatus() - updated the report model' +
                                //   ' - will kick off a worker to removeUnreceivedProducts');
                                logger.debug({
                                    log: {
                                        message: 'inside setReportStatus() - updated the report model' +
                                        ' - will kick off a worker to removeUnreceivedProducts'
                                    }
                                });

                                // (a) submit long running task as a job to iron
                                // (a.1) generate a token for the worker to use on the currentUser's behalf
                                return currentUser.createAccessTokenAsync(1209600)// can't be empty ... time to live (in seconds) 1209600 is 2 weeks (default of loopback)
                                    .then(function (newAccessToken) {
                                        // (a.2) extract domainPrefix from store-config's posUrl
                                        var posUrl = storeConfigInstance.posUrl;
                                        var regexp = /^https?:\/\/(.*)\.vendhq\.com$/i;
                                        var matches = posUrl.match(regexp);
                                        var domainPrefix = matches[1];

                                        // (a.3) Prepare payload for worker
                                        var options = ReportModel.preparePayload(
                                            storeModelInstance,
                                            domainPrefix,
                                            newAccessToken,
                                            updatedReportModelInstance,
                                            ReportModel.app.get('removeUnreceivedProducts')
                                        );
                                        if (ReportModel.app.get('workerType') == "IronWorker") {
                                            options.json.op = 'removeUnreceivedProducts';
                                        }
                                        else if (ReportModel.app.get('workerType') == "AWS") {

                                        }
                                        else {
                                            options.json.op = 'removeUnreceivedProducts';
                                        }

                                        // log.debug('inside setReportStatus() - updated the report model' +
                                        //   ' removeUnreceivedProducts > payload ready');
                                        logger.debug({
                                            log: {
                                                message: 'inside setReportStatus() - updated the report model' +
                                                ' removeUnreceivedProducts > payload ready'
                                            }
                                        });

                                        // (a.4) Submit it
                                        var queue = ReportModel.app.get('awsQueueUrl');
                                        return ReportModel.sendPayload(updatedReportModelInstance, options, queue, cb)
                                            .then(function (updatedReportModelInstance) {
                                                // log.debug('inside setReportStatus() - updated the report model' +
                                                //   ' removeUnreceivedProducts > payload sent > return the updated ReportModel');
                                                logger.debug({
                                                    log: {
                                                        message: 'inside setReportStatus() - updated the report model' +
                                                        ' removeUnreceivedProducts > payload sent > return the updated ReportModel'
                                                    }
                                                });
                                                cb(null, updatedReportModelInstance);
                                            });
                                    });
                            },
                            function (error) {
                                cb(error);
                            });
                }
                else {
                    cb(null, {updated: false}); // TODO: maybe use http status code 400 to indicate invalid input?
                }
            })
            .catch(function (error) {
                logger.error({
                    error,
                    err: error,
                    message: 'Could not find report model',
                    options,
                    reportModelId,
                    functionName: 'setReportStatus'
                });
                return Promise.reject(error);
            });
    };

    /**
     * @description Finds stuck orders created a day ago
     * and before that
     * @param id
     * @param limit
     * @param skip
     * @return {Promise.<T>}
     */
    ReportModel.getStuckOrders = function (id, limit, skip) {
        var date = new Date();
        var previousDate = new Date(date.setDate(date.getDate() - 1));
        var count;
        limit = limit || 10;
        skip = skip || 0;
        logger.tag('getStuckOrders').debug({
            log: {
                message: 'Will look for stuck orders',
                storeConfigModelId: id
            }
        });


        return ReportModel.count({
            storeConfigModelId: id,
            created: {
                lt: previousDate
            },
            state: 'report_empty'
        })
            .then(function (response) {
                count = response;
                return ReportModel.find({
                    limit: limit,
                    skip: skip,
                    where: {
                        storeConfigModelId: id,
                        created: {
                            lt: previousDate
                        },
                        state: 'report_empty'
                    },
                    include: 'stockOrderLineitemModels'
                })
            })
            .then(function (reports) {
                logger.tag('getStuckOrders').debug({
                    log: {
                        message: 'Found these stuck orders',
                        reports: _.pluck(reports, 'id')
                    }
                });
                return Promise.resolve({
                    stuckOrders: reports,
                    count: count
                });
            })
            .catch(function (error) {
                logger.tag('getStuckOrders').error({
                    error: error
                });
                return Promise.reject(error);
            });
    };

    ReportModel.removeStuckOrders = function (id, stuckOrders) {
        logger.tag('removeStuckOrders').debug({
            log: {
                message: 'Will remove following stuck orders',
                storeConfigModelId: id,
                stuckOrders: stuckOrders
            }
        });
        return ReportModel.destroyAll({
            storeConfigModelId: id,
            state: 'report_empty',
            id: {
                inq: stuckOrders
            }
        })
            .then(function (response) {
                logger.tag('removeStuckOrders').debug({
                    log: {
                        message: 'Removed report models, will go on to remove line items',
                        response: response
                    }
                });
                return ReportModel.app.models.StockOrderLineitemModel.destroyAll({
                    reportId: {
                        inq: stuckOrders
                    }
                });
            })
            .then(function (response) {
                logger.tag('removeStuckOrders').debug({
                    log: {
                        message: 'Removed line items',
                        response: response
                    }
                });
                return Promise.resolve(response);
            })
            .catch(function (error) {
                logger.tag('removeStuckOrders').error({
                    log: {
                        error: error
                    }
                });
                return Promise.reject('Could not remove stuck orders', error);
            });

    };

    ReportModel.sendReportAsEmail = function (id, toEmailArray, ccEmailArray, bccEmailArray, cb) {
        var nodemailer = require('nodemailer');
        const papaparse = require('papaparse');

        logger.debug({
            message: 'Received these email IDs',
            toEmailArray,
            ccEmailArray,
            bccEmailArray,
            functionName: 'sendReportAsEmail'
        });
        toEmailArray.forEach(function (eachEmail) {
            if (!validateEmail(eachEmail)) {
                cb('Invalid Primary Email: ' + eachEmail);
            }
        });
        ccEmailArray.forEach(function (eachEmail) {
            if (!validateEmail(eachEmail)) {
                cb('Invalid Cc Email: ' + eachEmail);
            }
        });
        bccEmailArray.forEach(function (eachEmail) {
            if (!validateEmail(eachEmail)) {
                cb('Invalid Bcc Email: ' + eachEmail);
            }
        });
        aws.config.region = 'us-west-2';
        var transporter = nodemailer.createTransport({
            SES: new aws.SES({
                apiVersion: '2010-12-01'
            })
        });
        var report, csvArray = [], supplier, emailSubject, totalOrderQuantity = 0, totalSupplyCost = 0, htmlForPdf, csvReport;
        ReportModel.findById(id, {
            include: ['userModel', 'storeConfigModel']
        })
            .then(function (reportModelInstance) {
                report = reportModelInstance;
                logger.debug({log: {message: 'Found this report model', report: reportModelInstance}});
                if (reportModelInstance.supplier) {
                    logger.debug({log: {message: 'Will look for supplier for the report'}});
                    return ReportModel.app.models.SupplierModel.find({
                        where: {
                            api_id: reportModelInstance.supplier.id
                        }
                    });
                }
                else {
                    logger.debug({log: {message: 'Report is not specific to a supplier, need generate email? Don\'t know what to do MAN!!!'}});
                    return Promise.resolve('noSupplier');
                }
            })
            .then(function (supplierInstance) {
                logger.debug({log: {message: 'Found this supplier', supplier: supplierInstance[0]}});
                if (supplierInstance === 'noSupplier') {
                    emailSubject = 'Order #' + report.outlet.name + ' from ' + report.storeConfigModel().name;
                }
                else {
                    if (supplierInstance[0].storeIds && supplierInstance[0].storeIds[report.outlet.outletId]) {
                        emailSubject = 'Order #' + report.outlet.name + '-' + supplierInstance[0].storeIds[report.outlet.outletId] + ' from ' + report.storeConfigModel().name;
                    }
                    else {
                        emailSubject = 'Order #' + report.outlet.name + ' from ' + report.storeConfigModel().name;
                    }
                }
                logger.debug({log: {message: 'Will look for stock line items for the report'}});
                return ReportModel.app.models.StockOrderLineitemModel.find({
                    where: {
                        reportId: id
                    }
                });
            })
            .then(function (lineItems) {
                htmlForPdf = '<html>' +
                    '<head>' +
                    '<style>' +
                    'table {' +
                    '  font-family: arial, sans-serif;' +
                    '  border-collapse: collapse;' +
                    ' font-size: 8px;' +
                    '}' +
                    'td, th {' +
                    '  border: 1px solid #dddddd;' +
                    '  text-align: left;' +
                    '  padding: 8px;' +
                    '}' +
                    '</style>' +
                    '</head>' +
                    '<body>';
                htmlForPdf += '<table>' +
                    '<tr>' +
                    '<th>SKU</th>' +
                    '<th>Ordered</th>' +
                    '<th>Product</th>' +
                    '<th>SupplierCode</th>' +
                    '<th>Supply Cost</th>' +
                    '<th>Total Supply Cost</th>' +
                    '<th>Comments</th>' +
                    '</tr>';
                htmlForPdf += '<h5>' + emailSubject + '</h5>';
                logger.debug({log: {message: 'Found ' + lineItems.length + ' line items for the report, will convert to csv'}});

                for (var i = 0; i<lineItems.length; i++) {
                    if (lineItems[i].orderQuantity>0) {

                        totalOrderQuantity += lineItems[i].orderQuantity;
                        totalSupplyCost += lineItems[i].supplyPrice * lineItems[i].orderQuantity;
                        csvArray.push({
                            'SKU': lineItems[i].sku,
                            'Ordered': lineItems[i].orderQuantity,
                            'Product': lineItems[i].name,
                            'Supplier Code': lineItems[i].supplierCode,
                            'Supply cost': lineItems[i].supplyPrice,
                            'Total supply cost': lineItems[i].supplyPrice * lineItems[i].orderQuantity,
                            'Comments': lineItems[i].comments ? lineItems[i].comments.manager_in_process : ''
                        });
                        htmlForPdf += '<tr>' +
                            '<td>' + lineItems[i].sku + '</td>' +
                            '<td>' + lineItems[i].orderQuantity + '</td>' +
                            '<td>' + lineItems[i].name + '</td>' +
                            '<td>' + lineItems[i].supplierCode + '</td>' +
                            '<td>' + lineItems[i].supplyPrice + '</td>' +
                            '<td>' + (lineItems[i].supplyPrice * lineItems[i].orderQuantity) + '</td>' +
                            '<td>' + (lineItems[i].comments ? lineItems[i].comments.manager_in_process : '') + '</td>' +
                            '</tr>';
                    }
                }
                htmlForPdf += '</table>';
                htmlForPdf += '<div><h5>Total Ordered: ' + totalOrderQuantity + '</h5>' +
                    '<h5>Total Supply Cost: ' + totalSupplyCost + '</h5></div>';
                htmlForPdf += '</body></html>';
                csvArray.push({
                    'Total Order Quantity': totalOrderQuantity,
                    'Total Supply Cost': totalSupplyCost
                });
                csvReport = papaparse.unparse(csvArray);
                return createPDFFromHTML(htmlForPdf);
            })
            .then(function (pdfAttachment) {
                var emailOptions = {
                    type: 'email',
                    to: toEmailArray.toString(),
                    cc: ccEmailArray.toString(),
                    bcc: bccEmailArray.toString(),
                    subject: emailSubject,
                    from: report.outlet.name + '\<' + report.userModel().email + '>',
                    mailer: transporter,
                    text: 'Total Order Quantity: ' + totalOrderQuantity + '\n Total Supply Cost: ' + totalSupplyCost,
                    attachments: [
                        {
                            filename: report.name + '.csv',
                            content: csvReport,
                            contentType: 'text/comma-separated-values'
                        },
                        {
                            filename: report.name + '.pdf',
                            content: pdfAttachment,
                            contentType: 'application/pdf'
                        }
                    ]
                };
                transporter.sendMail(emailOptions, function (err, success) {
                    if (err) {
                        logger.error({log: {error: err}});
                        cb(err);
                    }
                    else {
                        logger.debug({log: {message: 'Sent email successfully', response: success.messageId}});
                        cb(null, true);
                    }
                });

            })
            .catch(function (error) {
                logger.error({log: {error: error}});
                cb(error);
            });
    };

    function validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    function createPDFFromHTML(htmlForPdf) {
        const pdf = require('html-pdf');
        return new Promise(function (resolve, reject) {
            var pdfOptions = {
                border: '1cm'
            };

            pdf.create(htmlForPdf, pdfOptions).toBuffer(function (err, res) {
                if (err) {
                    logger.error({
                        message: 'Could not create PDF buffer',
                        err,
                        functionName: 'sendReportAsEmail'
                    });
                    reject('Could not convert pdf');
                }
                else {
                    logger.debug({
                        message: 'Created PDF, will attach to email',
                        functionName: 'sendReportAsEmail',
                        isBuffer: Buffer.isBuffer(res)
                    });
                    resolve(res);
                }
            });
        });
    }


    ReportModel.generateStockOrderMSD = function (orgModelId, storeModelId, warehouseModelId, categoryModelId, options) {
        logger.debug({
            message: 'Will initiate worker to generate stock order for MSD',
            storeModelId,
            warehouseModelId,
            categoryModelId,
            functionName: 'generateStockOrderMSD',
            options,
        });
        var payload = {
            orgModelId: orgModelId,
            storeModelId: storeModelId,
            warehouseModelId: warehouseModelId,
            categoryModelId: categoryModelId,
            loopbackAccessToken: options.accessToken,
            op: 'generateStockOrderMSD'
        };
        return workerUtils.sendPayLoad(payload)
            .then(function (response) {
                logger.debug({
                    message: 'Sent generateStockOrderMSD to worker',
                    options,
                    response,
                    functionName: 'generateStockOrderMSD'
                });
                return Promise.resolve('Stock order generation initiated');
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not send generateStockOrderMSD to worker',
                    options,
                    error,
                    functionName: 'generateStockOrderMSD'
                });
                return Promise.reject('Error in creating stock order');
            });
    };

    ReportModel.receiveConsignment = function (orgModelId, reportModelId, options) {
        logger.debug({
            message: 'Will initiate worker to receive order in Vend',
            reportModelId,
            functionName: 'receiveConsignment',
            options,
        });
        var payload = {
            orgModelId: orgModelId,
            reportModelId: reportModelId,
            loopbackAccessToken: options.accessToken,
            op: 'receiveConsignment'
        };
        return workerUtils.sendPayLoad(payload)
            .then(function (response) {
                logger.debug({
                    message: 'Sent receiveConsignment operation to worker',
                    options,
                    response,
                    functionName: 'receiveConsignment'
                });
                return Promise.resolve('Stock order generation initiated');
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not send receiveConsignment to worker',
                    options,
                    error,
                    functionName: 'receiveConsignment'
                });
                return Promise.reject('Error in creating stock order');
            });
    };

    ReportModel.generateStockOrderVend = function (orgModelId, storeModelId, supplierModelId, name, options) {
        logger.debug({
            message: 'Will initiate worker to generate stock order for Vend',
            storeModelId,
            supplierModelId,
            functionName: 'generateStockOrderVend',
            options,
        });
        var payload = {
            orgModelId: orgModelId,
            storeModelId: storeModelId,
            supplierModelId: supplierModelId,
            name: name,
            loopbackAccessToken: options.accessToken,
            op: 'generateStockOrderVend'
        };
        return workerUtils.sendPayLoad(payload)
            .then(function (response) {
                logger.debug({
                    message: 'Sent generateStockOrderVend to worker',
                    options,
                    response,
                    functionName: 'generateStockOrderVend'
                });
                return Promise.resolve('Stock order generation initiated');
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not send generateStockOrderVend to worker',
                    options,
                    error,
                    functionName: 'generateStockOrderVend'
                });
                return Promise.reject('Error in creating stock order');
            });
    };


    ReportModel.createPurchaseOrderVend = function (orgModelId, reportModelId, options) {
        logger.debug({
            message: 'Will initiate worker to create transfer order in MSD',
            reportModelId,
            functionName: 'createPurchaseOrderVend',
            options,
        });
        var payload = {
            orgModelId: orgModelId,
            reportModelId: reportModelId,
            loopbackAccessToken: options.accessToken,
            op: 'createPurchaseOrderVend'
        };
        var report;
        return ReportModel.findById(reportModelId)
            .then(function (reportModelInstance) {
                logger.debug({
                    message: 'Found this report model',
                    reportModelInstance,
                    options,
                    functionName: 'createPurchaseOrderVend'
                });
                report = reportModelInstance;
                if (reportModelInstance.vendConsignmentId) {
                    logger.debug({
                        message: 'Purchase order is already created for this report',
                        options,
                        functionName: 'createPurchaseOrderVend'
                    });
                    return Promise.reject('Purchase Order already created for this report');
                }
                else if (reportModelInstance.state === ReportModel.app.get('report_states').PUSHING_TO_VEND) {
                    logger.debug({
                        message: 'Purchase order creation in progress',
                        options,
                        functionName: 'createPurchaseOrderVend'
                    });
                    return Promise.reject('Purchase order creation in progress');
                }
                else if (reportModelInstance.state === ReportModel.app.get('report_states').GENERATED) {
                    logger.debug({
                        message: 'Will call createPurchaseOrderVend worker',
                        options,
                        functionName: 'createPurchaseOrderVend'
                    });
                    return workerUtils.sendPayLoad(payload);
                }
                else {
                    logger.debug({
                        message: 'Only GENERATED orders will be pushed to Vend',
                        options,
                        functionName: 'createPurchaseOrderVend'
                    });
                    return Promise.reject('Only GENERATED orders will be pushed to Vend');
                }
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not send createPurchaseOrderVend to worker',
                    options,
                    error,
                    functionName: 'createPurchaseOrderVend'
                });
                return Promise.reject('Error in creating purchase order');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Sent createPurchaseOrderVend to worker',
                    options,
                    response,
                    functionName: 'createPurchaseOrderVend'
                });
                return Promise.resolve('Sent createPurchaseOrderVend to worker');
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not update report state',
                    options,
                    error,
                    functionName: 'createPurchaseOrderVend'
                });
                return Promise.reject('Error in creating purchase order');
            });

    };

    ReportModel.sendConsignmentDelivery = function (orgModelId, reportModelId, options) {
        logger.debug({
            message: 'Finding report Model',
            reportModelId,
            options
        });
        return ReportModel.findById(reportModelId, {
            where: {
                state: ReportModel.app.get('report_states').FULFILL
            }
        })
            .catch(function (error) {
                logger.error({
                    error,
                    reason: error,
                    message: 'Could not find this report model in fulfill state',
                    options,
                    functionName: 'sendConsignmentDelivery'
                });
                return Promise.reject('Could not find this report model in fulfill state');
            })
            .then(function (reportModelInstance) {
                logger.debug({
                    message: 'Found this report model, will set it to receive state',
                    reportModelInstance,
                    options,
                    functionName: 'sendConsignmentDelivery'
                });
                return reportModelInstance.updateAttributes({
                    state: ReportModel.app.get('report_states').RECEIVE,
                    fulfilledByUserModelId: options.accessToken.userId
                });
            })
            .catch(function (error) {
                logger.error({
                    error,
                    reason: error,
                    message: 'Could not update report model state to receive',
                    options,
                    functionName: 'sendConsignmentDelivery'
                });
                return Promise.reject('Could not update report model state to receive');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Updated report state to fulfill',
                    response,
                    options,
                    functionName: 'sendConsignmentDelivery'
                });
                return Promise.resolve(true);
            });
    };


    ReportModel.createTransferOrderMSD = function (orgModelId, reportModelId, options) {
        logger.debug({
            message: 'Will initiate worker to create transfer order in MSD',
            reportModelId,
            functionName: 'createTransferOrderMSD',
            options,
        });
        var payload = {
            orgModelId: orgModelId,
            reportModelId: reportModelId,
            loopbackAccessToken: options.accessToken,
            op: 'createTransferOrderMSD'
        };
        var report;
        return ReportModel.findById(reportModelId)
            .then(function (reportModelInstance) {
                logger.debug({
                    message: 'Found this report model',
                    reportModelInstance,
                    options,
                    functionName: 'createTransferOrderMSD'
                });
                report = reportModelInstance;
                if (reportModelInstance.transferOrderNumber) {
                    logger.debug({
                        message: 'Transfer order is already created for this report',
                        options,
                        functionName: 'createTransferOrderMSD'
                    });
                    return Promise.reject('Transfer Order already created for this report');
                }
                else if (reportModelInstance.state === ReportModel.app.get('report_states').PUSHING_TO_MSD) {
                    logger.debug({
                        message: 'Transfer order creation in progress',
                        options,
                        functionName: 'createTransferOrderMSD'
                    });
                    return Promise.reject('Transfer order creation in progress');
                }
                else {
                    return workerUtils.sendPayLoad(payload);
                }
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not send generateStockOrderMSD to worker',
                    options,
                    error,
                    functionName: 'createTransferOrderMSD'
                });
                return Promise.reject('Error in creating transfer order');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Sent createTransferOrderMSD to worker',
                    options,
                    response,
                    functionName: 'createTransferOrderMSD'
                });
                return Promise.resolve('Sent createTransferOrderMSD to worker');
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not update report state',
                    options,
                    error,
                    functionName: 'createTransferOrderMSD'
                });
                return Promise.reject('Error in creating transfer order');
            });
    };

    ReportModel.fetchOrderRowCounts = function (orderIds, options) {
        logger.debug({
            message: 'Will fetch row counts for these orders',
            orderIds,
            options,
            functionName: 'fetchOrderRowCounts'
        });
        if (!(orderIds instanceof Array) || orderIds.length<1 || orderIds.length>100) {
            logger.debug({
                message: 'OrderIds should be a valid array of 1 to 100 length',
                orderIds,
                options,
                functionName: 'fetchOrderRowCounts'
            });
            return Promise.reject('OrderIds should be a valid array of 1 to 100 length');
        }

        //https://github.com/strongloop/loopback/issues/890#issuecomment-66581628
        var db = ReportModel.getDataSource();
        var orderObjectIDs = _.map(orderIds, function (eachOrderId) {
            return db.ObjectID(eachOrderId);
        });
        return db.connector.collection('StockOrderLineitemModel').aggregate([
            {
                $match: {
                    reportModelId: {
                        $in: orderObjectIDs
                    }
                }
            },
            {
                $group: {
                    _id: {
                        reportModelId: "$reportModelId"
                    },
                    totalRows: {
                        $sum: 1
                    }
                }
            }
        ]).toArray()
            .catch(function (error) {
                logger.error({
                    message: 'Error fetching order row counts',
                    error,
                    options,
                    functionName: 'fetchOrderRowCounts'
                });
                return Promise.reject('Error fetching order row counts');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Found these counts',
                    response,
                    options,
                    functionName: 'fetchOrderRowCounts'
                });
                var rowCounts = _.map(response, function (eachResponse) {
                    return {
                        reportModelId: eachResponse._id.reportModelId,
                        totalRows: eachResponse.totalRows
                    };
                });
                return Promise.resolve(rowCounts);
            });
    };

    ReportModel.downloadReportModelCSV = function (orgModelId, reportModelId, options) {
        logger.debug({
            message: 'Will download CSV report for order',
            reportModelId,
            options,
            functionName: 'downloadReportModelCSV'
        });
        var csvFile, reportModelInstance;
        var s3 = new aws.S3({
            apiVersion: '2006-03-01',
            region: ReportModel.app.get('awsS3Region'),
            accessKeyId: ReportModel.app.get('awsAccessKeyId'),
            secretAccessKey: ReportModel.app.get('awsSecretAccessKey')
        });
        var s3Bucket = ReportModel.app.get('awsS3CSVReportsBucket');
        return ReportModel.findById(reportModelId, {
            fields: ['id', 'name', 'csvGenerated']
        })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find report model',
                    error,
                    reason: error,
                    functionName: 'downloadReportModelCSV'
                });
                return Promise.reject('Could not find report model');
            })
            .then(function (response) {
                reportModelInstance = response;
                if (!reportModelInstance) {
                    logger.debug({
                        message: 'Could not find report model',
                        reportModelInstance,
                        options,
                        functionName: 'downloadReportModelCSV'
                    });
                    return Promise.reject('Couldn\'t find report model');
                }
                if (reportModelInstance.csvGenerated) {
                    logger.debug({
                        message: 'CSV already generated for report model, will fetch signed URL from S3',
                        reportModelInstance,
                        options,
                        functionName: 'downloadReportModelCSV'
                    });
                    return Promise.resolve('CSV already exists');
                }
                else {
                    logger.debug({
                        message: 'Found report model, will look for line items',
                        reportModelInstance,
                        options,
                        functionName: 'downloadReportModelCSV'
                    });
                    return ReportModel.app.models.StockOrderLineitemModel.find({
                        fields: ['orderQuantity', 'storeInventory', 'productModelId', 'originalOrderQuantity'],
                        where: {
                            reportModelId: reportModelId,
                        },
                        include: {
                            relation: 'productModel',
                            scope: {
                                fields: ['name', 'api_id']
                            }
                        }
                    })
                        .then(function (lineItems) {
                            logger.debug({
                                message: 'Found line items, will upload csv to s3',
                                count: lineItems.length,
                                reportModelId,
                                options,
                                functionName: 'downloadReportModelCSV'
                            });
                            var csvJson = [];
                            for (var i = 0; i<lineItems.length; i++) {
                                csvJson.push({
                                    'Name': lineItems[i].productModel().name,
                                    'Sku': lineItems[i].productModel().api_id,
                                    'Order Quantity': lineItems[i].orderQuantity,
                                    'Suggested Order Quantity': lineItems[i].originalOrderQuantity,
                                    'Store Inventory': lineItems[i].storeInventory,
                                    'Approved': lineItems[i].approved ? 'Yes' : 'No'
                                });
                            }
                            csvFile = papaparse.unparse(csvJson);
                            var params = {
                                Bucket: s3Bucket,
                                Key: reportModelInstance.name + '-' + reportModelInstance.id + '.csv',
                                Body: csvFile
                            };
                            var uploadAsync = Promise.promisify(s3.upload, s3);
                            return uploadAsync(params);
                        })
                        .catch(function (error) {
                            logger.error({
                                message: 'Could not upload file to S3',
                                error,
                                reason: error,
                                functionName: 'downloadReportModelCSV',
                                options
                            });
                            return Promise.reject('Could not upload file to S3');
                        })
                        .then(function (response) {
                            logger.debug({
                                message: 'Uploaded file to S3 successfully, will update report model',
                                response,
                                functionName: 'downloadReportModelCSV',
                                options
                            });
                            return ReportModel.updateAll({
                                id: reportModelId
                            }, {
                                csvGenerated: true
                            });
                        });
                }
            })
            .then(function (response) {
                logger.debug({
                    message: 'Uploaded and updated report model successfully, will fetch signed url for download',
                    response,
                    functionName: 'downloadReportModelCSV',
                    options
                });
                var params = {
                    Bucket: s3Bucket,
                    Key: reportModelInstance.name + '-' + reportModelInstance.id + '.csv'
                };
                var url = s3.getSignedUrl('getObject', params);
                return Promise.resolve(url);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not get signed url for csv report from s3',
                    error,
                    reason: error,
                    options,
                    functionName: 'downloadReportModelCSV'
                });
                return Promise.reject('Could not get signed url for csv report from s3');
            });
    }

};

