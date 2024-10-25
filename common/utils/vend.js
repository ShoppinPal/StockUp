'use strict';
var OrgModel = null;
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var _ = require('underscore')
    , q = require('q')
    , Promise = require('bluebird')// TODO: stick to one promise library: Q or bluebird
    , vendSdk = require('vend-nodejs-sdk')({});

const logger = require('sp-json-logger')({fileName: 'common:utils:' + fileName});

var fetchVendToken = function (orgModelId, options) {
    logger.debug({
        message: 'Will refresh Vend token',
        options,
        functionName: 'fetchVendToken'
    });
    var orgModelInstance = null, token = null;
    return OrgModel.findById(orgModelId, {
        include: 'integrationModels'
    })
        .catch(function (error) {
            logger.error({
                message: 'Could not find orgModel',
                options,
                error,
                functionName: 'fetchVendToken'
            });
            return Promise.reject('Could not find orgModel');
        })
        .then(function (response) {
            orgModelInstance = response;
            logger.debug({
                message: 'Found this orgModel',
                orgModelInstance,
                options,
                functionName: 'fetchVendToken'
            });
            if (orgModelInstance.integrationModels().length) {
                if (orgModelInstance.integrationModels()[0].expires<(Date.now() / 1000)) {
                    logger.debug({
                        message: 'Token expired, will refresh',
                        tokenExpiredOn: orgModelInstance.integrationModels()[0].expires,
                        functionName: 'fetchVendToken',
                        options
                    });
                    let vendConfig = OrgModel.app.get('integrations').vend;
                    let tokenService = 'https://' + orgModelInstance.integrationModels()[0].domain_prefix + vendConfig.token_service;
                    return vendSdk.refreshAccessToken(
                        tokenService,
                        vendConfig.client_id,
                        vendConfig.client_secret,
                        orgModelInstance.integrationModels()[0].refresh_token,
                        orgModelInstance.integrationModels()[0].domain_prefix
                    );
                }
                else {
                    logger.debug({
                        message: 'Token not expired, will return the existing token',
                        functionName: 'fetchVendToken',
                        options
                    });
                    return Promise.resolve('tokenNotExpired');
                }
            }
            else {
                logger.error({
                    message: 'Could not find any integrations for org',
                    options,
                    functionName: 'fetchVendToken'
                });
                return Promise.reject('Could not find any integrations for org');
            }
        })
        .catch(function (error) {
            logger.error({
                error,
                reason: error,
                message: 'Access token could not be refreshed',
                functionName: 'fetchVendToken',
                options
            });
            return Promise.reject('Access token could not be refreshed');
        })
        .then(function (res) {
            if(!res) {
                logger.error({
                    message: 'Received empty token from Vend',
                    functionName: 'fetchVendToken',
                    options
                });
                return Promise.reject('Received empty token from Vend');
            }
            if (res !== 'tokenNotExpired') {
                logger.debug({
                    message: 'Will save the new access token to db',
                    res,
                    functionName: 'fetchVendToken',
                    options
                });
                let updateResponse = {
                    access_token: res.access_token,
                    expires: res.expires,
                    expires_in: res.expires_in,
                    updatedAt: new Date()
                };
                if(res.refresh_token) {
                    updateResponse.refresh_token = res.refresh_token;
                }
                return OrgModel.app.models.IntegrationModel.updateAll({
                    orgModelId: orgModelId
                }, updateResponse);
            }
            else {
                return Promise.resolve('tokenNotExpired');
            }
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not update new access token to the db',
                error,
                functionName: 'fetchVendToken',
                options
            });
            return Promise.reject('Could not update new access token to the db');
        })
        .then(function (response) {
            if (response !== 'tokenNotExpired') {
                logger.debug({
                    message: 'Updated new token to db',
                    response,
                    functionName: 'fetchVendToken',
                    options
                });
                return Promise.resolve(token);
            }
            else {
                return orgModelInstance.integrationModels()[0].access_token;
            }
        });
};

