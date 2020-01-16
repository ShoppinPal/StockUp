'use strict';
var Promise = require('bluebird');
var _ = require('underscore');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});

var app = require('./../../server/server'); //https://loopback.io/doc/en/lb2/Working-with-LoopBack-objects.html

var sendPayLoad = function (payload) {
    var AWS = require('aws-sdk');
    var sqs = new AWS.SQS({
        region: app.get('awsQueueRegion'),
        accessKeyId: app.get('awsQueueAccessKeyId'),
        secretAccessKey: app.get('awsQueueSecretAccessKey')
    });
    //var msg = { payload: 'a message' };
    var sqsParams = {
        MessageBody: JSON.stringify(payload),
        QueueUrl: app.get('awsQueueUrl2')
    };
    var sendMessageAsync = Promise.promisify(sqs.sendMessage, sqs);

    return sendMessageAsync(sqsParams)
        .then(successHandler)
        .then(function (data) {
            logger.debug({
                message: 'Received this worker task info',
                data,
                functionName: 'sendPayLoad'
            });
            /*SQS sample response:
             {
             "ResponseMetadata": {
             "RequestId": "aaa"
             },
             "MD5OfMessageBody": "bbb",
             "MessageId": "ccc"
             }*/
            return Promise.resolve(data);
        })
        .catch(ClientError, function (e) {
            console.log(e);
            var message = e.response.body; //TODO: TypeError: Cannot read property 'body' of undefined
            if (_.isObject(message)) {
                message = JSON.stringify(message, null, 2);
            }
            console.error('A ClientError happened: \n'
                + e.statusCode + ' ' + message + '\n'
                /*+ JSON.stringify(e.response.headers,null,2)
                 + JSON.stringify(e,null,2)*/
            );
            // TODO: add retry logic?
            return Promise.reject(e.statusCode + ' ' + message); // TODO: throw unknown errors but reject well known errors?
            // cb(e.statusCode + ' ' + message);
        })
        .catch(function (e) {
            console.error('report-model.js - generateStockOrderReportForManager - An unexpected error occurred: ', e);
            //throw e; // TODO: throw unknown errors but reject well known errors?
            return Promise.reject(e);
            // cb(e);
        });
};

var ClientError = function ClientError(e) {
    return e.statusCode>=400 && e.statusCode<500;
};
var successHandler = function (response) {
    if (_.isArray(response)) {
        console.log('response is an array');
    }
    else if (_.isObject(response)) {
        console.log('response is an object');
        return Promise.resolve(response);
    }
    else if (_.isString(response)) {
        console.log('response is a string');
        try {
            var responseObject = JSON.parse(response);
            //console.log(responseObject);
            return Promise.resolve(responseObject);
        }
        catch (error) {
            console.error('caught an error: ', error);
            throw error;
        }
    }
    else {
        console.log(response);
    }
};

module.exports = {
    sendPayLoad: sendPayLoad,
    messageFor: {
        MESSAGE_FOR_CLIENT: 'MESSAGE_FOR_CLIENT',
        MESSAGE_FOR_API: 'MESSAGE_FOR_API'
    }
};
