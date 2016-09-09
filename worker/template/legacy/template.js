'use strict';

var SUCCESS = 0;
var FAILURE = 1;

try {

  var fs = require('fs');
  var path = require('path');
  var Promise = require('bluebird'); // jshint ignore:line
  var _ = require('lodash');
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
        logger.log(commandName, 'TODO: write your worker code in this portion of the template');
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