var getVendConnectionInfo = function (orgModelId, options) {
    return fetchVendToken(orgModelId, options)
        .then(function () {
            return OrgModel.findById(orgModelId, {
                include: 'integrationModels'
            });
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch integration details of org',
                error,
                functionName: 'getVendConnectionInfo',
                options
            });
            return Promise.reject('Could not fetch integration details of org');
        })
        .then(function (orgModelInstance) {
            logger.debug({
                message: 'Found integration details, will return connectionInfo',
                orgModelInstance,
                functionName: 'getVendConnectionInfo',
                options
            });
            var vendConfig = OrgModel.app.get('integrations').vend;
            var connectionInfo = {
                domainPrefix: orgModelInstance.integrationModels()[0].domain_prefix,
                client_id: vendConfig.client_id,
                client_secret: vendConfig.client_secret,
                accessToken: orgModelInstance.integrationModels()[0].access_token
            };
            return Promise.resolve(connectionInfo);
        });
};

var getVendOutlets = function (orgModelId, options) {
    logger.debug({
        message: 'Will fetch all vend outlets',
        functionName: 'getVendOutlets',
        options,
    });
    var token = null;

    return getVendConnectionInfo(orgModelId, options)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch integration details of org',
                error,
                functionName: 'getVendOutlets',
                options
            });
            return Promise.reject('Could not fetch integration details of org');
        })
        .then(function (connectionInfo) {
            logger.debug({
                message: 'Found connection info, will fetch vend outlets',
                functionName: 'getVendOutlets',
                options
            });
            var argsForOutlets = vendSdk.args.outlets.fetch();
            return vendSdk.outlets.fetchAll(argsForOutlets, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch vend outlets',
                errMessage: error,
                functionName: 'getVendOutlets',
                options
            });
            return Promise.reject('Could not fetch vend outlets');
        })
        .then(function (outlets) {
            logger.debug({
                message: 'Vend outlets retrieved',
                outlets: outlets,
                functionName: 'getVendOutlets',
                options
            });
            return Promise.resolve(outlets);
        });
};

var getVendProductTypes = function (orgModelId, options,versionsAfter) {
    logger.debug({
        message: 'Will fetch all product types',
        functionName: 'getVendProductTypes',
        options,
    });
    var token = null;
    return getVendConnectionInfo(orgModelId, options)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch integration details of org',
                error,
                functionName: 'getVendProductTypes',
                options
            });
            return Promise.reject('Could not fetch integration details of org');
        })
        .then(function (connectionInfo) {
            logger.debug({
                message: 'Found connection info, will fetch vend product types',
                functionName: 'getVendProductTypes',
                options
            });
            var argsForProductTypes = vendSdk.args.productTypes.fetch();
            //change args to fetch all product types at once
            argsForProductTypes.after = versionsAfter;
            argsForProductTypes.pageSize = 1000;
            return vendSdk.productTypes.fetch(argsForProductTypes, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch vend product types',
                errMessage: error,
                functionName: 'getVendProductTypes',
                options
            });
            return Promise.reject('Could not fetch vend outlets');
        });
};

var getVendUsers = function (orgModelId, options) {
    logger.debug({
        message: 'Will fetch all vend users',
        functionName: 'getVendUsers',
        options,
    });
    var token = null;

    return getVendConnectionInfo(orgModelId, options)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch integration details of org',
                error,
                functionName: 'getVendUsers',
                options
            });
            return Promise.reject('Could not fetch integration details of org');
        })
        .then(function (connectionInfo) {
            logger.debug({
                message: 'Found connection info, will fetch vend users',
                functionName: 'getVendUsers',
                connectionInfo: connectionInfo.domainPrefix,
                options
            });
            var argsForUsers = vendSdk.args.users.fetchAll();
            return vendSdk.users.fetchAll(argsForUsers, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch vend users',
                errMessage: error,
                error,
                functionName: 'getVendUsers',
                options
            });
            return Promise.reject('Could not fetch vend users');
        })
        .then(function (users) {
            logger.debug({
                message: 'Vend users retrieved',
                users: users,
                functionName: 'getVendUsers',
                options
            });
            return Promise.resolve(users);
        });
};

