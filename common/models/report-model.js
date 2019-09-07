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
const REPORT_STATES = require('../utils/constants').REPORT_STATES;
const multiparty = require("multiparty");
const excel = require('excel-stream');
const vendUtils = require('../utils/vend');

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
                    return !(name == 'validate');
                }
            }
        );
    });

    ReportModel.sendReportAsEmail = function (id, toEmailArray, ccEmailArray, bccEmailArray, options) {
        logger.debug({
            message: 'Parameters Received for sending report as mail',
            toEmailArray,
            ccEmailArray,
            bccEmailArray,
            functionName: 'sendReportAsEmail',
            options
        });
        var nodemailer = require('nodemailer');
        const papaparse = require('papaparse');

        logger.debug({
            message: 'Received these email IDs',
            toEmailArray,
            ccEmailArray,
            bccEmailArray,
            functionName: 'sendReportAsEmail',
            options
        });
        aws.config.region = 'us-west-2';
        var transporter = nodemailer.createTransport({
            SES: new aws.SES({
                apiVersion: '2010-12-01'
            })
        });
        var report, csvArray = [], supplier, emailSubject, totalOrderQuantity = 0, totalSupplyCost = 0, htmlForPdf,
            csvReport;
        return Promise.each(toEmailArray,
            function (eachEmail) {
                if (!validateEmail(eachEmail)) {
                    return Promise.reject('Invalid Primary Email: ' + eachEmail);
                }
            }).then(function () {
            return Promise.each(ccEmailArray,
                function (eachEmail) {
                    if (!validateEmail(eachEmail)) {
                        return Promise.reject('Invalid Cc Email: ' + eachEmail);
                    }
                });
        }).then(function () {
            return Promise.each(bccEmailArray,
                function (eachEmail) {
                    if (!validateEmail(eachEmail)) {
                        return Promise.reject('Invalid Bcc Email: ' + eachEmail);
                    }
                });
        }).catch(function (error) {
            logger.error({
                functionName: 'sendReportAsEmail',
                message: 'Email Verification Failed',
                error,
                options
            });
            return Promise.reject(error);
        })
            .then(function () {
                return ReportModel.findById(id, {
                    include: ['userModel', 'storeConfigModel', 'supplierModel', 'storeModel', 'orgModel']
                });
            })
            .then(function (reportModelInstance) {
                report = reportModelInstance;
                const supplierInstance = reportModelInstance.supplierModel();
                supplier = supplierInstance;
                logger.debug({
                    message: 'Found this supplier',
                    supplier: supplierInstance,
                    store: report.storeModel(),
                    orgName: report.orgModel().name,
                    functionName: 'sendReportAsEmail',
                    options
                });
                emailSubject = 'Order #' + report.storeModel().name + ' from ' + report.orgModel().name;
                logger.debug({
                    functionName: 'sendReportAsEmail',
                    message: 'Will look for stock line items for the report',
                    options
                });
                return ReportModel.app.models.StockOrderLineitemModel.find({
                    where: {
                        reportModelId: id,
                        approved: true
                    },
                    include: {
                        relation: 'productModel',
                        scope: {
                            fields: ['sku', 'name']
                        }
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
                logger.debug({
                    functionName: 'sendReportAsEmail',
                    message: 'Found ' + lineItems.length + ' line items for the report, will convert to csv',
                    options
                });

                for (var i = 0; i<lineItems.length; i++) {
                    if (lineItems[i].orderQuantity>0) {

                        totalOrderQuantity += lineItems[i].orderQuantity;
                        totalSupplyCost += lineItems[i].supplyPrice * lineItems[i].orderQuantity;
                        csvArray.push({
                            'SKU': lineItems[i].productModel().sku,
                            'Ordered': lineItems[i].orderQuantity,
                            'Product': lineItems[i].productModel().name,
                            'Supplier Code': supplier.api_id,
                            'Supply cost': lineItems[i].supplyPrice,
                            'Total supply cost': lineItems[i].supplyPrice * lineItems[i].orderQuantity,
                            'Comments': lineItems[i].comments ? lineItems[i].comments.manager_in_process : ''
                        });
                        htmlForPdf += '<tr>' +
                            '<td>' + lineItems[i].productModel().sku + '</td>' +
                            '<td>' + lineItems[i].orderQuantity + '</td>' +
                            '<td>' + lineItems[i].productModel().name + '</td>' +
                            '<td>' + supplier.api_id + '</td>' +
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
                    from: report.storeModel().name + '\<' + report.userModel().email + '>',
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
                return transporter.sendMail(emailOptions);
            })
            .then(function (mailSentDetails) {
                logger.debug({
                    message: 'Sent email successfully',
                    response: mailSentDetails.messageId,
                    functionName: 'sendReportAsEmail',
                    options
                });
            })
            .catch(function (error) {
                logger.error({
                    error: error,
                    functionName: 'sendReportAsEmail',
                    message: 'Unable to send E-mail',
                    options
                });
                return Promise.reject('Unable to send E-mail');
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
                }else {
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

    ReportModel.generateStockOrderMSD = function (orgModelId, storeModelId, warehouseModelId, categoryModelId, res, options) {
        logger.debug({
            message: 'Will initiate worker to generate stock order for MSD',
            storeModelId,
            warehouseModelId,
            categoryModelId,
            functionName: 'generateStockOrderMSD',
            options,
        });

        return ReportModel.app.models.StoreModel.findOne({
            where: {
                objectId: storeModelId
            }
        }).catch(function (error) {
            logger.error({
                message: 'Could not find a store with this id',
                storeModelId,
                error,
            });
            return Promise.reject('Could not find a store with this id');
        }).then(function (storeModelInstance) {
            logger.debug({
                message: 'Found store, will create a report model',
                storeModelInstance,
            });
            var name;
            if (!name) {
                const TODAYS_DATE = new Date();
                name = storeModelInstance.name + ' - ' + TODAYS_DATE.getFullYear() + '-' + (TODAYS_DATE.getMonth() + 1) + '-' + TODAYS_DATE.getDate();
            }
            return ReportModel.create({
                name: name,
                orgModelId,
                userModelId: options.accessToken.userId, // explicitly setup the foreignKeys for related models
                storeModelId,
                categoryModelId,
                createdAt: new Date(),
                updatedAt: new Date(),
                state: REPORT_STATES.PROCESSING,
                deliverFromStoreModelId: warehouseModelId,
                percentagePushedToMSD: 0,
                transferOrderNumber: null,
                transferOrderCount: 0
            });
        }).catch(function (error) {
            logger.error({
                error,
                message: 'Could not create report model for this store',
                storeModelId
            });
            return Promise.reject('Could not create report model for this store');
        })

            .then(function (reportInstance) {
                res.send({
                    eventType: workerUtils.messageFor.MESSAGE_FOR_API,
                    callId: reportInstance.id,
                    message: 'Stock order generation initiated',
                    data: reportInstance
                });
                var payload = {
                    orgModelId: orgModelId,
                    storeModelId: storeModelId,
                    warehouseModelId: warehouseModelId,
                    categoryModelId: categoryModelId,
                    loopbackAccessToken: options.accessToken,
                    op: 'generateStockOrderMSD',
                    eventType: workerUtils.messageFor.MESSAGE_FOR_API,
                    callId: reportInstance.id,
                    reportModelId: reportInstance.id,
                };
                logger.debug({
                    message: 'Report model instance created with STATUS processing',
                    storeModelId,
                    reportInstance,
                    functionName: 'generateStockOrderMSD',
                    options,
                });
                logger.debug({
                    message: 'Will initiate worker to generate stock order for Vend',
                    storeModelId,
                    payload,
                    functionName: 'generateStockOrderMSD',
                    options,
                });
                return workerUtils.sendPayLoad(payload);
            })
            .then(function (response) {
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

    ReportModel.receiveConsignment = function (orgModelId, reportModelId, res, options) {
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
            op: 'receiveConsignment',
            eventType: workerUtils.messageFor.MESSAGE_FOR_CLIENT,
            callId: options.accessToken.userId,
        };
        res.send({
            eventType: workerUtils.messageFor.MESSAGE_FOR_CLIENT,
            callId: options.accessToken.userId,
            message: 'Receive Consignment Initiated',
            data: {}
        });
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

    ReportModel.generateStockOrderVend = function (orgModelId, storeModelId, supplierModelId, name, warehouseModelId, res, options) {
        logger.debug({
            message: 'Will Create a report model and initialize worker to process it',
            storeModelId,
            supplierModelId,
            name,
            warehouseModelId,
            functionName: 'generateStockOrderVend',
            options,
        });
        return Promise.all([
            ReportModel.app.models.StoreModel.findOne({
                where: {
                    objectId: storeModelId //Defined in store-model.json as id
                }
            }),
            ReportModel.app.models.SupplierModel.findOne({
                where: {
                    id: supplierModelId
                }
            })
        ])
            .catch(function (error) {
                logger.error({
                    message: 'Could not find roles, store and supplier details',
                    error
                });
                return Promise.reject('Could not find store and supplier details');
            }).then(function (response) {
                var storeModelInstance = response[0];
                var supplierModelInstance = response[1];
                if (!storeModelInstance) {
                    logger.error({
                        message: 'Could not find store info, will exit',
                        response,
                    });
                    return Promise.reject('Could not find store info, will exit');
                }
                if (!supplierModelInstance) {
                    logger.error({
                        message: 'Could not find supplier info, will exit',
                        response
                    });
                    return Promise.reject('Could not find supplier info, will exit');
                }
                logger.debug({
                    message: 'Found supplier and store info, will create a new report model',
                    response
                });
                var supplierStoreCode = supplierModelInstance.storeIds ? supplierModelInstance.storeIds[storeModelId] : '';
                supplierStoreCode = supplierStoreCode ? '#' + supplierStoreCode : '';
                var TODAYS_DATE = new Date();
                if (!name) {
                    name = storeModelInstance.name + ' - ' + supplierStoreCode + ' ' + supplierModelInstance.name + ' - ' + TODAYS_DATE.getFullYear() + '-' + (TODAYS_DATE.getMonth() + 1) + '-' + TODAYS_DATE.getDate();
                }
                return ReportModel.create({
                    name: name,
                    userModelId: options.accessToken.userId, // explicitly setup the foreignKeys for related models
                    state: REPORT_STATES.PROCESSING,
                    storeModelId: storeModelId,
                    supplierModelId: supplierModelId,
                    orgModelId: orgModelId,
                    deliverFromStoreModelId: warehouseModelId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not create a report model',
                    error,
                });
                return Promise.reject('Could not create a report model');
            })
            .then(function (reportInstance) {
                logger.debug({
                    message: 'Report model instance created with STATUS processing',
                    storeModelId,
                    supplierModelId,
                    reportInstance,
                    functionName: 'generateStockOrderVend',
                    options,
                });
                res.send({
                    callId: reportInstance.id,
                    eventType: workerUtils.messageFor.MESSAGE_FOR_API,
                    message: 'Stock order generation initiated',
                    data: reportInstance
                });
                var payload = {
                    orgModelId: orgModelId,
                    storeModelId: storeModelId,
                    supplierModelId: supplierModelId,
                    name: name,
                    reportModelId: reportInstance.id,
                    callId: reportInstance.id,
                    eventType: workerUtils.messageFor.MESSAGE_FOR_API,
                    warehouseModelId: warehouseModelId,
                    loopbackAccessToken: options.accessToken,
                    op: 'generateStockOrderVend'
                };
                logger.debug({
                    message: 'Will initiate worker to generate stock order for Vend',
                    storeModelId,
                    supplierModelId,
                    payload,
                    functionName: 'generateStockOrderVend',
                    options,
                });
                return workerUtils.sendPayLoad(payload);
            })
            .then(function (response) {
                logger.debug({
                    data: {
                        MessageId: response.MessageId,
                        message: 'Order generation in progress'
                    },
                });
                logger.debug({
                    message: 'Sent generateStockOrderVend to worker',
                    options,
                    response,
                    functionName: 'generateStockOrderVend'
                });

                return Promise.resolve();
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


    ReportModel.createPurchaseOrderVend = function (orgModelId, reportModelId, res, options) {
        logger.debug({
            message: 'Will initiate worker to create purchase order in Vend',
            reportModelId,
            functionName: 'createPurchaseOrderVend',
            options,
        });
        var payload = {
            orgModelId: orgModelId,
            reportModelId: reportModelId,
            loopbackAccessToken: options.accessToken,
            op: 'createPurchaseOrderVend',
            callId: options.accessToken.userId,
            eventType: workerUtils.messageFor.MESSAGE_FOR_CLIENT,
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
                }else if (reportModelInstance.state === REPORT_STATES.SENDING_TO_SUPPLIER) {
                    logger.debug({
                        message: 'Purchase order creation in progress',
                        options,
                        functionName: 'createPurchaseOrderVend'
                    });
                    return Promise.reject('Purchase order creation in progress');
                }else if (reportModelInstance.state === REPORT_STATES.APPROVAL_IN_PROCESS ||
                    reportModelInstance.state === REPORT_STATES.ERROR_SENDING_TO_SUPPLIER) {
                    logger.debug({
                        message: 'Will call createPurchaseOrderVend worker',
                        options,
                        functionName: 'createPurchaseOrderVend'
                    });
                    res.send({
                        eventType: workerUtils.messageFor.MESSAGE_FOR_CLIENT,
                        callId: options.accessToken.userId,
                        message: 'Purchase Order Generation initiated',
                        data: {}
                    });
                    return workerUtils.sendPayLoad(payload);
                }else {
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
                state: REPORT_STATES.FULFILMENT_PENDING
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
                    message: 'Found this report model, Will Check For Fulfilled Stock Order Line Items ',
                    reportModelInstance,
                    options,
                    functionName: 'sendConsignmentDelivery'
                });
                return Promise.all([ReportModel.app.models.StockOrderLineitemModel.count({
                    reportModelId: reportModelInstance.id,
                    fulfilled: true
                }), reportModelInstance]);
            })
            .catch(function (error) {
                logger.error({
                    error,
                    reason: error,
                    message: 'Could not find stock order items count',
                    options,
                    functionName: 'sendConsignmentDelivery'
                });
                return Promise.reject('Could not update report model state to receive');
            })
            .then(function ([countResult, reportModelInstance]) {
                if (countResult>0) {
                    logger.debug({
                        message: 'Found Fulfilled Stock Order Items, Will set status to recieve pending ',
                        countResult,
                        reportModelInstance,
                        options,
                        functionName: 'sendConsignmentDelivery'
                    });
                    return reportModelInstance.updateAttributes({
                        state: REPORT_STATES.RECEIVING_PENDING,
                        fulfilledByUserModelId: options.accessToken.userId
                    });
                }else {
                    logger.error({
                        message: 'No Stock order items fulfilled',
                        countResult,
                        reportModelInstance,
                        options,
                        functionName: 'sendConsignmentDelivery'
                    });
                    return Promise.reject('No Stock order items fulfilled');
                }
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
                return ReportModel.app.models.StockOrderLineitemModel.updateAll({
                    reportModelId: reportModelId,
                    fulfilledQuantity: {
                        gt: 0
                    }
                }, {
                    fulfilled: true
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not update line items received quantity to zero',
                    error,
                    reason: error,
                    options,
                    functionName: 'sendConsignmentDelivery'
                });
                return Promise.reject('Could not update received quantities, but don\'t worry they have a not received boolean');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Updated non-fulfilled line items with fulfilledQuantity > 0 to fulfilled',
                    response,
                    options,
                    functionName: 'sendConsignmentDelivery'
                });
                return Promise.resolve(true);
            });
    };


    ReportModel.createTransferOrderMSD = function (orgModelId, reportModelId, res, options) {
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
            op: 'createTransferOrderMSD',
            callId: options.accessToken.userId,
            eventType: workerUtils.messageFor.MESSAGE_FOR_CLIENT,
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
                }else if (reportModelInstance.state === REPORT_STATES.SENDING_TO_SUPPLIER) {
                    logger.debug({
                        message: 'Transfer order creation in progress',
                        options,
                        functionName: 'createTransferOrderMSD'
                    });
                    return Promise.reject('Transfer order creation in progress');
                }else {
                    res.send({
                        eventType: workerUtils.messageFor.MESSAGE_FOR_CLIENT,
                        callId: options.accessToken.userId,
                        message: 'Transfer Order Generation initiated',
                        data: {}
                    });
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
                    },
                    fulfilledRows: {
                        $sum: {
                            $cond: {
                                if: {$eq: ['$fulfilled', true]},
                                then: 1,
                                else: 0
                            }
                        }
                    },
                    receivedRows: {
                        $sum: {
                            $cond: {
                                if: {$eq: ['$received', true]},
                                then: 1,
                                else: 0
                            }
                        }
                    },
                    approvedRows: {
                        $sum: {
                            $cond: {
                                if: {$eq: ['$approved', true]},
                                then: 1,
                                else: 0
                            }
                        }
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
                        totalRows: eachResponse.totalRows,
                        fulfilledRows: eachResponse.fulfilledRows,
                        receivedRows: eachResponse.receivedRows,
                        approvedRows: eachResponse.approvedRows
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
            fields: ['id', 'name']
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
                }else {
                    logger.debug({
                        message: 'Found report model, will look for line items',
                        reportModelInstance,
                        options,
                        functionName: 'downloadReportModelCSV'
                    });
                    return ReportModel.app.models.StockOrderLineitemModel.find({
                        fields: [
                            'orderQuantity',
                            'storeInventory',
                            'productModelId',
                            'originalOrderQuantity',
                            'approved',
                            'fulfilled',
                            'received',
                            'fulfilledQuantity',
                            'receivedQuantity'
                        ],
                        where: {
                            reportModelId: reportModelId,
                        },
                        include: {
                            relation: 'productModel',
                            scope: {
                                fields: ['name', 'sku']
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
                                    'Sku': lineItems[i].productModel().sku,
                                    'Suggested Order Quantity': lineItems[i].originalOrderQuantity,
                                    'Approved': lineItems[i].approved ? 'Yes' : 'No',
                                    'Order Quantity': lineItems[i].approved ? lineItems[i].orderQuantity : 0,
                                    'Fulfilled': lineItems[i].fulfilled ? 'Yes' : 'No',
                                    'Fulfilled Quantity': lineItems[i].fulfilled ? lineItems[i].fulfilledQuantity : 0,
                                    'Received': lineItems[i].received ? 'Yes' : 'No',
                                    'Received Quantity': lineItems[i].received ? lineItems[i].receivedQuantity : 0,
                                    'Store Inventory': lineItems[i].storeInventory
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
    };

    ReportModel.importVendOrderFromFile = function (id, req, res, options) {
        let orderConfigModelId;
        return readMultiPartFormData(req, options)
            .catch(function (err) {
                logger.error({
                    message: 'Multi part form data',
                    err,
                    reason: err,
                    functionName: 'importVendOrderFromFile',
                    options
                });
                return Promise.reject('Could not parse Multi part form data');
            })
            .then(function (result) {
                logger.debug({
                    message: 'Read Multi part form data, will upload to S3',
                    result,
                    functionName: 'importVendOrderFromFile',
                    options
                });
                orderConfigModelId = result.fields.orderConfigModelId[0];
                // return Promise.resolve();
                let s3 = new aws.S3({
                    apiVersion: '2006-03-01',
                    region: ReportModel.app.get('awsS3Region'),
                    accessKeyId: ReportModel.app.get('awsAccessKeyId'),
                    secretAccessKey: ReportModel.app.get('awsSecretAccessKey')
                });
                let s3Bucket = ReportModel.app.get('awsS3CSVImportsBucket');
                let fileData = fs.readFileSync(result.file.path, 'utf8');
                let params = {
                    Bucket: s3Bucket,
                    Key: options.accessToken.userId + ' - ' + result.file.originalFilename,
                    Body: fs.createReadStream(result.file.path)
                };
                let uploadAsync = Promise.promisify(s3.upload, s3);
                return uploadAsync(params);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not upload file to S3',
                    error,
                    reason: error,
                    functionName: 'importVendOrderFromFile',
                    options
                });
                return Promise.reject('Could not upload file to S3');
            })
            .then(function (result) {
                logger.debug({
                    message: 'Uploaded file to S3 successfully, will initiate worker to import from file',
                    result,
                    functionName: 'importVendOrderFromFile',
                    options
                });
                let payload = {
                    orgModelId: id,
                    s3params: {
                        bucket: result.Bucket,
                        key: result.key
                    },
                    orderConfigModelId: orderConfigModelId,
                    loopbackAccessToken: options.accessToken,
                    op: 'importVendOrderFromFile',
                    callId: options.accessToken.userId,
                    eventType: workerUtils.messageFor.MESSAGE_FOR_CLIENT,
                };
                return workerUtils.sendPayLoad(payload);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not send importVendOrderFromFile to worker',
                    options,
                    error,
                    functionName: 'importVendOrderFromFile'
                });
                return Promise.reject('Error in creating stock order');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Sent importVendOrderFromFile to worker',
                    options,
                    response,
                    functionName: 'importVendOrderFromFile'
                });
                return Promise.resolve('Stock order generation initiated');
            });
    };

    function readMultiPartFormData(req, options) {
        return new Promise(function (resolve, reject) {
            let form = new multiparty.Form();
            form.parse(req, function (err, fields, files) {
                if (err) {
                    logger.error({
                        message: 'Error in parsing form data',
                        functionName: 'parseCSVToJson',
                        options
                    });
                    reject(err);
                }else {
                    //TODO: add file and fields validation
                    logger.debug({
                        message: 'Received the following file, will parse it to json',
                        files,
                        fields,
                        functionName: 'parseCSVToJson',
                        options
                    });
                    resolve({
                        file: files.file[0],
                        fields: fields
                    });
                }
            });
        });

    }

    ReportModel.addProductToStockOrder = function (id, reportModelId, storeModelId, product, options) {
        let approvedStates = [
            REPORT_STATES.FULFILMENT_PENDING,
            REPORT_STATES.FULFILMENT_IN_PROCESS,
            REPORT_STATES.FULFILMENT_FAILURE,
            REPORT_STATES.RECEIVING_PENDING,
            REPORT_STATES.RECEIVING_IN_PROCESS,
            REPORT_STATES.RECEIVING_FAILURE,
        ];
        let orderAlreadyApproved = false, reportModel;
        logger.debug({
            functionName: 'addProductToStockOrder',
            message: 'Will find existing products in stockorderline items',
            id, reportModelId, storeModelId, product, options
        });
        return ReportModel.findById(reportModelId, {
            include: 'storeModel'
        })
            .then(function (report) {
                reportModel = report;
                if (approvedStates.findIndex(function (state) {
                        return state === reportModel.state;
                    }) !== -1) {
                    orderAlreadyApproved = true;
                }
                return ReportModel.app.models.StockOrderLineitemModel.find({
                    where: {
                        productModelId: product.id,
                        reportModelId: reportModelId
                    }
                });
            })
            .then(function (presentLineItems) {
                logger.debug({
                    functionName: 'addProductToStockOrder',
                    message: 'stockorderline items matching product Id',
                    options,
                    reportModel,
                    presentLineItems
                });
                if (presentLineItems.length>0) {
                    logger.debug({
                        functionName: 'addProductToStockOrder',
                        message: 'Aborting, product already exists in stock order',
                        options,
                    });
                    return Promise.reject('Product already present in stock order');
                }else {
                    return Promise.resolve();
                }
            }).catch(function (error) {
                logger.error({
                    functionName: 'addProductToStockOrder',
                    message: 'Error while searching existing product in stock order',
                    options,
                    error
                });
                return Promise.reject(error);
            })
            .then(function () {
                logger.debug({
                    functionName: 'addProductToStockOrder',
                    message: 'Will find inventory associated with product, store and org',
                    options,
                });
                return ReportModel.app.models.InventoryModel.find({
                    where: {
                        productModelId: product.id,
                        orgModelId: id,
                        storeModelId
                    }
                });
            }).then(function (inventoryInstances) {
                var row;

                var useRow = true;
                var caseQuantity, quantityOnHand, desiredStockLevel, orderQuantity;
                if (product.tags) {
                    var tagsAsCsv = product.tags.trim();
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
                    return eachInventory.productModelId.toString() === product.id.toString();
                });
                quantityOnHand = Number(inventory.inventory_level);
                desiredStockLevel = Number(inventory.reorder_point);
                orderQuantity = 0;
                if (quantityOnHand<0) {
                    logger.debug({

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
                            message: `do not waste time on negative or zero orderQuantity ${product.sku}`
                        });
                        useRow = false;
                    }
                }
                else {
                    //logger.debug({  message: 'give humans a chance to look over dubious data', dilutedProduct: dilutedProduct });
                    desiredStockLevel = undefined;
                    orderQuantity = undefined;
                    useRow = true;
                }
                var categoryName = product.categoryModel && product.categoryModel.length ? product.categoryModel[0].name : 'No Category';
                row = {
                    productModelId: product.id,
                    productModelName: product.name, //need for sorting
                    productModelSku: product.sku, //need for sorting
                    storeInventory: quantityOnHand,
                    desiredStockLevel: desiredStockLevel,
                    orderQuantity: product.orderQuantity || 0,
                    originalOrderQuantity: orderQuantity,
                    fulfilledQuantity: product.fulfilledQuantity || 0,
                    receivedQuantity: product.receivedQuantity || 0,
                    caseQuantity: caseQuantity,
                    supplyPrice: product.supply_price,
                    supplierModelId: product.supplierModelId,
                    categoryModelId: product.categoryModelId,
                    binLocation: product.binLocation,
                    categoryModelName: categoryName,  //need for sorting
                    approved: orderAlreadyApproved,
                    fulfilled: product.fulfilled || false,
                    received: false,
                    reportModelId: reportModelId,
                    userModelId: options.accessToken.userId,
                    createdAt: new Date(),
                    orgModelId: id
                };
                logger.debug({row: row});
                return Promise.resolve(row);
            })
            .then(function (stockOrderLineItem) {
                return ReportModel.app.models.StockOrderLineitemModel.create(stockOrderLineItem);
            }).catch(function (error) {
                logger.error({
                    functionName: 'addProductToStockOrder',
                    message: 'Error adding product to report',
                    options,
                    error
                });
                return Promise.reject(error);
            }).then(function (stockOrderInstance) {
                if (orderAlreadyApproved) {
                    return vendUtils({OrgModel: ReportModel.app.models.OrgModel})
                        .createStockOrderLineitemForVend(reportModel.storeModel(), reportModel, product, stockOrderInstance, options);
                }else {
                    return Promise.resolve();
                }
            });
    };

    ReportModel.deleteStockOrderVend = function (orgModelId, reportModelId, options) {
        logger.debug({
            message: 'Looking for stock order',
            orgModelId,
            reportModelId,
            functionName: 'deleteStockOrderVend',
            options
        });
        var reportModelInstance;
        return ReportModel.findById(reportModelId)
            .catch(function (error) {
                logger.error({
                    message: 'Could not find report model instance',
                    reportModelId,
                    options,
                    error,
                    functionName: 'deleteStockOrderVend'
                });
                return Promise.reject('Could not find report model instance');
            })
            .then(function (response) {
                reportModelInstance = response;
                logger.debug({
                    message: 'Found report model instance, will delete order from Vend if found',
                    reportModelInstance,
                    functionName: 'deleteStockOrderVend',
                    options
                });
                if (!reportModelInstance.vendConsignmentId) {
                    return Promise.resolve('Vend consignment id not found');
                }
                else {
                    var vendUtils = require('./../../common/utils/vend')({OrgModel: ReportModel.app.models.OrgModel});
                    return vendUtils.deleteStockOrder(orgModelId, reportModelInstance.vendConsignmentId, options);
                }
            })
            .then(function (response) {
                logger.debug({
                    message: 'Deleted stock order from vend, will soft delete from db',
                    response,
                    functionName: 'deleteStockOrderVend',
                    options
                });
                return reportModelInstance.updateAttributes({
                    deletedAt: new Date(),
                    deletedByUserModelId: options.accessToken.userId
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not softs delete report model from db',
                    error,
                    functionName: 'deleteStockOrderVend',
                    options
                });
                return Promise.reject('Could not soft delete report from db');
            });
    }

};
