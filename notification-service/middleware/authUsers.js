let request = require('request-promise');
let logger = require('sp-json-logger')({fileName: 'middleware/authUsers.js'});

module.exports = (req, res, next) => {
    let accessToken = req.query.access_token;
    //TODO: remove later
    next();
    if (!accessToken) {
        let error = new Error('Unauthorized request');
        error.statusCode = 401;
        next(error);
    }
    else {
        let apiServiceURL = `${process.env.APP_PROTOCOL}://${process.env.APP_HOST_NAME}${process.env.APP_PORT_NUMBER ? `:${process.env.APP_PORT_NUMBER}`: ''}/api/OrgModel/authenticateRequest?access_token=${accessToken}`;
        request({
            method: 'GET',
            uri: apiServiceURL
        })
        .then(response => {
            logger.debug({
                message: `User request is authenticated`,
                response
            });
            next();
        })
        .catch(error => {
            logger.error({
                error,
                message: 'Error authenticate request with api service'
            });
            next(error);
        });
    }
}