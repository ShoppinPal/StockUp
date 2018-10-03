global.Promise = require('bluebird');
var _ = require('underscore');

var AWS = require('aws-sdk');

try {
    var sqs = new AWS.SQS({
        region: process.env.AWS_SQS_REGION,
        accessKeyId: process.env.AWS_SQS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SQS_SECRET_ACCESS_KEY
    });

    var client = require('./../client/loopback.js');
// the remote datasource
    var remoteDS = client.dataSources.remoteDS;

// the strong-remoting RemoteObjects instance
    var remotes = remoteDS.connector.remotes;

    var ReportModel = client.models.ReportModel;
}
catch (e) {
    console.error('[MessageId : ' + messageId + '] ' + 'initiate-generate-sales-worker', e);
}


var initiateGenerateSalesWorker = {
    desc: 'This will kick off the generate sales worker',
    options: {},
    run: function (reportModelInstance, previousPayload, messageId) {

        var options = {
            json: {
                op: 'generateSales',
                tokenService: previousPayload.tokenService,
                clientId: previousPayload.clientId,
                clientSecret: previousPayload.clientSecret,
                tokenType: previousPayload.tokenType,
                accessToken: previousPayload.accessToken,
                refreshToken: previousPayload.refreshToken,
                domainPrefix: previousPayload.domainPrefix,
                loopbackServerUrl: previousPayload.loopbackServerUrl,
                loopbackAccessToken: previousPayload.loopbackAccessToken,
                reportId: previousPayload.reportId,
                customerOutletName: reportModelInstance.outlet.name,
                customerId: reportModelInstance.vendCustomerId,
                warehouseOutletName: reportModelInstance.warehouseOutlet.name,
                warehouseOutletId: reportModelInstance.warehouseOutlet.id,
                paymentTypeId: reportModelInstance.paymentTypeId
            }
        };
        console.log('[MessageId : ' + messageId + '] ' + 'Will send a request with', 'options.json', JSON.stringify(options.json, null, 2));

        //var msg = { payload: 'a message' };
        var sqsParams;
        sqsParams = {
            MessageBody: JSON.stringify(options.json),
            QueueUrl: process.env.AWS_SQS_URL_2
        };
        var sendMessageAsync = Promise.promisify(sqs.sendMessage, sqs);

        return Promise.resolve()
            .then(function setupAuthentication() {
                console.log('[MessageId : ' + messageId + '] ' + 'Authenticating through loopback');

                remotes.auth = {
                    bearer: (new Buffer(previousPayload.loopbackAccessToken.id)).toString('base64'),
                    sendImmediately: true
                };
                console.log('[MessageId : ' + messageId + '] ' + 'The access token to be used for all future invocations has been set');

                return Promise.resolve();
            })
            .then(function () {
                console.log('[MessageId : ' + messageId + '] ' + 'Sending payload to workerV2 service');
                return sendMessageAsync(sqsParams);
            })
            .then(successHandler)
            .then(function (data) {
                console.log('[MessageId : ' + messageId + '] ' + 'Save the worker task info in ReportModel', JSON.stringify(data, null, 2));
                /*SQS sample response:
                 {
                 "ResponseMetadata": {
                 "RequestId": "aaa"
                 },
                 "MD5OfMessageBody": "bbb",
                 "MessageId": "ccc"
                 }*/
                return ReportModel.updateAll({
                        id: reportModelInstance.id
                    },
                    {
                        salesWorkerTaskId: data.MessageId //data.id
                        //,workerStatus: data.msg
                    });
            })
            .catch(ClientError, function (e) {
                console.error('[MessageId : ' + messageId + '] ' + e);
                var message = e; //kamal: TODO: TypeError: Cannot read property 'body' of undefined
                if (_.isObject(message)) {
                    message = JSON.stringify(message, null, 2);
                }
                console.error('[MessageId : ' + messageId + '] ' + 'A ClientError happened: \n'
                    + e.statusCode + ' ' + message + '\n'
                    /*+ JSON.stringify(e.response.headers,null,2)
                     + JSON.stringify(e,null,2)*/
                );
                // TODO: add retry logic?
                return Promise.reject(e.statusCode + ' ' + message); // TODO: throw unknown errors but reject well known errors?
            })
            .catch(function (e) {
                console.error('[MessageId : ' + messageId + '] ' + 'An unexpected error occurred: ', e);
                //throw e; // TODO: throw unknown errors but reject well known errors?
                return Promise.reject(e);
            });

    }
};

var successHandler = function (response, messageId) {
    if (_.isArray(response)) {
        console.log('[MessageId : ' + messageId + '] ' + 'response is an array');
    }
    else if (_.isObject(response)) {
        console.log('[MessageId : ' + messageId + '] ' + 'response is an object');
        return Promise.resolve(response);
    }
    else if (_.isString(response)) {
        console.log('[MessageId : ' + messageId + '] ' + 'response is a string');
        try {
            var responseObject = JSON.parse(response);
            //console.log('[MessageId : '+messageId+'] '+responseObject);
            return Promise.resolve(responseObject);
        }
        catch (error) {
            console.error('[MessageId : ' + messageId + '] ' + 'caught an error: ', error);
            throw error;
        }
    }
    else {
        console.log('[MessageId : ' + messageId + '] ' + response);
    }
};

var ClientError = function ClientError(e) {
    return e.statusCode>=400 && e.statusCode<500;
};


module.exports = initiateGenerateSalesWorker;
