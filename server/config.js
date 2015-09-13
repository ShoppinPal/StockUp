module.exports = {
  'restApiRoot': '/api',
  'host': '0.0.0.0',
  'port': 3000,
  'legacyExplorer': false,
  'aclErrorStatus': 403,
  'remoting': {
    'json': {
      'limit': '50mb'
    },
    'errorHandler': {
      'handler': function(err, req, res, next) {
        // Other options for namespace?
        //  > 'strong-remoting:rest-adapter'
        //  > 'server:middleware:errorHandler'
        var log = require('debug')('server:rest:errorHandler');
        log(req.method, req.originalUrl, res.statusCode, err);
        next(); // let the default error handler (RestAdapter.errorHandler) run next
      }
    }
  }
};
