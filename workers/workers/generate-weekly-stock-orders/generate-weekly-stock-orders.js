'use strict';

var Promise = require('bluebird');
var AWS = require('aws-sdk');
const logger = require('sp-json-logger')();


var runMe = function () {
  var SUCCESS = 0;
  var FAILURE = 1;

  try {
    var path = require('path');
    // Global variable for logging
    var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

    logger.debug({
      commandName: commandName,
      argv: process.argv
    });

    try {
      return Promise.resolve()
        .then(function () {
          logger.debug({ commandName: commandName, message: 'Start: worker logic' });

          return fetchScheduledPayloads()
            .then(function parseScheduledPayloads(rawScheduledPayloads) {
              logger.tag('inside parseScheduledPayloads').debug({
                rawScheduledPayloads: rawScheduledPayloads,
                message: 'inside parseScheduledPayloads'
              });
              var scheduledPayloads;
              try {
                if (rawScheduledPayloads) {
                  scheduledPayloads = JSON.parse(rawScheduledPayloads.Body.toString());
                }else {
                  scheduledPayloads = {};
                }
                //console.log('scheduledPayloads:', scheduledPayloads);
                logger.debug({ scheduledPayloads: scheduledPayloads });
                var sqs = new AWS.SQS({
                  region: process.env.AWS_SQS_REGION,
                  accessKeyId: process.env.AWS_SQS_ACCESS_KEY_ID,
                  secretAccessKey: process.env.AWS_SQS_SECRET_ACCESS_KEY,
                });

                return Promise.map(
                  scheduledPayloads.workerPayloads,
                  function (singleScheduledPayload) {
                    var sqsParams = {
                      MessageBody: JSON.stringify(singleScheduledPayload),
                      QueueUrl: process.env.AWS_SQS_URL
                    };

                    var sendMessageAsync = Promise.promisify(sqs.sendMessage, sqs);

                    return sendMessageAsync(sqsParams)
                      .then(function (messageDetails) {
                        // Empty then?
                      })
                      .catch(function () {
                        // Empty catch?
                      });

                  },
                  {concurrency: 1}
                )

                  .then(function () {
                    logger.debug({
                      commandName: commandName,
                      message: 'queued-up all the workers. END: worker logic'
                    });
                    return Promise.resolve();
                  });
              }catch (e) { // JSON parsing problems should stop the worker
                logger.error({err: e});
              }
            });


        })
        .catch(function (err) {
          // console.error('ERROR', err);
          // console.log('ERROR', err);
          logger.error({err: err});
          process.exit(FAILURE);
        });
    }
    catch (e) {
      // console.error('ERROR', e);
      // console.log('ERROR', e);
      logger.error({err: e});
      process.exit(FAILURE);
    }
  }catch (e) {
    // console.error('last catch block');
    // console.error(e);
    logger.error({err: e});
    process.exit(FAILURE);
  }
};

function fetchScheduledPayloads() {
  //console.log('inside fetchScheduledPayloads');
  logger.tag('inside fetchScheduledPayloads').debug({ message: 'inside fetchScheduledPayloads' });
  var s3 = new AWS.S3({
    region: process.env.AWS_SQS_REGION,
    accessKeyId: process.env.AWS_SQS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SQS_SECRET_ACCESS_KEY,

  });
  var getObjectAsync = Promise.promisify(s3.getObject, s3);
  return getObjectAsync({
    Bucket: process.env.scheduledPayloadsBucket,
    Key: process.env.scheduledPayloadsFile + '.json'
  })
    .catch(function (error) {
      //console.log(error.stack);
      logger.error({err: error});
      /* ignore workers that have no data in s3 */
      return Promise.resolve();
    });
}


runMe();
