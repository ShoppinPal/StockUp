var http = require('http');

var logger = require('tracer').console(); //var logger = console;

http.createServer(function(req,res){

    req.on('data',function(data){
        var payload, config;
        try {
            payload = JSON.parse(data.toString());
            config = {}; //TODO: worker specific config should come from somewhere?

            if (!payload || !validatePayload(payload)) {
                returnResponse(res, 400, logger, 'Invalid payload: ' + JSON.stringify(payload));
            } else {
                var generateWeeklyStockOrders = require('./generate-weekly-stock-orders');
                generateWeeklyStockOrders.run(payload, config)
                  .then(function(){
                      returnResponse(res, 200, logger, 'generated weekly stock orders successfully') ;
                  })
                  .catch(function(error){
                      logger.error(error);
                      return;
                  });
            }
        } catch(e) {
            returnResponse(res, 400, logger, 'Invalid json: ' + data.toString());
        }
    });
}).listen(process.env.PORT || 80);

function returnResponse(httpResponse, status, logger, message) {
    if (status === 200) {
        logger.info(message);
    } else{
        logger.error(message);
    }

    httpResponse.writeHead(status);
    httpResponse.write(message);
    httpResponse.end();
}

function validatePayload(payload){
    if(!payload.oauthToken) {
        return false;
    }
    if(!payload.projectId) {
        return false;
    }
    if(!payload.workerPayloads) {
        return false;
    }
    return true;
}
