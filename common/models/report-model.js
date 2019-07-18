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
        var report, csvArray = [], supplier, emailSubject, totalOrderQuantity = 0, totalSupplyCost = 0, htmlForPdf,
            csvReport;
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
                }else {
                    logger.debug({log: {message: 'Report is not specific to a supplier, need generate email? Don\'t know what to do MAN!!!'}});
                    return Promise.resolve('noSupplier');
                }
            })
            .then(function (supplierInstance) {
                logger.debug({log: {message: 'Found this supplier', supplier: supplierInstance[0]}});
                if (supplierInstance === 'noSupplier') {
                    emailSubject = 'Order #' + report.outlet.name + ' from ' + report.storeConfigModel().name;
                }else {
                    if (supplierInstance[0].storeIds && supplierInstance[0].storeIds[report.outlet.outletId]) {
                        emailSubject = 'Order #' + report.outlet.name + '-' + supplierInstance[0].storeIds[report.outlet.outletId] + ' from ' + report.storeConfigModel().name;
                    }else {
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
                    }else {
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

    ReportModel.generateStockOrderVend = function (orgModelId, storeModelId, supplierModelId, name, warehouseModelId, options) {
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
            warehouseModelId: warehouseModelId,
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
            message: 'Will initiate worker to create purchase order in Vend',
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
                }else if (reportModelInstance.state === REPORT_STATES.SENDING_TO_SUPPLIER) {
                    logger.debug({
                        message: 'Purchase order creation in progress',
                        options,
                        functionName: 'createPurchaseOrderVend'
                    });
                    return Promise.reject('Purchase order creation in progress');
                }else if (reportModelInstance.state === REPORT_STATES.APPROVAL_IN_PROCESS) {
                    logger.debug({
                        message: 'Will call createPurchaseOrderVend worker',
                        options,
                        functionName: 'createPurchaseOrderVend'
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
            .then(([countResult, reportModelInstance]) => {
                if (countResult > 0) {
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
                } else {
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
                }else if (reportModelInstance.state === REPORT_STATES.SENDING_TO_SUPPLIER) {
                    logger.debug({
                        message: 'Transfer order creation in progress',
                        options,
                        functionName: 'createTransferOrderMSD'
                    });
                    return Promise.reject('Transfer order creation in progress');
                }else {
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
                                if: { $eq: ['$fulfilled', true]},
                                then: 1,
                                else: 0
                            }
                        }
                    },
                    receivedRows: {
                        $sum: {
                            $cond: {
                                if: { $eq: ['$received', true]},
                                then: 1,
                                else: 0
                            }
                        }
                    },
                    approvedRows: {
                        $sum: {
                            $cond: {
                                if: { $eq: ['$approved', true]},
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

    ReportModel.importVendOrderFromFile = function (id, req, options) {
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
                    op: 'importVendOrderFromFile'
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


};


// ReportModel.removeReport = function (id, cb) {
//     //log.debug('removeReport > id:', id);
//     logger.debug({log: {message: `removeReport > id: ${id}`}});
//     var currentUser = ReportModel.getCurrentUserModel(cb); // returns immediately if no currentUser
//     if (currentUser) {
//         //log.debug('removeReport > will fetch report and related models for Vend calls');
//         logger.debug({log: {message: 'removeReport > will fetch report and related models for Vend calls'}});
//         ReportModel.getAllRelevantModelInstancesForReportModel(id)
//             .spread(function (reportModelInstance, storeModelInstance/*, storeConfigInstance*/) {
//                     var conditionalPromise;
//                     if (reportModelInstance.vendConsignmentId) {
//                         //log.debug('removeReport > will delete Vend consignment', reportModelInstance.vendConsignmentId);
//                         logger.debug({log: {message: `removeReport > will delete Vend consignment ${reportModelInstance.vendConsignmentId}`}});
//                         var oauthVendUtil = require('./../../common/utils/vend')({
//                             'GlobalConfigModel': ReportModel.app.models.GlobalConfigModel,
//                             'StoreConfigModel': ReportModel.app.models.StoreConfigModel,
//                             'currentUser': currentUser
//                         });
//                         conditionalPromise = oauthVendUtil.deleteStockOrder(storeModelInstance, reportModelInstance);
//                     }
//                     else {
//                         //log.debug('removeReport > no vendConsignmentId found for deletion');
//                         logger.debug({log: {message: 'removeReport > no vendConsignmentId found for deletion'}});
//                         conditionalPromise = Promise.resolve();
//                     }
//
//                     return conditionalPromise.then(function () {
//                         //log.debug('removeReport > will fetch related lineitems');
//                         logger.debug({log: {message: 'removeReport > will fetch related lineitems'}});
//                         var StockOrderLineitemModel = ReportModel.app.models.StockOrderLineitemModel;
//                         return StockOrderLineitemModel.destroyAll({reportId: id}, function (err, info) {
//                             //log.debug('removeReport > destroy related lineitems > DONE!', info);
//                             logger.debug({
//                                 log: {
//                                     message: 'removeReport > destroy related lineitems > DONE!',
//                                     info: info
//                                 }
//                             });
//                             if (err) {
//                                 cb(err);
//                             }
//                             else {
//                                 return ReportModel.destroyById(id, function () {
//                                     //log.debug('removeReport > destroyById(): DONE!');
//                                     logger.debug({log: {message: 'removeReport > destroyById(): DONE!'}});
//                                     if (err) {
//                                         cb(err);
//                                     }
//                                     else {
//                                         cb(null);
//                                     }
//                                 });
//                             }
//                         });
//                     });
//                 },
//                 function (error) {
//                     cb(error);
//                 });
//     }
// };
//
// ReportModel.lookupAndAddProductBySku = function (id, sku, boxNumber, cb) {
//     var commandName = 'lookupAndAddProductBySku';
//     //log.debug(commandName + ' > ', 'id:' + id, 'sku:' + sku, 'boxNumber:' + boxNumber);
//     logger.debug({log: {commandName: commandName, id: id, sku: sku, boxNumber: boxNumber}});
//     var currentUser = ReportModel.getCurrentUserModel(cb); // returns immediately if no currentUser
//     if (currentUser) {
//         //log.debug(commandName + ' >  will fetch report and related models for Vend calls');
//         logger.debug({
//             log: {
//                 commandName: commandName,
//                 message: `${commandName}  >  will fetch report and related models for Vend calls`
//             }
//         });
//         ReportModel.getAllRelevantModelInstancesForReportModel(id)
//             .spread(function (reportModelInstance, storeModelInstance/*, storeConfigInstance*/) {
//                 //log.debug(commandName + ' > will loopkup product by SKU');
//                 logger.debug({
//                     log: {
//                         commandName: commandName,
//                         message: `${commandName} will lookup product by SKU`
//                     }
//                 });
//                 var oauthVendUtil = require('./../../common/utils/vend')({
//                     'GlobalConfigModel': ReportModel.app.models.GlobalConfigModel,
//                     'StoreConfigModel': ReportModel.app.models.StoreConfigModel,
//                     'currentUser': currentUser
//                 });
//                 return oauthVendUtil.lookupBySku(sku, storeModelInstance, reportModelInstance)
//                     .then(function (results) {
//                         // log.debug(commandName + ' > filter & dilute the search results to match the inventory for store and supplier tied with this report');
//                         // log.debug(commandName + ' > results products.length: ' + results.products.length);
//                         logger.debug({
//                             log: {
//                                 commandName: commandName,
//                                 message: `${commandName} filter & dilute the search results to match the inventory for store and supplier tied with this report`,
//                                 productsLength: results
//                             }
//                         });
//
//                         // NOTE: there is a lot of overlap in business logic with the worker code
//
//                         // keep only the products that have an inventory field
//                         // and belong to the store/outlet of interest to us
//                         // and belong to the supplier of interest to us
//                         //log.debug(commandName + ' > filtering for supplier ' + reportModelInstance.supplier.name + ' and outlet ' + reportModelInstance.outlet.name);
//                         logger.debug({
//                             log: {
//                                 commandName: commandName,
//                                 message: `${commandName} > filtering for supplier ${reportModelInstance.supplier.name} and outlet ${reportModelInstance.outlet.name}`
//                             }
//                         });
//                         var filteredProducts = _.filter(results.products, function (product) {
//                             return ( product.inventory &&
//                                 _.contains(_.pluck(product.inventory, 'outlet_id'), reportModelInstance.outlet.id) &&
//                                 (reportModelInstance.supplier.name === product.supplier_name || reportModelInstance.supplier.name === "ANY")
//                             );
//                         });
//                         //log.debug(commandName + ' > filtered products.length: ' + filteredProducts.length);
//                         logger.debug({
//                             log: {
//                                 commandName: commandName,
//                                 message: `${commandName} > filtered products.length: ${filteredProducts.length}`
//                             }
//                         });
//
//                         // let's dilute the product data even further
//                         var dilutedProducts = [];
//                         _.each(filteredProducts, function (product) {
//                             var neoProduct = _.pick(product, 'name', 'supply_price', 'id', 'sku', 'type', 'tags');
//                             neoProduct.inventory = _.find(product.inventory, function (inv) {
//                                 return inv.outlet_id === reportModelInstance.outlet.id;
//                             });
//                             dilutedProducts.push(neoProduct);
//                         });
//                         //log.debug(commandName + ' > diluted products.length: ' + _.keys(dilutedProducts).length);
//                         logger.debug({
//                             log: {
//                                 commandName: commandName,
//                                 message: ` > diluted products.length: ${_.keys(dilutedProducts).length}`
//                             }
//                         });
//
//                         return Promise.resolve(dilutedProducts);
//                     })
//                     .then(function (dilutedProducts) {
//                         //log.trace(commandName + ' > dilutedProducts:', dilutedProducts);
//                         if (dilutedProducts.length === 1) {
//                             var dilutedProduct = dilutedProducts[0];
//                             if (dilutedProducts[0].sku !== sku) {
//                                 var error = new Error('No exact matches found for given SKU. Comparison is case-sensitive.');
//                                 error.statusCode = 400;
//                                 logger.error(commandName + ' > ', error.statusCode, error.message);
//                                 return cb(error);
//                             }
//                             else {
//                                 // add an instance of StockOrderLineitemModel to the report
//                                 //log.debug(commandName + ' > putting together data to create a StockOrderLineitemModel from:', dilutedProduct);
//                                 logger.debug({
//                                     log: {
//                                         commandName: commandName,
//                                         message: `${commandName} > putting together data to create a StockOrderLineitemModel from dilutedProduct`,
//                                         dilutedProduct: dilutedProduct
//                                     }
//                                 });
//
//                                 // NOTE: there is a lot of overlap in business logic with the worker code
//                                 var caseQuantity = undefined;
//                                 if (dilutedProduct.tags) {
//                                     var tagsAsCsv = dilutedProduct.tags.trim();
//                                     //console.log( 'tagsAsCsv: ' + tagsAsCsv );
//                                     var tagsArray = tagsAsCsv.split(',');
//                                     if (tagsArray && tagsArray.length>0) {
//                                         _.each(tagsArray, function (tag) {
//                                             tag = tag.trim();
//                                             if (tag.length>0) {
//                                                 //console.log( 'tag: ' + tag );
//                                                 // http://stackoverflow.com/questions/8993773/javascript-indexof-case-insensitive
//                                                 var prefix = 'CaseQuantity:'.toLowerCase();
//                                                 if (tag.toLowerCase().indexOf(prefix) === 0) {
//                                                     var caseQty = tag.substr(prefix.length);
//                                                     //console.log('based on a prefix, adding CaseQuantity: ' +  caseQty);
//                                                     caseQuantity = Number(caseQty);
//                                                 }
//                                                 else {
//                                                     //console.log('ignoring anything without a prefix');
//                                                 }
//                                             }
//                                         });
//                                     }
//                                 }
//
//                                 var quantityOnHand = Number(dilutedProduct.inventory.count);
//                                 var desiredStockLevel = Number(dilutedProduct.inventory['reorder_point']);
//                                 var orderQuantity = 0;
//                                 if (!_.isNaN(desiredStockLevel) && _.isNumber(desiredStockLevel)) {
//                                     orderQuantity = desiredStockLevel - quantityOnHand;
//                                     if (caseQuantity) {
//                                         if ((orderQuantity % caseQuantity) === 0) {
//                                             //console.log('NO-OP: orderQuantity is already a multiple of caseQuantity');
//                                         }
//                                         else {
//                                             orderQuantity = Math.ceil(orderQuantity / caseQuantity) * caseQuantity;
//                                         }
//                                     }
//                                 }
//                                 else {
//                                     desiredStockLevel = undefined;
//                                     orderQuantity = undefined;
//                                 }
//
//                                 var StockOrderLineitemModel = ReportModel.app.models.StockOrderLineitemModel;
//                                 var lineitem = {
//                                     productId: dilutedProduct.id,
//                                     sku: dilutedProduct.sku,
//                                     name: dilutedProduct.name,
//                                     quantityOnHand: quantityOnHand,
//                                     desiredStockLevel: desiredStockLevel,
//                                     orderQuantity: orderQuantity,
//                                     caseQuantity: caseQuantity,
//                                     supplyPrice: dilutedProduct.supply_price,
//                                     type: dilutedProduct.type,
//                                     reportId: reportModelInstance.id,
//                                     userId: reportModelInstance.userModelToReportModelId
//                                 };
//
//                                 if (reportModelInstance.state === ReportModel.ReportModelStates.MANAGER_RECEIVE) {
//                                     if (boxNumber === undefined || boxNumber === null) {
//                                         var error = new Error('Your request did not specify which boxNumber the product should be placed in.');
//                                         error.statusCode = 400;
//                                         //log.error(commandName + ' > ', error.statusCode, error.message);
//                                         logger.error({
//                                             err: error,
//                                             commandName: commandName,
//                                             statusCode: error.statusCode,
//                                             message: error.message
//                                         });
//                                         return cb(error);
//                                     }
//                                     else {
//                                         lineitem.orderQuantity = 0;
//                                         lineitem.fulfilledQuantity = 0;
//                                         lineitem.state = StockOrderLineitemModel.StockOrderLineitemModelStates.BOXED; // boxed by default
//                                         lineitem.boxNumber = boxNumber;
//                                     }
//                                 }
//                                 // NOTE: ReportModel.ReportModelStates.MANAGER_IN_PROCESS also goes through this workflow
//                                 //       but as of now, there isn't any reason for us to set `lineitem.state`
//                                 //       for that state explicitly
//
//                                 //log.debug(commandName + ' > will create a StockOrderLineitemModel');
//                                 logger.debug({
//                                     log: {
//                                         commandName: commandName,
//                                         message: `${commandName} > will create a StockOrderLineitemModel`
//                                     }
//                                 });
//                                 return StockOrderLineitemModel.create(lineitem)
//                                     .then(function (stockOrderLineitemModelInstance) {
//                                         //log.debug(commandName + ' > created stockOrderLineitemModelInstance:', stockOrderLineitemModelInstance);
//                                         logger.debug({
//                                             log: {
//                                                 commandName: commandName,
//                                                 message: 'created stockOrderLineitemModelInstance',
//                                                 stockOrderLineitemModelInstance: stockOrderLineitemModelInstance
//                                             }
//                                         });
//                                         return cb(null, stockOrderLineitemModelInstance);
//                                     });
//                             }
//                         }
//                         else if (dilutedProducts.length>1) {
//                             var error = new Error('More than one match found, SKU is not unique.');
//                             error.statusCode = 400;
//                             //log.error(commandName + ' > ', error.statusCode, error.message);
//                             logger.error({
//                                 err: error,
//                                 statusCode: error.statusCode,
//                                 commandName: commandName,
//                                 message: error.message
//                             });
//                             return cb(error);
//                         }
//                         else if (dilutedProducts.length === 0) {
//                             var error = new Error('No matches found.');
//                             error.statusCode = 400;
//                             //log.error(commandName + ' > ', error.statusCode, error.message);
//                             logger.error({
//                                 err: error,
//                                 statusCode: error.statusCode,
//                                 commandName: commandName,
//                                 message: error.message
//                             });
//                             return cb(error);
//                         }
//                         else {
//                             var error = new Error('An unexpected error occurred, could not find a match.');
//                             error.statusCode = 500;
//                             //log.error(commandName + ' > ', error.statusCode, error.message);
//                             logger.error({
//                                 log: {
//                                     commandName: commandName,
//                                     err: error,
//                                     statusCode: error.statusCode,
//                                     message: error.message
//                                 }
//                             });
//                             return cb(error);
//                         }
//                     });
//             })
//             .catch(function (error) {
//                 return cb(error);
//             });
//     }
// };
