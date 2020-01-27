var http = require('http');

//var logger = require('tracer').console(); //var logger = console;
var logger = require('sp-json-logger')();

var AWS = require('aws-sdk');
var Promise = require('bluebird');
var clearRequire = require('clear-require');

var SUCCESS = 0;
var FAILURE = 1;

const Sentry = require('@sentry/node');
var sentryDNS = process.env.STOCKUP_SENTRY_WORKER_V2_DNS;

Sentry.init({ dsn: sentryDNS });

logger.debug({
    message: 'Sentry initiated at sqs worker',
    env: process.env.APP_HOST_NAME,
    sentryDNS: sentryDNS
});

var sqs = new AWS.SQS({
    region: process.env.AWS_SQS_REGION,
    accessKeyId: process.env.AWS_SQS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SQS_SECRET_ACCESS_KEY,
    params: {
        QueueUrl: process.env.AWS_SQS_URL
    }
});

var receiveMessage = Promise.promisify(sqs.receiveMessage, sqs);
var deleteMessage = Promise.promisify(sqs.deleteMessage, sqs);

logger.debug({
    message: 'Looking for jobs from SQS Queue',
    queueUrl: process.env.AWS_SQS_URL
});

return receiveMessage({
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 20
})
    .then(
        function handleMessageResolve(data) {
            if (!data.Messages) {
                return;
            }
            //logger.debug("\n\n\n\n\n\nFETCHED "+data.Messages.length+" MESSAGES FROM SQS QUEUE.\n\n\n\n\n\n");
            logger.tag('SQS Message Received').debug({
                message: `FETCHED ${data.Messages.length} MESSAGES FROM SQS QUEUE`,
                data
            });
            var taskId = Date.now();
            return handlePayload(JSON.parse(data.Messages[0].Body), data.Messages[0].MessageId, data.Messages[0].ReceiptHandle, taskId)
                .then(function (response) {
                    //logger.debug("Processed MessageId : "+data.Messages[0].MessageId+" successfully.");
                    logger.tag('Message Processed').debug({
                        messageId: data.Messages[0].MessageId,
                        message: 'Message processed successfully'
                    });
                    process.exit(SUCCESS);
                })
                .catch(function (error) {
                    //logger.debug("Processing MessageId : "+data.Messages[0].MessageId+" failed. Exiting.");
                    logger.tag('Message Failed').debug({
                        message: 'Processing message failed',
                        messageId: data.Messages[0].MessageId
                    });
                    logger.error({err: error});
                    process.exit(FAILURE);
                });
        })
    .catch(
        function handleError(error) {
            switch (error.type) {
                case "EmptyQueue":
                    //console.log( "Expected Error:", error.message );
                    break;
                default:
                    //logger.error( "Unexpected Error:", error.message );
                    logger.tag('Unexpected Error').error({err: error});
                    break;
            }
        }
    );

function workflowError(type, error) {
    error.type = type;
    return ( error );
}

