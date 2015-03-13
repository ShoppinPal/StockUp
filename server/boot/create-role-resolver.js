var debug = require('debug')('boot:create-role-resolver');

module.exports = function(app) {
  var Role = app.models.Role;

  Role.registerResolver('$masterKey', function(role, context, callback) {
    debug('context.modelName: ', context.modelName);
    debug('context.accessToken: ', context.accessToken);

    var masterKey = context.remotingContext.req.query['masterKey'];
    debug('context.remotingContext.req.query[masterKey]: ',masterKey);

    var Application = app.models.Application;
    Application.find(
      {where: {masterKey: masterKey}},
      function(err, app) {
        if (err) {
          callback(null, false);
          //throw err;
        }
        debug(app);
        callback(null, (masterKey && app && app.length===1));
      });

  });
};
