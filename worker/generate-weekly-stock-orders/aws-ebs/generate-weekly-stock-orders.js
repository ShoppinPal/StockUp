'use strict';

var runMe = function (payload, config) {
  var SUCCESS = 0;
  var FAILURE = 1;

  try {
    var path = require('path');
    var Promise = require('bluebird'); // jshint ignore:line
    var logger = require('tracer').console(); //var logger = console;

    // Global variable for logging
    var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

    logger.log(commandName, 'process.argv', process.argv);
    logger.log(commandName, 'payload:', payload);
    logger.log(commandName, 'config:', config);

    try {
      return Promise.resolve()
        .then(function () {
          logger.log(commandName, 'START: worker logic');

          var IronWorker = require('iron_worker');
          var iwClient = new IronWorker.Client({
            token: payload.oauthToken,
            project_id: payload.projectId
          });
          var tasksCreateAsync = Promise.promisify(iwClient.tasksCreate, {context: iwClient});

          var delayInSeconds = 600; // keep workers 10 minute apart to avoid Vend's API rate limits from being hit
          var delayByCounter = 0;
          return Promise.map(
            payload.workerPayloads || [],
            function (workerPayload) {
              return tasksCreateAsync(
                'warehouse.manual.mongo',
                workerPayload,
                {
                  delay: delayInSeconds * delayByCounter, // The number of seconds to delay before actually queuing the task
                  timeout: 600, // The maximum runtime of your task in seconds
                  priority: 2,
                  cluster: 'default'
                }
              )
                .then(function () {
                  logger.log(commandName, 'queued-up a worker with delay set to:', delayInSeconds * delayByCounter);
                  delayByCounter++; // get ready for the next one
                  return Promise.resolve();
                });
            },
            {concurrency: 1} // delayByCounter works because concurrency is set to 1
          )
            .then(function () {
              logger.log(commandName, 'queued-up all the workers');
              logger.log(commandName, 'END: worker logic');
              return Promise.resolve();
            });
        })
        .catch(function (err) {
          console.error('ERROR', err);
          logger.log('ERROR', err);
          process.exit(FAILURE);
        });
    }
    catch (e) {
      console.error('ERROR', e);
      logger.log('ERROR', e);
      process.exit(FAILURE);
    }
  } catch (e) {
    console.error('last catch block');
    console.error(e);
    process.exit(FAILURE);
  }
};

module.exports = {
  run: runMe
};