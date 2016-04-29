'use strict';

var SUCCESS = 0;
var FAILURE = 1;

try {

  var fs = require('fs');
  var path = require('path');
  var Promise = require('bluebird'); // jshint ignore:line
  var logger = require('tracer').console(); //var logger = console;

  // Global variable for logging
  var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

  var params = null;
  var task_id = null;
  var config = null;

  logger.log(commandName, process.argv);
  process.argv.forEach(function (val, index, array) {
    if (val === '-payload') {
      params = JSON.parse(fs.readFileSync(process.argv[index + 1], 'utf8'));
    }

    if (val === '-config') {
      config = JSON.parse(fs.readFileSync(process.argv[index + 1], 'utf8'));
    }

    if (val === '-id') {
      task_id = process.argv[index + 1];
    }
  });

  logger.log(commandName, 'params:', params);
  logger.log(commandName, 'config:', config);
  logger.log(commandName, 'task_id:', task_id);

  try {
    return Promise.resolve()
      .then(function(){
        logger.log(commandName, 'START: worker logic');

        var IronWorker = require('iron_worker');
        var iwClient = new IronWorker.Client({
          token: params.oauthToken,
          project_id: params.projectId
        });
        var tasksCreateAsync = Promise.promisify(iwClient.tasksCreate, {context: iwClient});

        var delayInSeconds = 600; // keep workers 10 minute apart to avoid Vend's API rate limits from being hit
        var delayByCounter = 0;
        return Promise.map(
          params.workerPayloads || [],
          function(workerPayload){
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
              .then(function(){
                logger.log(commandName, 'queued-up a worker with delay set to:', delayInSeconds * delayByCounter);
                delayByCounter++; // get ready for the next one
                return Promise.resolve();
              });
          },
          {concurrency: 1} // delayByCounter works because concurrency is set to 1
        )
          .then(function(){
            logger.log(commandName, 'queued-up all the workers');
            logger.log(commandName, 'END: worker logic');
          });
      })
      .catch(function(err) {
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

}
catch (e) {
  console.error('last catch block');
  console.error(e);
  process.exit(FAILURE);
}
