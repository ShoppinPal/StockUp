var runMe = function (payload, config, taskId, messageId) {
    //TODO: this should come from payload
    var dbUrl = process.env.DB_URL;

    const logger = require('sp-json-logger');

    try {
        var utils = require('./../../jobs/utils/utils.js');
        var path = require('path');
        var Promise = require('bluebird');
        var MongoClient = require('mongodb').MongoClient;
        var ObjectId = require('mongodb').ObjectID;
        var _ = require('underscore');
        var vendSdk = require('vend-nodejs-sdk')({}); //why the {}?
        var vendConnectionInfo;
        var salesPayload = {
            register_id: null,
            customer_id: payload.customerId,
            note: 'Automated from Corporate warehouse',
            status: 'ONACCOUNT_CLOSED',
            register_sale_products: [],
            register_sale_payments: []
        };
        var warehouseOutletTaxId = null;
        var db = null; //database connected

        // Global variable for logging
        var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

        logger.debug({
            messageId: messageId,
            commandName: commandName,
            payload: payload,
            config: config,
            taskId: taskId,
            argv: process.argv,
            env: process.env
        });

        try {
            process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;
            logger.debug({
                messageId: messageId,
                commandName: commandName,
                message: `This worker will create a sales from warehouse ${payload.warehouseOutletName} to the outlet ${payload.customerOutletName}`
            });
            return utils.savePayloadConfigToFiles(payload)
                .then(function () {
                    //TODO: remove these relative paths
                    var nconf = require('./../../node_modules/nconf/lib/nconf');
                    nconf.file('client', {file: 'config/client.json'})
                    //.file('settings', { file: 'config/settings.json' }) // NOTE: useful for quicker testing
                        .file('oauth', {file: 'config/oauth.json'});

                    logger.debug({messageId: messageId, commandName: commandName, nconf: nconf.get()});
                    vendConnectionInfo = utils.loadOauthTokens();
                    var argsForFetchOutlet = vendSdk.args.outlets.fetchById();
                    argsForFetchOutlet.apiId.value = payload.warehouseOutletId;
                    return vendSdk.outlets.fetchById(argsForFetchOutlet, vendConnectionInfo);
                })
                .then(function (warehouseOutlet) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Found the warehouse outlet',
                        data: warehouseOutlet.data
                    });
                    warehouseOutletTaxId = warehouseOutlet.data.default_tax_id;
                    return MongoClient
                        .connect(dbUrl, {
                            promiseLibrary: Promise
                        });
                })
                .then(function (dbInstance) {
                    db = dbInstance;
                    return db.collection('ReportModel').findOne({"_id": ObjectId(payload.reportId)});
                })
                .then(function (report) {
                    if (report === null) {
                        return Promise.reject('Invalid reportId, could not create sales');
                    }
                    else {
                        logger.debug({
                            messageId: messageId,
                            commandName: commandName,
                            message: 'Found report',
                            report: report
                        });
                        logger.debug({
                            messageId: messageId,
                            commandName: commandName,
                            message: 'Will go on to fetch items included in this report'
                        });
                        return Promise.all([db.collection('StockOrderLineitemModel').find({"reportId": ObjectId(payload.reportId)}).toArray(), report]);
                    }
                })
                .spread(function (productsInReport, report) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Found these items belonging to the report',
                        productsInReport: productsInReport
                    });
                    if (productsInReport.length !== report.totalRows) {
                        logger.debug({
                            messageId: messageId, commandName: commandName,
                            message: `Could not find all products included in report
                         Report Items: ${report.totalRows}
                         Actual Items: ${productsInReport.length}`
                        });
                        logger.debug({
                            messageId: messageId,
                            commandName: commandName,
                            message: 'Will create sales for the items actually found'
                        });
                    }
                    var totalAmount = 0;
                    for (var i = 0, len = productsInReport.length; i<len; i++) {
                        salesPayload.register_sale_products.push({
                            product_id: productsInReport[i].productId,
                            quantity: productsInReport[i].fulfilledQuantity,
                            price: productsInReport[i].supplyPrice,
                            tax: 0,
                            tax_id: warehouseOutletTaxId
                        });
                        totalAmount += productsInReport[i].fulfilledQuantity * productsInReport[i].supplyPrice;
                    }
                    salesPayload.register_sale_payments.push({
                        retailer_payment_type_id: payload.paymentTypeId,
                        amount: Math.round(totalAmount * 100) / 100
                    });
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: `Finding register against the current warehouse outlet ID ${payload.warehouseOutletId}`
                    });
                    var argsForRegisters = vendSdk.args.registers.fetch();
                    return vendSdk.registers.fetch(argsForRegisters, vendConnectionInfo);
                })
                .then(function (data) {
                    if (!data.registers.length) {
                        logger.debug({
                            messageId: messageId,
                            commandName: commandName,
                            message: 'Could not find any registers belonging to this organisation'
                        });
                        //TODO: should we make a sale anyway?
                        return Promise.reject('Could not find any registers belonging to this organisation.');
                    }
                    var registerFound = _.findWhere(data.registers, {outlet_id: payload.warehouseOutletId});
                    if (registerFound) {
                        salesPayload.register_id = registerFound.id;
                        logger.debug({
                            messageId: messageId,
                            commandName: commandName,
                            message: `Found the register ID ${salesPayload.register_id}`
                        });
                        return Promise.resolve();
                    }
                    else {
                        logger.error({message: 'A register does not exist for this warehouse outlet'});
                        return Promise.reject('A register does not exist for this warehouse outlet');
                    }
                })
                .then(function () {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Creating a sales with following data',
                        salesPayload: salesPayload
                    });
                    return vendSdk.sales.create(salesPayload, vendConnectionInfo);
                })
                .then(function (saleCreated) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Created a sale',
                        saleCreated: saleCreated
                    });
                    return db.collection('ReportModel').updateOne(
                        {
                            "_id": ObjectId(payload.reportId)
                        },
                        {
                            $set: {
                                vendSalesId: saleCreated.register_sale.id,
                                vendSales: {
                                    id: saleCreated.register_sale.id,
                                    registerId: saleCreated.register_sale.register_id,
                                    customerId: saleCreated.register_sale.customer_id,
                                    totals: saleCreated.register_sale.totals,
                                    invoiceNumber: saleCreated.register_sale.invoice_number
                                }
                            }
                        }
                    );
                })
                .catch(function (error) {
                    logger.error({messageId: messageId, message: 'last dot-catch block', err: error});
                    return Promise.reject(error);
                })
                .finally(function () {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Closing database connection'
                    });
                    if (db) {
                        return db.close();
                    }
                })
                .catch(function (error) {
                    logger.error({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Could not close db connection',
                        err: error
                    });
                    return Promise.resolve();
                    //TODO: set a timeout, after which close all listeners
                });
        }
        catch (e) {
            logger.error({messageId: messageId, commandName: commandName, message: '2nd last catch block', err: e});
            throw e; // use `throw` for `catch()` and `reject` for `.catch()`
        }

    }
    catch (e) {
        logger.error({messageId: messageId, message: 'last catch block', err: e});
        throw e; // use `throw` for `catch()` and `reject` for `.catch()`
    }
};

module.exports = {
    run: runMe
};
