'use strict';

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('boot:'+fileName);
var logger = require('sp-json-logger');

module.exports = function(app) {
  var Role = app.models.Role;

  Role.registerResolver('$masterKey', function(role, context, callback) {
    // log('context.modelName: ', context.modelName);
    // log('context.accessToken: ', context.accessToken);
    logger.debug({log: {contextModelName: context.modelName, contextAccessToken: context.accessToken }});

    var masterKey = context.remotingContext.req.query['masterKey'];
    //log('context.remotingContext.req.query[masterKey]: ',masterKey);
    logger.debug({log: {message: `context.remotingContext.req.query[masterKey]: ${masterKey}` }});

    function reject() {
      process.nextTick(function() {
        callback(null, false);
      });
    }

    var Application = app.models.Application;
    Application.find(
      {where: {masterKey: masterKey}},
      function(err, app) {
        if (err) {
          // log('ERROR', err);
          // console.error(err);
          logger.error({err: err});
          return reject();
          //throw err;
        }
        //log(app);
        logger.debug({log: {app: app }});
        callback(null, (masterKey && app && app.length===1));
      });

  });

  Role.registerResolver('teamMember', function(role, context, cb) {
    function reject() {
      process.nextTick(function() {
        cb(null, false);
      });
    }

    // do not allow anonymous users
    var currentUserId = context.accessToken.userId;
    if (!currentUserId) {
      //log('do not allow anonymous users');
      logger.debug({log: {message: 'do not allow anonymous users' }});
      return reject();
    }

    // log('Role resolver for `teamMember`', '\n',
    //     ' - evaluate ' + context.model.definition.name + ' with id: ' + context.modelId, '\n',
    //     ' for currentUserId: ' + currentUserId);
    logger.debug({log: {
      message: `Role resolver for 'teamMember' \n
      - evaluate ${context.model.definition.name} with id: ${context.modelId} \n
      for currentUserId: ${currentUserId}`
    }});
    context.model.findById(context.modelId, function(err, modelInstance) {
      if (err) {
        //log('err', err);
        logger.error({err: err});
        return reject();
      }
      else if(!modelInstance) {
        //log('no model instance found');
        logger.debug({log: {message: 'no model instance found' }});
        return reject();
      }
      else {
        var TeamModel = app.models.TeamModel;
        // log('check if currentUserId:', currentUserId, '\n',
        //   'is in the team table for the given model\'s userId:', modelInstance.userId);
        logger.debug({log: {
          message: `check if currentUserId: ${currentUserId} \n
          is in the team table for the given model\'s userId: ${modelInstance.userId}`
        }});
        TeamModel.count({
          ownerId: modelInstance.userId,
          memberId: currentUserId
        }, function(err, count) {
          if (err) {
            console.log(err);
            return cb(null, false);
          }

          //log('is a team member? count > 0', (count > 0));
          logger.debug({log: {message: `is a team member? count > 0 ${(count > 0)}` }});
          cb(null, count > 0); // true = is a team member
        });
      }
    });
  });

  /*Role.registerResolver('$manager', function(role, context, callback) {
  });

  Role.registerResolver('$warehouse', function(role, context, callback) {
  });

  Role.registerResolver('$receiver', function(role, context, callback) {
  });*/

};