function handlePayload(payload, messageId, receiptHandle, taskId) {
    // logger.debug('[MessageId : ' + messageId + ']' + 'inside handlePayload', 'payload:', payload);
    logger.tag('Inside handlePayload()').debug({
        messageId: messageId,
        payload: payload
    });
    return updateStatus(STATUS_STARTED, payload)
        .then(function () {
            try {
                if (!payload || !validatePayload(payload)) {
                    return Promise.reject('Invalid payload: ' + JSON.stringify(payload));
                }
                else {
                    return fetchConfig(payload.op) // TODO: should we remove the `return` from here?
                        .then(function parseConfig(rawConfig) {
                            //logger.debug('[MessageId : '+messageId+']'+'inside parseConfig');
                            logger.tag('inside parseConfig').debug({messageId: messageId});
                            var config;
                            try {
                                if (rawConfig) {
                                    config = JSON.parse(rawConfig.Body.toString());
                                }else {
                                    config = {};
                                }
                                //logger.debug('[MessageId : '+messageId+']'+'config:', config);
                                logger.tag('Message Config').debug({messageId: messageId, config: config});
                                return routeToWorker(payload, config, taskId, messageId, receiptHandle)
                                    .then(function (response) {
                                        return (
                                            deleteMessage({
                                                ReceiptHandle: response
                                            })
                                                .then(function (msgId) {
                                                    //logger.debug('[MessageId : '+messageId+']'+'Message ID : ',msgId, ' deleted successfully');
                                                    logger.tag('Messsage Deletion').debug({
                                                        messageId: messageId,
                                                        msgId: msgId,
                                                        message: 'Deleted successfully'
                                                    });
                                                    return Promise.resolve(messageId);
                                                })
                                                .catch(function (err) {
                                                    //logger.debug('[MessageId : '+messageId+']'+err+'\nDeletion of message failed from Queue.');
                                                    logger.tag('Message Deletion').error({
                                                        err: err,
                                                        messageId: messageId,
                                                        message: 'Deletion of message failed from Queue'
                                                    });
                                                    return Promise.reject(messageId);

                                                })
                                        )
                                    })
                                    .catch(function (error) {
                                        return Promise.reject("Worker processing failed.")
                                    });
                            }catch (e) { // JSON parsing problems should stop the worker
                                //logger.error('[MessageId : '+messageId+']'+e);
                                logger.error({err: e, messageId: messageId});
                                return Promise.reject('Internal Server Error');

                            }
                        });
                }
            }catch (e) {
                //logger.error('[MessageId : '+messageId+']'+e);
                logger.error({err: e, messageId: messageId});
                return Promise.reject('an unexpected error occured');
            }
        })
        .catch(function (error) {
            return Promise.reject("Error : " + error);
        });
}

var STATUS_STARTED = 'started';
var STATUS_FAILED = 'failed';
var STATUS_FINISHED = 'finished';

function updateStatus(status, payload) {
    if (process.env.esUrl &&
        process.env.esVersion &&
        process.env.esIndexName &&
        process.env.esIndexType) {
        var moment = require('moment');
        var elasticsearch = require('elasticsearch');
        var client = new elasticsearch.Client({
            host: process.env.esUrl
            , apiVersion: process.env.esVersion
            //,log: 'trace'
        });
        return client.update({
            index: process.env.esIndexName
            , type: process.env.esIndexType
            , id: taskId + '_' + messageId
            , body: {
                doc_as_upsert: true
                , doc: {
                    taskId: taskId
                    , messageId: messageId
                    , status: status //(started|failed|finished)
                    , payload: (payload) ? payload : undefined
                    , startedOn: (status === 'started') ? moment() : undefined
                    , endedOn: (status !== 'started') ? moment() : undefined
                }
            }
        })
            .catch(function (error) { // TODO: good infra and code will bring this down to zero overtime
                //logger.error('could not update worker status', error);
                logger.error({err: error});
                return Promise.resolve(); // forgive and forget
            });
    }
    else {
        logger.debug({message: 'env is not configured for elasticsearch reporting'});
        return Promise.resolve(); // forgive and forget
    }
}

function validatePayload(payload) {
    //logger.debug('inside validatePayload');
    logger.debug({message: 'inside validatePayload'});
    if (!payload.op) {
        return false;
    }
    if (payload.op === 'generateStockOrder') {
        return true;
    }
    if (payload.op === 'generateWeeklyStockOrders') {
        if (!payload.oauthToken) {
            return false;
        }
        if (!payload.projectId) {
            return false;
        }
        if (!payload.workerPayloads) {
            return false;
        }
    }
    return true;
}

/**
 * Schedule jobs must have a payload setup for them in an S3 bucket
 * @param key
 */