var getVendSuppliers = function (orgModelId, options) {
    logger.debug({
        message: 'Will fetch all vend suppliers',
        functionName: 'getVendSuppliers',
        options,
    });
    var token = null;
    return getVendConnectionInfo(orgModelId, options)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch integration details of org',
                error,
                functionName: 'getVendUsers',
                options
            });
            return Promise.reject('Could not fetch integration details of org');
        })
        .then(function (connectionInfo) {
            logger.debug({
                message: 'Found connection info, will fetch vend users',
                functionName: 'getVendUsers',
                connectionInfo: connectionInfo.domainPrefix,
                options
            });
            var argsForSuppliers = vendSdk.args.suppliers.fetch();
            return vendSdk.suppliers.fetchAll(argsForSuppliers, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch vend suppliers',
                errMessage: error,
                functionName: 'getVendSuppliers',
                options
            });
            return Promise.reject('Could not fetch vend suppliers');
        })
        .then(function (suppliers) {
            logger.debug({
                message: 'Vend suppliers retrieved',
                suppliers: suppliers,
                functionName: 'getVendSuppliers',
                options
            });
            return Promise.resolve(suppliers);
        });
};


var setDesiredStockLevelForVend = function (orgModelId, outletId, productId, desiredStockLevel, options) {
    logger.debug({
        message: 'Set desired stock level',
        orgModelId,
        options,
        productId,
        outletId,
        desiredStockLevel,
        functionName: 'setDesiredStockLevelForVend'
    });
    return getVendConnectionInfo(orgModelId, options)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch integration details of org',
                error,
                functionName: 'setDesiredStockLevelForVend',
                options
            });
            return Promise.reject('Could not fetch integration details of org');
        })
        .then(function (connectionInfo) {
            logger.debug({
                message: 'Fetched connection info, will update product',
                options,
                functionName: 'setDesiredStockLevelForVend'
            });
            var product = {
                id: productId //'3aab7379-15a2-11e3-a415-bc764e10976c'
            };
            var updateData = {
                details: {
                    inventory: [
                        {
                            'outlet_id': outletId, //'aea67e1a-b85c-11e2-a415-bc764e10976c',
                            'reorder_point': desiredStockLevel
                        }
                    ]
                }
            };
            return vendSdk.products.update({apiId: {value: product.id}, body: {value: updateData}}, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not update product desired stock level',
                error,
                reason: error,
                functionName: 'setDesiredStockLevelForVend'
            });
            return Promise.reject('Could not update product desired stock level')
        })
        .then(function (response) {
            /*var miniProduct = response.product;
             if (miniProduct) {
             miniProduct = {
             id: response.product.id,
             handle: response.product.handle,
             name: response.product.name,
             sku: response.product.sku,
             inventory: _.find(response.product.inventory || [], function (inv) {
             return inv.outlet_id == outletId;
             }),
             updated_at: response.product.updated_at
             };
             }
             logger.debug({log: {message: 'Vend product updated.', miniProduct: miniProduct}});
             return q(response.product);
             },
             function (error) {
             //log.error('Error getting Vend product:\n' + JSON.stringify(error));
             logger.error({err: error, message: 'Error getting Vend product'});
             return q.reject('An error occurred while getting vend product.\n' + JSON.stringify(error));*/
            logger.debug({
                message: 'Updated vend product desired stock level successfully',
                response,
                functionName: 'setDesiredStockLevelForVend',
                options
            });
            return Promise.resolve('Updated vend product desired stock level successfully');
        });
};

var createStockOrderForVend = function (storeModelInstance, reportModelInstance, supplierModelInstance, options) {
    var orgModelId = storeModelInstance.orgModelId;
    var reportName = reportModelInstance.name;
    var outletId = storeModelInstance.storeNumber;
    logger.debug({
        message: 'Will create stock order in vend',
        reportModelInstance,
        options,
        functionName: 'createStockOrderForVend'
    });
    return getVendConnectionInfo(orgModelId, options)
        .then(function (connectionInfo) {
            var argsForStockOrder = vendSdk.args.consignments.stockOrders.create();
            argsForStockOrder.name.value = reportName;
            argsForStockOrder.outletId.value = outletId;
            argsForStockOrder.supplierId.value = supplierModelInstance ? supplierModelInstance.api_id : null;
            logger.debug({
                message: 'Fetched connection info for vend, will create order in vend',
                options,
                argsForStockOrder,
                connectionInfo: connectionInfo.domainPrefix,
                functionName: 'createStockOrderForVend'
            });
            return vendSdk.consignments.stockOrders.create(argsForStockOrder, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                reason: error,
                error,
                message: 'Error creating stock order in Vend',
                options,
                functionName: 'createStockOrderForVend'
            });
            return Promise.reject('An error occurred while creating a stock order in Vend.\n' + JSON.stringify(error));
        })
        .then(function (newStockOrder) {
            logger.debug({
                message: 'Created stock order in vend',
                newStockOrder: newStockOrder,
                options,
                functionName: 'createStockOrderForVend'
            });
            return Promise.resolve(newStockOrder);
        });
};

