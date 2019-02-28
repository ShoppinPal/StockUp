var Promise = require('bluebird');
var logger = require('sp-json-logger');

module.exports = function (StoreConfigModel) {

    // https://github.com/strongloop/loopback/issues/418
    // once a model is attached to the data source
    StoreConfigModel.on('dataSourceAttached', function (obj) {
        // wrap the whole model in Promise
        // but we need to avoid 'validate' method
        StoreConfigModel = Promise.promisifyAll(
            StoreConfigModel,
            {
                filter: function (name, func, target) {
                    return !( name == 'validate');
                }
            }
        );
    });

    /*StoreConfigModel.beforeValidate = function(next, modelInstance) {
     console.log('inside StoreConfigModel.beforeValidate()');
     console.log(modelInstance);
     modelInstance.transactionFee = 0.1;
     console.log(modelInstance);
     next();
     };*/

    // TODO: Create a StoreConfigModel for UserModel (identify the owner via token)
    //       if this is exposed via remote method then there is no need to validate token as ACLs would have done it
    //       also the calling remote method wrapper can provide the UserModel instance
    //       so that related models can have it as their $owner

    StoreConfigModel.remoteMethod('getVendRegisters', {
        accepts: [
            {arg: 'id', type: 'string', required: true}
        ],
        //http: {path: '/:id/:pos/:entity', verb: 'get'}
        http: {path: '/:id/vend/registers', verb: 'get'},
        returns: {arg: 'registers', type: 'array', root: true}
    });
    StoreConfigModel.getVendRegisters = function (id, cb) {
        var currentUser = StoreConfigModel.getCurrentUserModel(cb); // returns  immediately if no currentUser

        if (currentUser) {
            //cb(null);

            // Is GlobalConfigModel already promise'fied? YES!!!
            /*var GlobalConfigModel = StoreConfigModel.app.models.GlobalConfigModel;
             return GlobalConfigModel.findOne({})
             .then(function(globalConfig) {
             console.log('globalConfig', globalConfig);
             cb(null);
             });*/

            var oauthVendUtil = require('./../../common/utils/vend')({
                'GlobalConfigModel': StoreConfigModel.app.models.GlobalConfigModel,
                'StoreConfigModel': StoreConfigModel,
                'currentUser': currentUser
            });
            oauthVendUtil.getVendRegisters(id)
                .then(function (registers) {
                        cb(null, registers);
                    },
                    function (error) {
                        cb(error);
                    });
        }
    };

    StoreConfigModel.remoteMethod('getVendTaxes', {
        accepts: [
            {arg: 'id', type: 'string', required: true}
        ],
        http: {path: '/:id/vend/taxes', verb: 'get'},
        returns: {arg: 'taxes', type: 'array', root: true}
    });
    StoreConfigModel.getVendTaxes = function (id, cb) {
        var currentUser = StoreConfigModel.getCurrentUserModel(cb); // returns immediately if no currentUser

        if (currentUser) {
            var oauthVendUtil = require('./../../common/utils/vend')({
                'GlobalConfigModel': StoreConfigModel.app.models.GlobalConfigModel,
                'StoreConfigModel': StoreConfigModel,
                'currentUser': currentUser
            });
            // TODO: use it for something real!
            oauthVendUtil.getVendTaxes(id)
                .then(function (taxes) {
                        cb(null, taxes);
                    },
                    function (error) {
                        cb(error);
                    });
        }
    };

    StoreConfigModel.remoteMethod('getVendPaymentTypes', {
        accepts: [
            {arg: 'id', type: 'string', required: true}
        ],
        http: {path: '/:id/vend/payment_types', verb: 'get'},
        returns: {arg: 'payment_types', type: 'array', root: true}
    });
    StoreConfigModel.getVendPaymentTypes = function (id, cb) {
        var currentUser = StoreConfigModel.getCurrentUserModel(cb); // returns immediately if no currentUser

        if (currentUser) {
            var oauthVendUtil = require('./../../common/utils/vend')({
                'GlobalConfigModel': StoreConfigModel.app.models.GlobalConfigModel,
                'StoreConfigModel': StoreConfigModel,
                'currentUser': currentUser
            });
            // TODO: use it for something real!
            oauthVendUtil.getVendPaymentTypes(id)
                .then(function (paymentTypes) {
                        cb(null, paymentTypes);
                    },
                    function (error) {
                        cb(error);
                    });
        }
    };

    StoreConfigModel.remoteMethod('getVendAccessToken', {
        accepts: [
            {arg: 'code', type: 'string', required: true},
            {arg: 'domain_prefix', type: 'string', required: true},
            {arg: 'state', type: 'string', required: true}
        ],
        http: {path: '/token/vend', verb: 'get'},
        returns: {arg: 'redirectUrl', type: 'string'}
    });
    StoreConfigModel.getVendAccessToken = function (code, domainPrefix, state, cb) {
        var currentUser = StoreConfigModel.getCurrentUserModel(cb); // returns immediately if no currentUser

        var oauthVendUtil = require('./../../common/utils/vend')({
            'StoreConfigModel': StoreConfigModel,
            'currentUser': currentUser
        });
        // console.log('inside getVendAccessToken(), args:' +
        //   '\n code: ' + code +
        //   '\n domainPrefix' + domainPrefix +
        //   '\n state ' + state + // user's authN session token
        //   //'\n baseUrl ' + StoreConfigModel.app.get('site').baseUrl +
        //   '\n restApiRoot ' + StoreConfigModel.app.get('restApiRoot') +
        //   '\n vend ' + StoreConfigModel.app.get('vend'));
        logger.debug({
            log: {
                message: 'inside getVendAccessToken()',
                code: code,
                domainPrefix: domainPrefix,
                state: state,
                baseUrl: StoreConfigModel.app.get('site').baseUrl,
                restApiRoot: StoreConfigModel.app.get('restApiRoot'),
                vend: StoreConfigModel.app.get('vend')
            }
        });
        // NOTE: You can get a reference to the app INSIDE remote methods, remote hooks,
        //       and model hooks because those are triggered after the application finishes loading.
        //       http://docs.strongloop.com/display/public/LB/Working+with+LoopBack+objects#WorkingwithLoopBackobjects-Fromamodelscript

        oauthVendUtil.token(
            code, domainPrefix, state,
            //StoreConfigModel.app.get('site').baseUrl,
            StoreConfigModel.app.get('restApiRoot'),
            StoreConfigModel.app.get('vend')
        )
            .then(function (redirectUrl) {
                    //console.log('redirectUrl: ' + redirectUrl);
                    logger.debug({log: {message: `redirectUrl ${redirectUrl}`}});
                    cb(null, redirectUrl);
                },
                function (error) {
                    cb(error);
                });
    };

    StoreConfigModel.afterRemote('getVendAccessToken', function (ctx, remoteMethodResponse, next) {
        //console.log('inside afterRemote:getVendAccessToken');
        logger.debug({log: {message: 'inside afterRemote:getVendAccessToken'}});
        //console.log('ctx.result.redirectUrl: ' + ctx.result.redirectUrl);
        logger.debug({
            log: {
                message: `ctx.result.redirectUrl: ${ctx.result.redirectUrl}`
            }
        });
        //console.log('remoteMethodResponse.redirectUrl: ' + remoteMethodResponse.redirectUrl);
        logger.debug({
            log: {
                message: `remoteMethodResponse.redirectUrl ${remoteMethodResponse.redirectUrl}`
            }
        });
        ctx.res.redirect(301, remoteMethodResponse.redirectUrl);
    });

    StoreConfigModel.remoteMethod('updateBinLocation', {
        accepts: [
            {arg: 'id', type: 'string', required: true},
            {arg: 'productId', type: 'string', required: true},
            {arg: 'binLocation', type: 'string', required: true}
        ],
        http: {path: '/:id/updateBinLocation', verb: 'post'},
        returns: {arg: 'product', type: 'object'}
    });
    /**
     * @description Updates bin location of a product
     * @param id
     * @param productId
     * @param binLocation
     * @return {Promise.<TResult>}
     */
    StoreConfigModel.updateBinLocation = function (id, productId, binLocation) {
        // log('updateBinLocation').debug('Received \nid: ', id, '\n ProductId: ', productId, '\nBinLocation: ', binLocation);
        logger.tag('updateBinLocation').debug({
            log: {
                message: 'Received params',
                id: id,
                productId: productId,
                binLocation: binLocation
            }
        });
        return StoreConfigModel.app.models.ProductModel.updateBinLocation(id, productId, binLocation)
            .then(function (response) {
                // log('updateBinLocation').debug('Updated bin location successfully');
                logger.tag('updateBinLocation').debug({
                    log: {message: 'Updated bin location successfully'}
                });
                return Promise.resolve(response);
            })
            .catch(function (error) {
                // log('updateBinLocation').error('Bin location update failed', error);
                logger.tag('updateBinLocation').error({
                    error: error
                });
                return Promise.reject(error);
            });
    };

    StoreConfigModel.remoteMethod('initiateSync', {
        accepts: [
            {arg: 'id', type: 'string', required: true},
            {arg: 'names', type: 'array', required: true}
        ],
        http: {path: '/:id/sync', verb: 'get'}
    });
    StoreConfigModel.initiateSync = function (id, names, cb) {
        // log('initiateSync').debug('Called initiate sync api, will call the corresponding method');
        logger.tag('initiateSync').debug({
            log: {
                message: 'Called initiate sync api, will call the corresponding method'
            }
        });
        return StoreConfigModel.app.models.SyncModel.initiateSync(id, names, cb)
            .then(function (response) {
                // log('initiateSync').debug('Initiate sync successful');
                logger.tag('initiateSync').debug({
                    log: {message: 'Initiate sync successful'}
                });
                return Promise.resolve();
            })
            .catch(function (error) {
                // log('initiateSync').error('ERROR', error);
                logger.tag('initiateSync').error({
                    error: error
                });
                return Promise.reject(error);
            });
    };

    StoreConfigModel.remoteMethod('getStuckOrders', {
        accepts: [
            {arg: 'id', type: 'string', required: true},
            {arg: 'limit', type: 'number'},
            {arg: 'skip', type: 'number'}
        ],
        http: {path: '/:id/getStuckOrders', verb: 'get'},
        returns: {arg: 'stuckOrders', type: 'object', root: true}
    });

    StoreConfigModel.getStuckOrders = function (id, limit, skip, cb) {
        logger.tag('getStuckOrders').debug({
            log: {
                message: 'Will route to ReportModel.getStuckOrders()'
            }
        });
        StoreConfigModel.app.models.ReportModel.getStuckOrders(id, limit, skip)
            .then(function (orders) {
                cb(null, orders);
            })
            .catch(function (error) {
                cb(error);
            });
    };

    StoreConfigModel.remoteMethod('getWorkerSettings', {
        accepts: [
            {arg: 'id', type: 'string', required: true}
        ],
        http: {path: '/:id/getWorkerSettings', verb: 'get'},
        returns: {arg: 'usesWorkersV2', type: 'object', root: true}
    });

    /**
     * @description Returns worker settings for orders
     * @param id
     * @param cb
     */
    StoreConfigModel.getWorkerSettings = function (id, cb) {
        logger.tag('getWorkerSettings').debug({
            log: {
                message: 'Will fetch worker settings for storeConfigModelId',
                storeConfigModelId: id
            }
        });
        StoreConfigModel.findById(id)
            .then(function (response) {
                logger.tag('getWorkerSettings').debug({
                    log: {
                        message: 'Found these worker settings',
                        workerSettings: response.usesWorkersV2
                    }
                });
                cb(null, response.usesWorkersV2);
            })
            .catch(function (error) {
                logger.tag('getWorkerSettings').error({
                    error: error
                });
                cb(error);
            });
    };

    StoreConfigModel.remoteMethod('updateWorkerSettings', {
        accepts: [
            {arg: 'id', type: 'string', required: true},
            {arg: 'workerName', type: 'string', required: true}
        ],
        http: {path: '/:id/updateWorkerSettings', verb: 'post'},
        returns: {arg: 'status', type: 'boolean', root: true}
    });
    /**
     * @description Updates worker settings for a particular worker
     * @param id
     * @param workerName
     * @param cb
     */
    StoreConfigModel.updateWorkerSettings = function (id, workerName, cb) {
        logger.tag('updateWorkerSettings').debug({
            log: {
                message: 'Will update worker settings for following storeConfigModelId and worker',
                storeConfigModelId: id,
                workerName: workerName
            }
        });
        StoreConfigModel.findById(id)
            .then(function (response) {
                logger.tag('updateWorkerSettings').debug({
                    log: {
                        message: 'Found this store config model',
                        storeConfigModel: response
                    }
                });
                response.usesWorkersV2[workerName] = !response.usesWorkersV2[workerName];
                return response.save();
            })
            .then(function (response) {
                logger.tag('updateWorkerSettings').debug({
                    log: {
                        message: 'Toggled the worker status'
                    }
                });
                cb(null, response);
            })
            .catch(function (error) {
                logger.tag('updateWorkerSettings').error({
                    error: error
                });
                cb(error);
            });
    };

    StoreConfigModel.remoteMethod('removeStuckOrders', {
        accepts: [
            {arg: 'id', type: 'string', required: true},
            {arg: 'stuckOrders', type: 'array', required: true}
        ],
        http: {path: '/:id/removeStuckOrders', verb: 'post'},
        returns: {arg: 'removed', type: 'object', root: true}
    });
    StoreConfigModel.removeStuckOrders = function (id, stuckOrders, cb) {
        logger.tag('removeStuckOrders').debug({
            log: {
                message: 'Will route to ReportModel.removeStuckOrders()'
            }
        });
        StoreConfigModel.app.models.ReportModel.removeStuckOrders(id, stuckOrders)
            .then(function (removed) {
                cb(null, removed);
            })
            .catch(function (error) {
                cb(error);
            });
    };

};
