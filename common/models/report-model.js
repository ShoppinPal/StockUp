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
const ROLES = require('../utils/constants').ROLES;
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
        return Promise.each(toEmailArray, function (eachEmail) {
            if (!validateEmail(eachEmail.trim())) {
                return Promise.reject('Invalid Primary Email: ' + eachEmail);
            }
        })
            .then(function () {
                return Promise.each(ccEmailArray, function (eachEmail) {
                    if (!validateEmail(eachEmail.trim())) {
                        return Promise.reject('Invalid Cc Email: ' + eachEmail);
                    }
                });
            })
            .then(function () {
                return Promise.each(bccEmailArray, function (eachEmail) {
                    if (!validateEmail(eachEmail.trim())) {
                        return Promise.reject('Invalid Bcc Email: ' + eachEmail);
                    }
                });
            })
            .catch(function (error) {
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
                    include: ['userModel', 'storeModel', 'orgModel', {
                        relation: 'supplierModel',
                        scope: {
                            include: {
                                relation: 'supplierStoreMappings'
                            }
                        }
                    }]
                });
            })
            .then(function (reportModelInstance) {
                report = reportModelInstance;
                const supplierInstance = reportModelInstance.supplierModel();
                supplier = supplierInstance;
                var supplierStoreMappings = supplierInstance.supplierStoreMappings();
                logger.debug({
                    message: 'Found this supplier',
                    supplier: supplierInstance,
                    supplierStoreMappings,
                    store: report.storeModel(),
                    orgName: report.orgModel().name,
                    functionName: 'sendReportAsEmail',
                    options
                });
                var supplierStoreCode = '';
                if (supplierStoreMappings.length) {
                    var supplierStore = supplierStoreMappings.find(function (eachMapping) {
                        return eachMapping.storeModelId.toString() === reportModelInstance.storeModelId.toString();
                    });
                    supplierStoreCode = supplierStore ? supplierStore.storeCode : '';
                }
                emailSubject = 'Order #' + supplierStoreCode + '-' + report.storeModel().name + ' from ' + report.orgModel().name;
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
                    include: [
                        {
                            relation: 'productModel',
                            scope: {
                                fields: ['sku', 'name', 'supplierCode']
                            }
                        },
                        {
                            relation: 'commentModels',
                            scope: {
                                fields: ['comment']
                            }
                        },

                    ]
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
                    lineItems,
                    message: 'Found ' + lineItems.length + ' line items for the report, will convert to csv',
                    options
                });

                for (var i = 0; i<lineItems.length; i++) {
                    if (lineItems[i].orderQuantity>0) {

                        totalOrderQuantity += lineItems[i].orderQuantity;
                        totalSupplyCost += lineItems[i].supplyPrice * lineItems[i].orderQuantity;
                        var supplierCode = lineItems[i].productModel().supplierCode;
                        let comments = lineItems[i].commentModels() ? _.pluck(lineItems[i].commentModels(), 'comment').join('\n*') : '';
                        if (comments) {
                            comments = '*' + comments;
                        }
                        comments = comments || '';
                        csvArray.push({
                            'SKU': lineItems[i].productModel().sku,
                            'Ordered': lineItems[i].orderQuantity,
                            'Product': lineItems[i].productModel().name,
                            'Supplier Code': supplierCode,
                            'Supply cost': lineItems[i].supplyPrice,
                            'Total supply cost': lineItems[i].supplyPrice * lineItems[i].orderQuantity,
                            'Comments': comments
                        });
                        htmlForPdf += '<tr>' +
                            '<td>' + lineItems[i].productModel().sku + '</td>' +
                            '<td>' + lineItems[i].orderQuantity + '</td>' +
                            '<td>' + lineItems[i].productModel().name + '</td>' +
                            '<td>' + supplierCode + '</td>' +
                            '<td>' + lineItems[i].supplyPrice + '</td>' +
                            '<td>' + (lineItems[i].supplyPrice * lineItems[i].orderQuantity) + '</td>' +
                            '<td>' + (comments) + '</td>' +
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
                    from: report.storeModel().name + '\<' + (ReportModel.app.get('sendReportsEmail') || process.env.SEND_REPORTS_EMAIL) + '>',
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

        return Promise.all([
            ReportModel.app.models.StoreModel.findOne({
                where: {
                    objectId: storeModelId
                }
            }),
            ReportModel.app.models.OrgModel.findOne({
                where: {
                    id: orgModelId
                }
            })
        ])

            .catch(function (error) {
                logger.error({
                    message: 'Could not find a store with this id',
                    storeModelId,
                    error,
                });
                return Promise.reject('Could not find a store with this id');
            })
            .spread(function (storeModelInstance, orgModelInstance) {
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
                    transferOrderCount: 0,
                    stockUpReorderPoints: orgModelInstance.stockUpReorderPoints
                });
            })
            .catch(function (error) {
                logger.error({
                    error,
                    message: 'Could not create report model for this store',
                    storeModelId
                });
                return Promise.reject('Could not create report model for this store');
            })
            .then(function (reportInstance) {
                if (res)
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

    ReportModel.receiveConsignment = function (orgModelId, reportModelId, sendEmail, res, options) {
        logger.debug({
            message: 'Will change stock order state to submitting receivals',
            reportModelId,
            sendEmail,
            functionName: 'receiveConsignment',
            options,
        });
        function sendConsignmentToWorker() {
            return ReportModel.updateAll({
                id: reportModelId
            }, {
                state: REPORT_STATES.SUBMITTING_RECEIVALS
            })
                .then(function (response) {
                    logger.debug({
                        message: 'Changed stock order state to submitting receivals, will initiate worker to receive order in Vend',
                        response,
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
                    return workerUtils.sendPayLoad(payload);
                })
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
        }

        if (sendEmail) {
            return ReportModel.sendDiscrepanciesAsEmail(orgModelId, reportModelId, options)
                .catch(function (e) {
                    logger.error({
                        message: 'Cannot send Email,Possible that no discrepancy user found',
                        e,
                        functionName: 'receiveConsignment',
                    });
                    return Promise.resolve();
                })
                .then(function (){
                    return sendConsignmentToWorker();
                });
        } else {
            return sendConsignmentToWorker();
        }
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
            }),
            ReportModel.app.models.OrgModel.findOne({
                where: {
                    id: orgModelId
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
                    updatedAt: new Date(),
                    stockUpReorderPoints: response[2].stockUpReorderPoints
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
                if (res)
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
            callId: reportModelId,
            eventType: workerUtils.messageFor.MESSAGE_FOR_API,
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
                if (reportModelInstance.vendConsignmentId &&
                    reportModelInstance.state !== REPORT_STATES.ERROR_SENDING_TO_SUPPLIER) {
                    logger.debug({
                        message: 'Purchase order is already created for this report',
                        options,
                        functionName: 'createPurchaseOrderVend'
                    });
                    return Promise.reject('Purchase Order already created for this report');
                }
                else if (reportModelInstance.state === REPORT_STATES.SENDING_TO_SUPPLIER) {
                    logger.debug({
                        message: 'Purchase order creation in progress',
                        options,
                        functionName: 'createPurchaseOrderVend'
                    });
                    return Promise.reject('Purchase order creation in progress');
                }
                else if (reportModelInstance.state === REPORT_STATES.APPROVAL_IN_PROCESS ||
                    reportModelInstance.state === REPORT_STATES.ERROR_SENDING_TO_SUPPLIER) {
                    logger.debug({
                        message: 'Will update order state and call createPurchaseOrderVend worker',
                        options,
                        functionName: 'createPurchaseOrderVend'
                    });
                    return ReportModel.updateAll({
                        id: reportModelId
                    }, {
                        state: REPORT_STATES.SENDING_TO_SUPPLIER
                    })
                        .then(function (response) {
                            res.send({
                                eventType: workerUtils.messageFor.MESSAGE_FOR_API,
                                callId: reportModelId,
                                message: 'Purchase Order Generation initiated',
                                data: {}
                            });
                            return workerUtils.sendPayLoad(payload);
                        });
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
                    fulfilledQuantity: {
                        gt: 0
                    }
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
                }else if (reportModelInstance.state === REPORT_STATES.PUSHING_TO_MSD) {
                    logger.debug({
                        message: 'Transfer order creation in progress',
                        options,
                        functionName: 'createTransferOrderMSD'
                    });
                    return Promise.reject('Transfer order creation in progress');
                }else if (reportModelInstance.state === REPORT_STATES.APPROVAL_IN_PROCESS ||
                    reportModelInstance.state === REPORT_STATES.ERROR_PUSHING_TO_MSD) {
                    logger.debug({
                        message: 'Will update order state and call createTransferOrderMSD worker',
                        options,
                        functionName: 'createTransferOrderMSD'
                    });
                    return ReportModel.updateAll({
                        id: reportModelId
                    }, {
                        state: REPORT_STATES.PUSHING_TO_MSD
                    })
                        .then(function (response) {
                            res.send({
                                eventType: workerUtils.messageFor.MESSAGE_FOR_CLIENT,
                                callId: options.accessToken.userId,
                                message: 'Transfer Order Generation initiated',
                                data: {}
                            });
                            return workerUtils.sendPayLoad(payload);
                        });
                }
                else {
                    logger.debug({
                        message: 'Only GENERATED orders will be pushed to MSD',
                        options,
                        functionName: 'createTransferOrderMSD'
                    });
                    return Promise.reject('Only GENERATED orders will be pushed to MSD');
                }
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not send createTransferOrderMSD to worker',
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
        if (!(orderIds instanceof Array) || orderIds.length<1 || orderIds.length>400) {
            logger.debug({
                message: 'OrderIds should be a valid array of 1 to 400 length',
                orderIds,
                options,
                functionName: 'fetchOrderRowCounts'
            });
            return Promise.reject('OrderIds should be a valid array of 1 to 400 length');
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
                    secretAccessKey: ReportModel.app.get('awsSecretAccessKey'),
                    endpoint: process.env.S3_ENDPOINT,
                    s3ForcePathStyle: true, // needed with minio?
                    signatureVersion: 'v4'
                });
                let s3Bucket = process.env.AWS_S3_CSV_REPORTS_BUCKET;
                let fileData = fs.readFileSync(result.file.path, 'utf8');
                let params = {
                    Bucket: s3Bucket,
                    Key: options.accessToken.userId + ' - ' + result.file.originalFilename,
                    Body: fs.createReadStream(result.file.path)
                };
                let uploadAsync = Promise.promisify(s3.upload, s3);
                //TODO: Update reportmodel with etag of uploaded file
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
        //follow the flow chart here
        //https://drive.google.com/open?id=1BtwkPjl7AuEUBHHg2TG57B6Ho0xs6lJY
        let reportModel, pushToVend = false;
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
                return ReportModel.app.models.StockOrderLineitemModel.find({
                    where: {
                        productModelId: product.id,
                        reportModelId: reportModelId
                    }
                });
            })
            .catch(function (error) {
                logger.error({
                    functionName: 'addProductToStockOrder',
                    message: 'Error while searching existing product in stock order',
                    options,
                    error
                });
                return Promise.reject(error);
            })
            .then(function (presentLineItems) {
                logger.debug({
                    functionName: 'addProductToStockOrder',
                    message: 'stockorderline items matching product Id',
                    options,
                    reportModel,
                    presentLineItems
                });
                if (presentLineItems.length>0) { //product already exists, but in which state?

                    if (REPORT_STATES.APPROVAL_IN_PROCESS === reportModel.state) {
                        //do nothing
                        logger.debug({
                            message: 'Product already exists in order generation state, nothing to do',
                            options,
                            functionName: 'addProductToStockOrder'
                        });
                        return Promise.reject('Product already exists');
                    }
                    else if (REPORT_STATES.FULFILMENT_IN_PROCESS === reportModel.state) {
                        if (presentLineItems[0].approved) {
                            //do nothing
                            logger.debug({
                                message: 'Product already exists in fulfilment state, nothing to do',
                                options,
                                functionName: 'addProductToStockOrder'
                            });
                            return Promise.reject('Product already exists');
                        }
                        else {
                            logger.debug({
                                message: 'Product already exists but was not approved, will approve and push to Vend',
                                options,
                                functionName: 'addProductToStockOrder'
                            });
                            /**
                             * a) update state to approved
                             * b) Push to Vend
                             */
                            presentLineItems[0].approved = true;
                            presentLineItems[0].orderQuantity = 0;
                            pushToVend = true;
                            return presentLineItems[0].save();
                        }
                    } else if (REPORT_STATES.RECEIVING_IN_PROCESS === reportModel.state) {
                        if (presentLineItems[0].fulfilled) {
                            // do nothing
                            logger.debug({
                                message: 'Product already exists in receiving mode, nothing to do',
                                options,
                                functionName: 'addProductToStockOrder'
                            });
                            return Promise.reject('Product already exists');
                        }
                        else {
                            logger.debug({
                                message: 'Product already exists, but was not fulfilled. Will set state to fulfilled',
                                options,
                                functionName: 'addProductToStockOrder'
                            });
                            /**
                             *  a) update state to fulfilled
                             */
                            presentLineItems[0].fulfilled = true;
                            if (presentLineItems[0].vendConsignmentProductId) {
                                // do nothing
                                logger.debug({
                                    message: 'Product already exists in Vend consignment, no need to push',
                                    options,
                                    functionName: 'addProductToStockOrder'
                                });
                            }
                            else {
                                /**
                                 * a) Push to Vend
                                 */
                                logger.debug({
                                    message: 'Product doesn\'t exist in Vend consignment, will push to Vend',
                                    options,
                                    functionName: 'addProductToStockOrder'
                                });
                                pushToVend = true;
                            }
                            return presentLineItems[0].save();
                        }
                    }
                }
                else {
                    if (REPORT_STATES.FULFILMENT_IN_PROCESS === reportModel.state || REPORT_STATES.RECEIVING_IN_PROCESS === reportModel.state) {
                        pushToVend = true;
                    }
                    logger.debug({
                        message: 'Product not found, will create line item',
                        options,
                        functionName: 'addProductToStockOrder'
                    });
                    return createLineItemForStockOrder(product, id, storeModelId, reportModelId, reportModel.state, options);
                }
            })
            .then(function (stockOrderInstance) {
                if (pushToVend) {
                    logger.debug({
                        message: 'Pushing line item to vend consignment',
                        options,
                        functionName: 'addProductToStockOrder'
                    });
                    return vendUtils({OrgModel: ReportModel.app.models.OrgModel})
                        .createStockOrderLineitemForVend(reportModel.storeModel(), reportModel, product, stockOrderInstance, options)
                        .then(function (vendConsignmentProduct) {
                            logger.debug({
                                message: 'Added product to vend consignment, will save details to db',
                                vendConsignmentProduct,
                                functionName: 'addProductToStockOrder',
                                options
                            });
                            return ReportModel.app.models.StockOrderLineitemModel.updateAll(
                                {
                                    id: stockOrderInstance.id
                                },
                                {
                                    vendConsignmentProductId: vendConsignmentProduct.id ? vendConsignmentProduct.id : null,
                                    vendConsignmentProduct: vendConsignmentProduct
                                }
                            );
                        })
                }
                else {
                    return Promise.resolve();
                }
            });
    };


    function createLineItemForStockOrder(product, orgModelId, storeModelId, reportModelId, reportModelState, options) {
        logger.debug({
            functionName: 'createLineItemForStockOrder',
            message: 'Will find inventory associated with product, store and org',
            options,
        });
        return ReportModel.app.models.InventoryModel.find({
            where: {
                productModelId: product.id,
                orgModelId: orgModelId,
                storeModelId
            }
        })
            .then(function (inventoryInstances) {
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
                if (inventory) {
                    quantityOnHand = Number(inventory.inventory_level);
                    desiredStockLevel = Number(inventory.reorder_point);
                }
                orderQuantity = 0;
                if (quantityOnHand<0) {
                    logger.debug({
                        message: `TODO: how should negative inventory be handled? DSL minus QOH w/ a negative QOH will lead to a positive! Example: 100 - (-2) = 102`,
                        functionName: 'createLineItemForStockOrder'
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
                            message: `do not waste time on negative or zero orderQuantity ${product.sku}`,
                            functionName: 'createLineItemForStockOrder'
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
                var categoryName = product.categoryModel ? product.categoryModel.name : 'No Category';
                row = {
                    productModelId: product.id,
                    productModelName: product.name, //need for sorting
                    productModelSku: product.sku, //need for sorting
                    storeInventory: quantityOnHand,
                    desiredStockLevel: desiredStockLevel,
                    orderQuantity: product.orderQuantity ? product.orderQuantity : (product.quantity ? product.quantity : 0),
                    originalOrderQuantity: orderQuantity,
                    fulfilledQuantity: product.fulfilledQuantity || 0,
                    receivedQuantity: product.receivedQuantity || 0,
                    caseQuantity: caseQuantity,
                    supplyPrice: product.supply_price,
                    supplierModelId: product.supplierModelId,
                    categoryModelId: product.categoryModelId,
                    binLocation: product.binLocation,
                    categoryModelName: categoryName,  //need for sorting
                    approved: null,
                    fulfilled: null,
                    received: false,
                    reportModelId: reportModelId,
                    userModelId: options.accessToken.userId,
                    createdAt: new Date(),
                    orgModelId: orgModelId
                };
                if (REPORT_STATES.FULFILMENT_IN_PROCESS === reportModelState) {
                    row.approved = true;
                }
                else if (REPORT_STATES.RECEIVING_IN_PROCESS === reportModelState) {
                    row.fulfilled = true;
                }
                logger.debug({row: row, functionName: 'createLineItemForStockOrder'});
                return Promise.resolve(row);
            })
            .then(function (stockOrderLineItem) {
                return ReportModel.app.models.StockOrderLineitemModel.create(stockOrderLineItem);
            })
            .catch(function (error) {
                logger.error({
                    functionName: 'createLineItemForStockOrder',
                    message: 'Error adding product to report',
                    options,
                    error
                });
                return Promise.reject(error);
            });
    }

    ReportModel.regenerateOrder = function (orgModelId, reportModelId, options){
        logger.debug({
            message: "will change state to generated",
            orgModelId,
            reportModelId,
            options,
            functionName: 'regenerateOrder'
        });
        var reportModelInstance;
        return ReportModel.findById(reportModelId)
            .catch(function (error) {
                logger.error({
                    message: 'Could not find report model instance',
                    reportModelId,
                    options,
                    error,
                    functionName: 'regenerateOrder'
                });
                return Promise.reject('Could not find report model instance');
            })
            .then( function(response) {
                reportModelInstance = response;
                return reportModelInstance.updateAttributes({
                    state: REPORT_STATES.GENERATED
                });
            })
    }
    
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
    };

    /**
     * getDiscrepancyReason
     *     F   R   Discrepancy   Damaged
     * (1) 10  15  OD(5/15)       0
     * (2) 10  8   Missing(2/10)  0
     *
     * (3) 10  15  OD(5/15)       2     - 5 Over Received and 2 more received but damaged
     * (4) 10  8   Missing(1/10)  1/10  - Underdelivered with 1 missing & 1 Damaged
     * (5) 10  8   -              3     - originally OverDelivered but damaged in shipping
     * @param lineItem - List Item
     */
    ReportModel.getDiscrepancyReason = function (lineItem) {
        // Damaged qty or 0
        const damagedQuantity = (lineItem.damagedQuantity || 0);
        const realDiffInQty = lineItem.fulfilledQuantity - lineItem.receivedQuantity;
        const reason = [];

        // No Discrepancy Case
        if (lineItem.fulfilledQuantity === lineItem.receivedQuantity && damagedQuantity === 0) {
            return [];
        }

        // Original Difference - Damaged Qty Reported - used to check for Case (5)
        const discrepancyQty = Math.abs(realDiffInQty) - damagedQuantity;
        // OverDelivered case (1) & (3)
        if (lineItem.fulfilledQuantity < lineItem.receivedQuantity) {
            reason.push(`Over Delivered(${Math.abs(realDiffInQty)}/${lineItem.receivedQuantity})`);
            if (damagedQuantity) {
                reason.push(`Damaged(${damagedQuantity})`);
            }
            // Underdelivered case (2) & (4)
        } else if (lineItem.fulfilledQuantity > lineItem.receivedQuantity && discrepancyQty >= 0) {
            // Dont show if Missing 0
            if (discrepancyQty) {
                reason.push(`Missing(${discrepancyQty}/${lineItem.fulfilledQuantity})`);
            }
            if (damagedQuantity) {
                reason.push(`Damaged(${damagedQuantity}/${lineItem.fulfilledQuantity})`);
            }
            // Case(5)
        } else {
            if (damagedQuantity) {
                reason.push(`Damaged(${damagedQuantity})`);
            }
        }
        return reason;
    };

    ReportModel.getDiscrepancyOrBackOrderedLineItems = function (id, reportId, filters) {
        var db = ReportModel.getDataSource();
        // Get the filters
        const categoryModelNameFilter = filters.where? (filters.where.categoryModelName || false): false;
        const binLocationFilter = filters.where? (filters.where.binLocation || false): false;
        const limit = filters.limit || 10;
        const skip = filters.skip || 0;
        const order = filters.order || {productModelSku: 1};
        const damagedOnly = filters.damagedOnly || false;
        const underDelivered = filters.underDelivered || false;
        const overDelivered = filters.overDelivered || false;
        const showBackOrderedOnly = filters.backorderedOnly || false;

        const willFullDiscrepancyLoad = [
            damagedOnly,
            underDelivered,
            overDelivered,
            showBackOrderedOnly,
            categoryModelNameFilter,
            binLocationFilter
        ].every(function (value) {
            return value === false;
        });

        // Real data resides within "data"
        Object.keys(order).forEach(key => {
            // Rename the key
            order['data.' + key] = order[key];
            delete order[key];
        });

        let matches;
        // For BackOrdered fulfilledQuantity < orderQuantity
        if (showBackOrderedOnly) {
            matches = {
                $lt: ['$fulfilledQuantity', '$orderQuantity']
            };
        } else {
            if (overDelivered) {
                matches = {
                    $lt: [
                        '$fulfilledQuantity', '$receivedQuantity'
                    ]
                };
            } else if (underDelivered) {
                matches = {
                    $lt: [
                        '$receivedQuantity', '$fulfilledQuantity'
                    ]
                };
            } else if (damagedOnly) {
                matches = {
                    $gt: [
                        '$damagedQuantity', 0
                    ]
                };
            } else {
                matches = {
                    $ne: [
                        '$fulfilledQuantity',
                        '$receivedQuantity'
                    ]
                };
            }
        }

        let aggregationQuery = [
            // Filter for this report id
            {
                $match: Object.assign(
                    {},
                    {
                        reportModelId: db.ObjectID(reportId),
                        approved: true,
                    },
                    categoryModelNameFilter ?
                        { categoryModelName: { $regex: categoryModelNameFilter} }:
                        {},
                    binLocationFilter ?
                        { binLocation: { $regex: binLocationFilter }}:
                        {}
                    )
            },
            // Add a field that is true if orderQyuantity & receivedQuantity not equal
            {
                $project: {
                    matches: matches,
                    data: '$$ROOT',
                }
            },
            // Filter all the data where matches is true
            {
                $match: {matches: true}
            },
            // Count the number of rows
            {
                $group: {
                    _id: null,
                    data: {$push: '$data'},
                    count: {$sum: 1}
                },
            },
            {$unwind: '$data'},
            // Sort & paginate data
            {
                $sort: order
            }];

        const paginationQuery = [{
            $limit: limit + skip
        },
            {
                $skip: skip
            }];

        if (limit > 0) {
            aggregationQuery = aggregationQuery.concat(paginationQuery);
        }
        const foreignRelations = [
            // Fetch Foreign Relations
            {
                $lookup: {
                    'from': 'ProductModel',
                    'localField': 'data.productModelId',
                    'foreignField': '_id',
                    'as': 'data.productModel'
                }
            },
            {
                $unwind: '$data.productModel'
            },
            {
                $lookup: {
                    'from': 'CommentModel',
                    'localField': 'data._id',
                    'foreignField': 'stockOrderLineitemModelId',
                    'as': 'data.commentModels'
                }
            },
        ];

        return db.connector.collection('StockOrderLineitemModel').aggregate(aggregationQuery.concat(foreignRelations))
            .toArray()
            .then(function (records) {
                const data = records.map(function (record) {
                    const reason = ReportModel.getDiscrepancyReason(record.data);
                    return Object.assign({}, record.data, {reason});
                });
                const count = records.length > 0 ? records[0].count : 0;

                return Promise.resolve({data, count});
            })
            .then(function (discrepancies) {
                if (willFullDiscrepancyLoad) {
                    return ReportModel.updateAll({
                        id: reportId,
                        state: {
                            neq: REPORT_STATES.COMPLETE
                        }
                    }, {
                        discrepancies: discrepancies.count
                    })
                        .then(function () {
                            return Promise.resolve(discrepancies);
                        });
                } else {
                    return Promise.resolve(discrepancies);
                }
            });

    };

    ReportModel.sendDiscrepanciesAsEmail = function (id, reportModelId, options) {
        logger.debug({
            message: 'Parameters Received for sending Discrepancies report as mail',
            functionName: 'sendDiscrepanciesAsEmail',
            options
        });
        var nodemailer = require('nodemailer');
        const papaparse = require('papaparse');

        aws.config.region = 'us-west-2';
        var transporter = nodemailer.createTransport({
            SES: new aws.SES({
                apiVersion: '2010-12-01'
            })
        });
        var report, csvArray = [], supplier, emailSubject, htmlForPdf,
            csvReport, totalOrdered = 0, totalFulfilled = 0, totalReceived = 0, toEmailArray = [];
        return Promise.resolve()
            .then(function () {
                return ReportModel.findById(reportModelId, {
                    include: ['userModel', 'storeModel', 'orgModel', {
                        relation: 'supplierModel',
                        scope: {
                            include: {
                                relation: 'supplierStoreMappings'
                            }
                        }
                    }]
                });
            })
            .then(function (reportModelInstance) {
                report = reportModelInstance;
                const supplierInstance = reportModelInstance.supplierModel();
                supplier = supplierInstance;
                var supplierStoreMappings = supplierInstance.supplierStoreMappings();
                logger.debug({
                    message: 'Found this supplier',
                    supplier: supplierInstance,
                    supplierStoreMappings,
                    store: report.storeModel(),
                    orgName: report.orgModel().name,
                    functionName: 'sendDiscrepanciesAsEmail',
                    options
                });
                var supplierStoreCode = '';
                if (supplierStoreMappings.length) {
                    var supplierStore = supplierStoreMappings.find(function (eachMapping) {
                        return eachMapping.storeModelId.toString() === reportModelInstance.storeModelId.toString();
                    });
                    supplierStoreCode = supplierStore ? supplierStore.storeCode : '';
                }
                emailSubject = 'Discrepancies: Order #'+ report.name + ' ' + supplierStoreCode + '-' + report.storeModel().name + ' from ' + report.orgModel().name;
                logger.debug({
                    functionName: 'sendDiscrepanciesAsEmail',
                    message: 'Will look for discrepancy Manager roleId',
                    options
                });

                return ReportModel.app.models.Role.findOne({
                    where: {
                        name: ROLES.DISCREPANCY_MANAGER
                    }
                });
            })
            .then(function (role) {
                logger.debug({
                    functionName: 'sendDiscrepanciesAsEmail',
                    message: 'Found Role Id, will find users associated with store',
                    role,
                    options
                });
                return ReportModel.app.models.RoleMapping.find({
                    where: {
                        roleId: role.id,
                        storeModelIds: report.storeModelId
                    },
                    fields: ['principalId'],
                    include: {
                        relation: 'principal',
                        scope: {
                            fields: ['email']
                        }
                    }
                });
            })
            .then(function (roleMappings) {
                logger.debug({
                    functionName: 'sendDiscrepanciesAsEmail',
                    message: 'Found RoleMappings, will add email to array',
                    roleMappings,
                    options
                });
                roleMappings.forEach(function (roleMapping) {
                    toEmailArray.push(roleMapping.principal().email);
                });
                if (toEmailArray.length === 0) {
                    return Promise.resolve('No Discrepancy User added for this store');
                }
                return ReportModel.getDiscrepancyOrBackOrderedLineItems(id, reportModelId, {
                    backorderedOnly: false,
                    limit: 0
                });
            })
            .then(function (discrepancies) {
                return Promise.resolve(discrepancies.data);
            })
            .then(function (lineItems) {
                logger.debug({
                    functionName: 'sendDiscrepanciesAsEmail',
                    message: 'Found Discrepancy items',
                    lineItemsSample: lineItems[0],
                    options
                });
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
                    '<th>Product</th>' +
                    '<th>Ordered</th>' +
                    '<th>Fulfilled</th>' +
                    '<th>Received</th>' +
                    '<th>Supplier Code</th>' +
                    '<th>Reason</th>' +
                    '</tr>';
                htmlForPdf += '<h5>' + emailSubject + '</h5>';
                logger.debug({
                    functionName: 'sendDiscrepancyAsEmail',
                    lineItems,
                    message: 'Found ' + lineItems.length + 'discrepancy line items for the report, will convert to csv',
                    options
                });

                for (var i = 0; i<lineItems.length; i++) {
                    if (lineItems[i].orderQuantity>0) {
                        var supplierCode = lineItems[i].productModel.supplierCode;
                        let comments = lineItems[i].commentModels ? _.pluck(lineItems[i].commentModels, 'comment').join('\n*') : '';
                        if (comments) {
                            comments = '*' + comments;
                        }
                        comments = comments || '';
                        csvArray.push({
                            'SKU': lineItems[i].productModel.sku,
                            'Product': lineItems[i].productModel.name,
                            'Ordered': lineItems[i].orderQuantity,
                            'Fulfilled': lineItems[i].fulfilledQuantity,
                            'Received': lineItems[i].receivedQuantity,
                            'Supplier Code': supplierCode,
                            'Reason': lineItems[i].reason.join(',\n'),
                            'Comments': comments
                        });
                        htmlForPdf += '<tr>' +
                            '<td>' + lineItems[i].productModel.sku + '</td>' +
                            '<td>' + lineItems[i].productModel.name + '</td>' +
                            '<td>' + lineItems[i].orderQuantity + '</td>' +
                            '<td>' + lineItems[i].fulfilledQuantity + '</td>' +
                            '<td>' + lineItems[i].receivedQuantity + '</td>' +
                            '<td>' + supplierCode + '</td>' +
                            '<td>' + lineItems[i].reason.join(',\n') + '</td>' +
                            '<td>' + (comments) + '</td>' +
                            '</tr>';

                        totalOrdered+=lineItems[i].orderQuantity;
                        totalFulfilled+=lineItems[i].fulfilledQuantity;
                        totalReceived+=lineItems[i].receivedQuantity;
                    }
                }
                htmlForPdf += '</table>';
                htmlForPdf += '</body></html>';
                csvReport = papaparse.unparse(csvArray);
                return createPDFFromHTML(htmlForPdf);
            })
            .then(function (pdfAttachment) {
                var emailOptions = {
                    type: 'email',
                    to: toEmailArray.toString(),
                    subject: emailSubject,
                    from: report.storeModel().name + '\<' + (ReportModel.app.get('sendReportsEmail') || process.env.SEND_REPORTS_EMAIL) + '>',
                    mailer: transporter,
                    text: 'Total Order Quantity: ' + totalOrdered + '\n Total Fulfilled: ' + totalFulfilled + '\n Total Received: ' + totalReceived,
                    attachments: [
                        {
                            filename: report.name + '-discrepancies.csv',
                            content: csvReport,
                            contentType: 'text/comma-separated-values'
                        },
                        {
                            filename: report.name + '-discrepancies.pdf',
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
                    functionName: 'sendDiscrepancyAsEmail',
                    options
                });
            })
            .catch(function (error) {
                logger.error({
                    error: error,
                    functionName: 'sendDiscrepancyAsEmail',
                    message: 'Unable to send E-mail',
                    options
                });
                return Promise.reject('Unable to send E-mail');
            });
    };

    ReportModel.fulfillAllLineItems = function(id, reportModelId) {
        var db = ReportModel.getDataSource();
        const bulk = db.connector.collection('StockOrderLineitemModel').initializeUnorderedBulkOp();
        return ReportModel.app.models.StockOrderLineitemModel.find({
                where: {
                    reportModelId: reportModelId,
                    approved: true,
                }
            })
            .catch(function (error) {
                logger.error({
                    message: 'Cannot find all line items in this report',
                    error,
                    functionName: 'fulfillAllLineItems'
                });
                return Promise.reject('Cannot find all line items')
            })
            .then(function (lineItems){
                return Promise.map(lineItems, function (lineItem){
                    bulk.find({
                        _id: db.ObjectID(lineItem.id)
                    })
                        .update({
                        $set: {
                            fulfilledQuantity: lineItem.orderQuantity,
                            fulfilled: true
                        }
                    });
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Cannot update each lineItem',
                    error,
                    functionName: 'fulfillAllLineItems'
                });
                return Promise.reject('Cannot update each lineItem')
            })
            .then(function (){
                logger.debug({
                    message: 'Executing bulk update operation',
                    functionName: 'fulfillAllLineItems'
                })
                return bulk.execute();
            })
            .catch(function (error) {
                logger.error({
                    message: 'Error Fulfilling all line items',
                    error,
                    functionName: 'fulfillAllLineItems'
                });
               return Promise.reject('Cannot fulfill all line items')
            });
    };


    /**
     * Returns category labels and their page numbers
     * - Sort Line Items by category
     * - Group line items by category
     * - Get count for items in each category
     * - get items limit from frontend
     * - calculate page numbers for each category
     * @param orgModelId
     * @param reportModelId
     * @param options
     */
    ReportModel.getReportAnchors = function (orgModelId, reportModelId, query , showBinLocations) {

        logger.info({
            functionName: 'getReportAnchors',
            message: 'Will return available category labels',
            orgModelId,
            reportModelId
        });
        const ObjectID = ReportModel.getDataSource().ObjectID;

        const stockOrderLineItemsModelName = ReportModel.app.models.StockOrderLineitemModel.modelName;
        const stockOrderLineItemCollection = ReportModel.getDataSource().connector.collection(stockOrderLineItemsModelName);

        return ReportModel.findById(reportModelId)
            .then(function (reportInstance) {
                logger.info({
                    functionName: 'getReportAnchors',
                    message: 'Found reportModel Instance',
                    orgModelId,
                    reportModelId,
                    reportInstance,
                    query,
                    showBinLocations
                });

                const columnNameToUse = showBinLocations ?
                    '$binLocation' :
                    '$categoryModelName';

                const aggregationQuery = [
                    {
                        $match: Object.assign(
                            {},
                            {
                                // Match line items for this report
                                reportModelId: ObjectID(reportModelId),
                            },
                            query
                        )
                    },
                    {
                        $project: {
                            label: columnNameToUse
                        }
                    },
                    {
                        $group: {
                            // $toUpper:  Treat 'A' and 'a' as 'A'
                            _id: '$label',
                        }
                    },
                    {
                        $sort: {
                            _id: 1
                        }
                    },
                ];

                return stockOrderLineItemCollection.aggregate(aggregationQuery)
                    .toArray();
            });
    };
};