var deleteStockOrder = function (orgModelId, vendConsignmentId, options) {
    return getVendConnectionInfo(orgModelId, options)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch integration details of org',
                error,
                functionName: 'deleteStockOrder',
                options
            });
            return Promise.reject('Could not fetch integration details of org');
        })
        .then(function (connectionInfo) {
            logger.debug({
                message: 'Found connection info, will delete order from Vend',
                vendConsignmentId,
                functionName: 'deleteStockOrder',
                options
            });
            var argsForStockOrder = vendSdk.args.consignments.stockOrders.remove();
            argsForStockOrder.apiId.value = vendConsignmentId;
            return vendSdk.consignments.stockOrders.remove(argsForStockOrder, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                message: 'Error deleting consignment order in Vend',
                error,
                reason: error,
                options,
                functionName: 'deleteStockOrder'
            });
            return Promise.reject('Error deleting consignment order in Vend');
        });
};

var createStockOrderLineitemForVend = function (storeModelInstance, reportModelInstance, productModel,stockOrderLineitemModelInstance, options) {
    if (stockOrderLineitemModelInstance.vendConsignmentProductId) {
        //log.error('WARN: You are about to create a new vendConsignmentProduct even though one already exists!');
        logger.warn({log: {message: 'You are about to create a new vendConsignmentProduct even though one already exists!'}});
        return Promise.reject('WARN: You are about to create a new vendConsignmentProduct even though one already exists!');
    }
    logger.tag('createStockOrderLineitemForVend()').debug({
        log: {
            message: 'createStockOrderLineitemForVend()',
        }
    });
    return getVendConnectionInfo(storeModelInstance.orgModelId, options)
        .then(function (connectionInfo) {
            var consignmentProduct = {
                //'sequence_number': 1,
                'consignment_id': reportModelInstance.vendConsignmentId,
                'product_id': productModel.api_id,
                'count': stockOrderLineitemModelInstance.orderQuantity,
                'cost': stockOrderLineitemModelInstance.supplyPrice,
                'received': stockOrderLineitemModelInstance.receivedQuantity
            };
            //log.debug('createStockOrderLineitemForVend()', 'consignmentProduct: ', consignmentProduct);
            logger.tag('createStockOrderLineitemForVend()').debug({
                log: {
                    message: 'createStockOrderLineitemForVend',
                    consignmentProduct: consignmentProduct
                }
            });
            return vendSdk.consignments.products.create({body: consignmentProduct}, connectionInfo)
                .then(function (newLineitem) {
                    //log.debug('newLineitem', newLineitem);
                    logger.tag('newLineItem').debug({log: {newLineitem: newLineitem}});
                    return Promise.resolve(newLineitem);
                });
        })
        .catch(function (error) {
            if (error instanceof Error) {
                // log.error('createStockOrderLineitemForVend()',
                //   'Error creating a stock order lineitem in Vend:',
                //   '\n', error.name + ':', error.message,
                //   '\n', error.stack);
                logger.error({err: error, message: 'Error creating a stock order lineitem in Vend'});
            }
            else {
                //log.error('createStockOrderLineitemForVend()', 'Error creating a stock order lineitem in Vend:\n' + JSON.stringify(error));
                logger.tag('createStockOrderLineitemForVend').error({
                    err: error,
                    message: 'Error creating a stock order lineitem in Vend'
                });
            }
            return Promise.reject('An error occurred while creating a stock order lineitem in Vend.\n' + JSON.stringify(error));
        });
};

module.exports = function (dependencies) {
    if (dependencies) {
        OrgModel = dependencies.OrgModel;
    }

    return {
        getVendOutlets: getVendOutlets,
        getVendUsers: getVendUsers,
        getVendProductTypes: getVendProductTypes,
        setDesiredStockLevelForVend: setDesiredStockLevelForVend,
        createStockOrderForVend: createStockOrderForVend,
        deleteStockOrder: deleteStockOrder,
        createStockOrderLineitemForVend: createStockOrderLineitemForVend
    };
};