function fetchScheduledPayload(key) {
    logger.debug({message: 'inside fetchScheduledPayload', key: key});
    var s3 = new AWS.S3({
        region: process.env.AWS_SQS_REGION,
        accessKeyId: process.env.AWS_SQS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SQS_SECRET_ACCESS_KEY,

    });
    var getObjectAsync = Promise.promisify(s3.getObject, s3);
    return getObjectAsync({
        Bucket: process.env.scheduledPayloadsBucket,
        Key: key + '.json'
    })
        .catch(function (error) {
            //logger.error(error.stack);
            logger.error({err: error});
            /* ignore workers that have no data in s3 */
            return Promise.resolve();
        });
}

function fetchConfig(key) {
    logger.tag('inside fetchConfig').debug({key: key});
    var s3 = new AWS.S3({
        region: process.env.AWS_SQS_REGION,
        accessKeyId: process.env.AWS_SQS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SQS_SECRET_ACCESS_KEY,

    });
    var getObjectAsync = Promise.promisify(s3.getObject, s3);
    return getObjectAsync({
        Bucket: 'jobs-config',
        Key: key + '.json'
    })
        .catch(function (error) {
            //logger.error(error.stack);
            logger.error({err: error});
            /* ignore workers that have no data in s3 */
            return Promise.resolve();
        });
}

function routeToWorker(payload, config, taskId, messageId, receiptHandle) {
    //logger.debug('[MessageId : '+messageId+']'+'payload.op:', payload.op);
    logger.tag('Worker Operation').debug({messageId: messageId, payloadOperation: payload.op});
    clearRequire.all();
    if (process.env.WORKERS_VERSION === 'v1') {
        if (payload.op === 'generateStockOrder') {
            //logger.info('[MessageId : '+messageId+']'+'routed to generateStockOrder');
            logger.tag('Routed').info({messageId: messageId, message: 'routed to generateStockOrder'});
            var generateStockOrder = require('./workers/generate-stock-order/generate-stock-order');
            return generateStockOrder.run(payload, config, taskId, messageId)
                .then(function () {
                    //logger.debug('[MessageId : '+messageId+']'+'generated stock order successfully');
                    logger.debug({messageId: messageId, message: 'generated stock order successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    //logger.error('[MessageId : '+messageId+']'+error);
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');

                });
        }
        else if (payload.op === 'generateStockOrderSeriallyWithPaging') {
            //logger.info('[MessageId : '+messageId+']'+'routed to generateStockOrderSeriallyWithPaging');
            logger.tag('Routed').info({
                messageId: messageId,
                message: 'routed to generateStockOrderSeriallyWithPaging'
            });
            var generateStockOrderSeriallyWithPaging = require('./workers/generate-stock-order-serially-with-paging/generate-stock-order-serially-with-paging');
            return generateStockOrderSeriallyWithPaging.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'generated stock order successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    //logger.error('[MessageId : '+messageId+']'+error);
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');

                });
        }
        else if (payload.op === 'generateWeeklyStockOrders') {
            var generateWeeklyStockOrders = require('./workers/generate-weekly-stock-orders/generate-weekly-stock-orders');
            return generateWeeklyStockOrders.run(payload, config)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'generated weekly stock orders successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');

                });
        }
        else if (payload.op === 'importStockOrderUsingCache') {
            logger.tag('Routed').info({messageId: messageId, message: 'routed to importStockOrderUsingCache'});
            var importStockOrderUsingCache = require('./workers/import-stock-order-using-cache/import-stock-order-using-cache');
            return importStockOrderUsingCache.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'imported stock order successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    //logger.error('[MessageId : '+messageId+']'+error);
                    logger.error({err: error, messageId: messageId})
                    return Promise.reject('Internal Server Error');

                });
        }
        else if (payload.op === 'importStockOrderUsingCacheWithoutSupplier') {
            //logger.info('[MessageId : '+messageId+']'+'routed to importStockOrderUsingCacheWithoutSupplier');
            logger.tag('Routed').info({
                messageId: messageId,
                message: 'routed to importStockOrderUsingCacheWithoutSupplier'
            });
            var importStockOrderUsingCacheWithoutSupplier = require('./workers/import-stock-order-using-cache-without-supplier/import-stock-order-using-cache-without-supplier');
            return importStockOrderUsingCacheWithoutSupplier.run(payload, config, taskId, messageId)
                .then(function () {
                    //logger.debug('[MessageId : '+messageId+']'+'imported stock order without supplier successfully') ;
                    logger.debug({messageId: messageId, message: 'imported stock order without supplier successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    //logger.error('[MessageId : '+messageId+']'+error);
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');

                });
        }
        else if (payload.op === 'removeUnfulfilledProductsFromStockOrder') {
            logger.tag('Routed').info({
                messageId: messageId,
                message: 'routed to removeUnfulfilledProductsFromStockOrder'
            });
            var removeUnfulfilledProductsFromStockOrder = require('./workers/remove-unfulfilled-products-from-stock-order/remove-unfulfilled-products-from-stock-order');
            return removeUnfulfilledProductsFromStockOrder.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({
                        messageId: messageId,
                        message: 'removed unfulfilled products from stock order successfully'
                    });
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');
                });
        }
        else if (payload.op === 'removeUnreceivedProductsFromStockOrder') {
            logger.tag('Routed').info({
                messageId: messageId,
                message: 'routed to removeUnreceivedProductsFromStockOrder'
            });
            var removeUnreceivedProductsFromStockOrder = require('./workers/remove-unreceived-products-from-stock-order/remove-unreceived-products-from-stock-order');
            return removeUnreceivedProductsFromStockOrder.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({
                        messageId: messageId,
                        message: 'removed unreceived products from stock order successfully'
                    });
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');
                });
        }
        else if (payload.op === 'addProductsToVendConsignment') {
            //logger.info('[MessageId : '+messageId+']'+'routed to addProductsToVendConsignment');
            logger.tag('Routed').info({messageId: messageId, message: 'routed to addProductsToVendConsignment'});
            var addProductsToVendConsignment = require('./workers/add-products-to-vend-consignment/add-products-to-vend-consignment');
            return addProductsToVendConsignment.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'added products to vend consignment successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');
                });
        }
        else {
            return Promise.reject('No worker found for processing given payload: ' + JSON.stringify(payload));
        }
    }
    else if (process.env.WORKERS_VERSION === 'v2') {
        if (payload.op === 'importStockOrderUsingCache') {
            logger.info({messageId: messageId, message: 'routed to importStockOrderUsingCache'});
            var importStockOrderUsingCache = require('./workers-v2/import-stock-order/import-stock-order');
            return importStockOrderUsingCache.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'imported stock order successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    // logger.error('[MessageId : ' + messageId + ']' + error);
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');

                });
        }
        else if (payload.op === 'importStockOrderUsingCacheWithoutSupplier') {
            logger.info({messageId: messageId, message: 'routed to importStockOrderUsingCacheWithoutSupplier'});
            var importStockOrderUsingCacheWithoutSupplier = require('./workers-v2/import-stock-order/import-stock-order');
            return importStockOrderUsingCacheWithoutSupplier.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'imported stock order without supplier successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    // logger.error('[MessageId : ' + messageId + ']' + error);
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');

                });
        }
        else if (payload.op === 'generateSales') {
            logger.info({messageId: messageId, message: 'routed to generateSales'});
            var generateSales = require('./workers-v2/generate-sales/generate-sales');
            return generateSales.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'generate sales for consignment successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    // logger.error('[MessageId : ' + messageId + ']' + error);
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');
                });
        }
        // else if (payload.op === 'findDifferentialVendData') {
        //     logger.info({messageId: messageId, message: 'routed to findDifferentialVendData'});
        //     var findDifferentialVendData = require('./workers-v2/find-differential-vend-data/find-differential-vend-data');
        //     // return findDifferentialVendData.run(payload, config, taskId, messageId)
        //     return findDifferentialVendData.run(payload, config, taskId, messageId)
        //         .then(function () {
        //             logger.info({
        //                 messageId: messageId,
        //                 message: 'successfully finished fetching differential vend data'
        //             });
        //             return Promise.resolve(receiptHandle);
        //         })
        //         .catch(function (error) {
        //             // logger.error('[MessageId : ' + messageId + ']' + error);
        //             logger.error({err: error, messageId: messageId});
        //             return Promise.reject('Internal Server Error');
        //         });
        // }
        else if (payload.op === 'generateStockOrderVend') {
            logger.tag('Routed').info({messageId: messageId, message: 'routed to generateStockOrderVend'});
            var generateStockOrderVend = require('./workers-v2/generate-stock-order/generate-stock-order-vend');
            return generateStockOrderVend.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'generated stock order successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');

                });
        }
        //paging or no-paging doesn't matter in workersV2. Just being cautious.
        else if (payload.op === 'generateStockOrderSeriallyWithPaging') {
            logger.tag('Routed').info({
                messageId: messageId,
                message: 'routed to generateStockOrderSeriallyWithPaging'
            });
            var generateStockOrder = require('./workers-v2/generate-stock-order/generate-stock-order');
            return generateStockOrder.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'generated stock order successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');
                });
        }
        else if (payload.op === 'generateReorderPointsMSD') {
            logger.tag('Routed').info({
                messageId: messageId,
                message: 'routed to generateReorderPointsMSD'
            });
            var generateReorderPointsMSD = require('./workers-v2/generate-reorder-points/generate-reorder-points-msd');
            return generateReorderPointsMSD.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'generated reorder points successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');
                });
        }
        else if (payload.op === 'generateStockOrderMSD') {
            logger.tag('Routed').info({
                messageId: messageId,
                message: 'routed to generateStockOrderMSD'
            });
            var generateStockOrderMSD = require('./workers-v2/generate-stock-order/generate-stock-order-msd');
            return generateStockOrderMSD.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'generated stock order successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');
                });
        }
        else if (payload.op === 'createTransferOrderMSD') {
            logger.tag('Routed').info({
                messageId: messageId,
                message: 'routed to createTransferOrderMSD'
            });
            var createTransferOrderMSD = require('./workers-v2/generate-transfer-order-msd/generate-transfer-order-msd');
            return createTransferOrderMSD.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'created transfer order in MSD successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');
                });
        }
        else if (payload.op === 'createPurchaseOrderVend') {
            logger.tag('Routed').info({
                messageId: messageId,
                message: 'routed to createPurchaseOrderVend'
            });
            var createPurchaseOrderVend = require('./workers-v2/generate-purchase-order-vend/generate-purchase-order-vend');
            return createPurchaseOrderVend.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'created purchase order in Vend successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');
                });
        }
        else if (payload.op === 'receiveConsignment') {
            logger.tag('Routed').info({
                messageId: messageId,
                message: 'routed to receiveConsignment'
            });
            var receiveConsignment = require('./workers-v2/receive-consignment/receive-consignment-vend');
            return receiveConsignment.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'received purchase order in Vend successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');
                });
        }
        else if (payload.op === 'importVendOrderFromFile') {
            logger.tag('Routed').info({
                messageId: messageId,
                message: 'routed to importVendOrderFromFile'
            });
            var importVendOrderFromFile = require('./workers-v2/import-stock-order/import-stock-order-vend');
            return importVendOrderFromFile.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'imported stock order from file successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');
                });
        }
        else if (payload.op === 'checkVendInventory') {
            logger.tag('Routed').info({
                messageId: messageId,
                message: 'routed to checkVendInventory'
            });
            var checkVendInventory = require('./workers-v2/fetch-incremental-inventory/check-vend-inventory');
            return checkVendInventory.run(payload, config, taskId, messageId)
                .then(function () {
                    logger.debug({messageId: messageId, message: 'checked vend inventory successfully'});
                    return Promise.resolve(receiptHandle);
                })
                .catch(function (error) {
                    logger.error({err: error, messageId: messageId});
                    return Promise.reject('Internal Server Error');
                });
        }
        else {
            return Promise.reject('No worker found for processing given payload: ' + JSON.stringify(payload));
        }
    }

}
