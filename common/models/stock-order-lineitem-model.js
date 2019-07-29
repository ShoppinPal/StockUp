'use strict';
var Promise = require('bluebird');
var _ = require('underscore');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var logger = require('./../lib/debug-extension')('common:models:' + fileName);
var log = logger.debug.bind(logger); // TODO: over time, please use log.LOGLEVEL(msg) explicitly
var logger = require('sp-json-logger')();

module.exports = function (StockOrderLineitemModel) {

    // https://github.com/strongloop/loopback/issues/418
    // once a model is attached to the data source
    StockOrderLineitemModel.on('dataSourceAttached', function (obj) {
        // wrap the whole model in Promise
        // but we need to avoid 'validate' method
        StockOrderLineitemModel = Promise.promisifyAll(
            StockOrderLineitemModel,
            {
                filter: function (name, func, target) {
                    return !( name == 'validate');
                }
            }
        );
    });

    StockOrderLineitemModel.scanBarcodeStockOrder = function (scanType, productSku, orgModelId, reportModelId, force, options) {
        logger.debug({
            functionName: 'scanBarcodeStockOrder',
            message: 'Will find Stock Order line item and increment quantity',
            scanType,
            productSku,
            orgModelId,
            reportModelId,
            force,
            options
        });
        return StockOrderLineitemModel.app.models.ProductModel.findOne({
            where: {
                orgModelId,
                sku: productSku
            }
        })
            .catch(function (error) {
                logger.error({
                    error,
                    functionName: 'scanBarcodeStockOrder',
                    message: 'Error Running query for product search',
                    scanType,
                    productSku,
                    orgModelId,
                    reportModelId,
                    force,
                    options
                });
            }).then(function (productModel) {
                logger.debug({
                    functionName: 'scanBarcodeStockOrder',
                    message: 'Found Product Model Instance assocated with the sku',
                    productModel,
                    scanType,
                    productSku,
                    orgModelId,
                    reportModelId,
                    force,
                    options
                });
                if (productModel) {
                    const filter = {
                        where: {
                            orgModelId,
                            reportModelId,
                            approved: true,
                            productModelId: productModel.id
                        }
                    };
                    if (scanType === 'receive') {
                        filter.where.fulfilled = true;
                    }
                    logger.debug({
                        functionName: 'scanBarcodeStockOrder',
                        message: 'Found Product Model Instance Will Find a Stock Order Item with Product Id',
                        productModel,
                        filter,
                        scanType,
                        productSku,
                        orgModelId,
                        reportModelId,
                        force,
                        options
                    });
                    return StockOrderLineitemModel.findOne(filter);
                }else {
                    logger.debug({
                        functionName: 'scanBarcodeStockOrder',
                        message: 'No Product Found Associated with the entered SKU, Will Exit',
                        productModel,
                        scanType,
                        productSku,
                        orgModelId,
                        reportModelId,
                        force,
                        options
                    });
                    return Promise.reject('No Product found matching the SKU');
                }
            })
            .then(function (orderLineItem) {
                logger.debug({
                    functionName: 'scanBarcodeStockOrder',
                    message: 'Found Stock Order Line Item Query Result',
                    orderLineItem,
                    scanType,
                    productSku,
                    orgModelId,
                    reportModelId,
                    force,
                    options
                });
                if (!orderLineItem) {
                    logger.debug({
                        functionName: 'scanBarcodeStockOrder',
                        message: 'Stock Order line item not found, Will Exit',
                        orderLineItem,
                        scanType,
                        productSku,
                        orgModelId,
                        reportModelId,
                        force,
                        options
                    });
                    return Promise.reject('No Such Stock Order Item Exists');
                }
                // If Ordered quantity is equal to fulfilled then show Alert on client side And do not check if forced
                if (!force) {
                    if (
                        (scanType === 'fulfill' && orderLineItem.fulfilledQuantity === orderLineItem.orderQuantity) ||
                        (scanType === 'receive' && orderLineItem.receivedQuantity === orderLineItem.fulfilledQuantity)
                    ) {
                        logger.debug({
                            functionName: 'scanBarcodeStockOrder',
                            message: 'Quantity is already fulfilled/received, sending discrepency = true',
                            orderLineItem,
                            reportModelId,
                            force,
                            options
                        });
                        return Promise.all([Promise.resolve({showDiscrepancyAlert: true}), Promise.resolve(orderLineItem.id)]);
                    }
                }else {
                    logger.debug({
                        functionName: 'scanBarcodeStockOrder',
                        message: 'Force "true" received will increment forcefully',
                        orderLineItem,
                        reportModelId,
                        force,
                        options
                    });
                }

                //Prepare update Object based on scanType
                let updateSetObject = {};
                if (scanType === 'fulfill') {
                    updateSetObject = {
                        $inc: {   // Increment Extended Operator
                            fulfilledQuantity: 1
                        }
                    };
                }else if (scanType === 'receive') {
                    updateSetObject = {
                        $inc: {
                            receivedQuantity: 1
                        }
                    };
                }else {
                    logger.debug({
                        functionName: 'scanBarcodeStockOrder',
                        message: 'UnKnown ScanType Encountered',
                        orderLineItem,
                        reportModelId,
                        force,
                        options
                    });
                    return Promise.reject("ScanType not allowed");
                }

                // Set fulfilled true when fulfilled quantity will be equal to ordered Quantity
                // TODO: try to add it to query itself
                if (scanType === 'fulfill' && orderLineItem.fulfilledQuantity + 1>=orderLineItem.orderQuantity) {
                    updateSetObject = Object.assign({}, updateSetObject, {$set: {fulfilled: true}});
                }else if (scanType === 'receive' && orderLineItem.receivedQuantity + 1 === orderLineItem.fulfilledQuantity) {
                    updateSetObject = Object.assign({}, updateSetObject, {$set: {received: true}});
                }
                logger.debug({
                    functionName: 'scanBarcodeStockOrder',
                    message: 'Updating line items with incremented quantity',
                    reportModelId,
                    force,
                    options
                });
                return Promise.all([
                    StockOrderLineitemModel.updateAll({
                            id: orderLineItem.id
                        },
                        updateSetObject,
                        // Allows use of increment operator
                        {allowExtendedOperators: true}),
                    Promise.resolve(orderLineItem.id)]);
            })
            .catch(function (error) {
                logger.error({
                    functionName: 'scanBarcodeStockOrder',
                    message: 'Error While Incrementing',
                    error
                });
                return Promise.reject(error);
            })

            .then(function ([obj, stockOrderLineItemId]) {
                logger.debug({
                    functionName: 'scanBarcodeStockOrder',
                    message: 'Finding updated lineitem',
                    stockOrderLineItemId,
                    reportModelId,
                    force,
                    options
                });
                return Promise.all([
                    obj,
                    StockOrderLineitemModel.findOne(
                        {
                            where: {
                                id: stockOrderLineItemId
                            },
                            include: 'productModel'
                        }
                    )]);
            })
            .catch(function (error) {
                logger.error({
                    functionName: 'scanBarcodeStockOrder',
                    message: 'Error While finding updated line item',
                    error,
                    options
                });
                return Promise.reject(error);
            })

            .then(function ([obj, stockLineItem]) {
                return Promise.resolve(Object.assign({}, obj, stockLineItem.toJSON()));
            });
    };
};


/*StockOrderLineitemModel.StockOrderLineitemModelStates = {
 'PENDING': 'pending',
 'ORDERED': 'complete',
 'BOXED': 'boxed',
 'UNBOXED': 'unboxed'
 };

 StockOrderLineitemModel.observe('before save', function updateTimestamp(ctx, next) {
 if (ctx.instance) {
 ctx.instance.updatedAt = new Date();
 } else {
 ctx.data.updatedAt = new Date();
 }
 next();
 });

 StockOrderLineitemModel.updateBasedOnState = function(id, attributes, cb) {
 var methodName = 'updateBasedOnState';
 //log(methodName, '> start');
 logger.debug({log: {message: `${methodName} > start` }});
 var currentUser = StockOrderLineitemModel.getCurrentUserModel(cb); // returns  immediately if no currentUser
 if(currentUser) {
 StockOrderLineitemModel.findById(id) // chain the promise via a return statement so unexpected rejections/errors float up
 .then(function(stockOrderLineitemModelInstance) {
 // log(methodName, '> findById > then', '\n',
 //   '> stockOrderLineitemModelInstance', stockOrderLineitemModelInstance);
 logger.debug({log: { message:`${methodName} > findById > then`, stockOrderLineitemModelInstance: stockOrderLineitemModelInstance }});

 // log(methodName, '> findById > then', '\n',
 //   '> extending StockOrderLineitemModel with attributes:', attributes);
 logger.debug({log: {message: `${methodName} > findById > then > extending StockOrderLineitemModel with attributes`, attributes: attributes }});
 _.extend(stockOrderLineitemModelInstance, attributes); // TODO: validate user-input?
 // log(methodName, '> findById > then', '\n',
 //   '> extended StockOrderLineitemModel:', stockOrderLineitemModelInstance);
 logger.debug({log: {message: `${methodName} > findById > then > extended StockOrderLineitemModel`, StockOrderLineitemModel: StockOrderLineitemModel }});

 var ReportModel = StockOrderLineitemModel.app.models.ReportModel;
 ReportModel.getAllRelevantModelInstancesForReportModel(stockOrderLineitemModelInstance.reportId)
 .spread(function(reportModelInstance, storeModelInstance/!*, storeConfigInstance*!/){
 var oauthVendUtil = require('./../../common/utils/vend')({
 'GlobalConfigModel': StockOrderLineitemModel.app.models.GlobalConfigModel,
 'StoreConfigModel': StockOrderLineitemModel.app.models.StoreConfigModel,
 'currentUser': currentUser
 });
 if (reportModelInstance.state === ReportModel.ReportModelStates.MANAGER_IN_PROCESS)
 {
 // log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS', '\n',
 //   '> work on consignment products in Vend');
 logger.debug({log: {message: `${methodName} > findById > then > spread > MANAGER_IN_PROCESS > work on consignment products in Vend` }});
 if(!stockOrderLineitemModelInstance.vendConsignmentProductId &&
 stockOrderLineitemModelInstance.state !== StockOrderLineitemModel.StockOrderLineitemModelStates.ORDERED){
 // log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > !ORDERED', '\n',
 //   '> will create a consignment product in Vend');
 logger.debug({log: {message: `${methodName} > findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > will create a consignment product in Vend` }});
 oauthVendUtil.createStockOrderLineitemForVend(storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance)
 .then(function(newConsignmentProduct){
 // log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then', '\n',
 //   '> created a consignment product in Vend');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then > created a consignment product in Vend`
 }});
 // log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then', '\n',
 //   '> newConsignmentProduct', newConsignmentProduct);
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then > newConsignmentProduct`,
 newConsignmentProduct: newConsignmentProduct
 }});
 stockOrderLineitemModelInstance.vendConsignmentProductId = newConsignmentProduct.id;
 stockOrderLineitemModelInstance.vendConsignmentProduct = newConsignmentProduct;
 if(!attributes.state || attributes.state !== StockOrderLineitemModel.StockOrderLineitemModelStates.PENDING) {
 // log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then', '\n',
 //   '> since client did not specifically ask for the row to be left in PENDING state ... change its status to the next one');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then
 > since client did not specifically ask for the row to be left in PENDING state ... change its status to the next one`
 }});
 stockOrderLineitemModelInstance.state = StockOrderLineitemModel.StockOrderLineitemModelStates.ORDERED;
 }
 else {
 // log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then', '\n',
 //   '> client specifically asked for the row to be left in PENDING state');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then
 > client specifically asked for the row to be left in PENDING state`
 }});
 }
 stockOrderLineitemModelInstance.save()
 .then(function(updatedStockOrderLineitemModelInstance){
 // log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then > save > then', '\n',
 //   '> updated the lineitem model');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then > save > then
 > updated the lineitem model`
 }})
 cb(null, updatedStockOrderLineitemModelInstance);
 });
 },
 function(error){
 cb(error);
 });
 }
 else { // is already in StockOrderLineitemModel.StockOrderLineitemModelStates.ORDERED state
 // log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > ORDERED', '\n',
 //   '> will update the consignment product in Vend');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_IN_PROCESS > ORDERED > will update the consignment product in Vend`
 }});
 oauthVendUtil.updateStockOrderLineitemForVend(storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance)
 .then(function(updatedConsignmentProduct){
 // log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then', '\n',
 //   '> updated the consignment product in Vend');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then
 > updated the consignment product in Vend`
 }});
 // log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then', '\n',
 //   '> updatedConsignmentProduct', updatedConsignmentProduct);
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then
 > updatedConsignmentProduct`,
 updatedConsignmentProduct: updatedConsignmentProduct
 }})
 stockOrderLineitemModelInstance.vendConsignmentProduct = updatedConsignmentProduct;
 if(!attributes.state || attributes.state !== StockOrderLineitemModel.StockOrderLineitemModelStates.PENDING) {
 // log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then', '\n',
 //   '> since client did not specifically ask for the row to be left in PENDING state ... change its status to the next one');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then
 > since client did not specifically ask for the row to be left in PENDING state ... change its status to the next one`
 }});
 stockOrderLineitemModelInstance.state = StockOrderLineitemModel.StockOrderLineitemModelStates.ORDERED;
 }
 else {
 // log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then', '\n',
 //   '> client specifically asked for the row to be left in PENDING state');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then
 > client specifically asked for the row to be left in PENDING state`
 }})
 }
 stockOrderLineitemModelInstance.save()
 .then(function(updatedStockOrderLineitemModelInstance){
 // log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then > save > then', '\n',
 //   '> updated the lineitem model');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then > save > then
 > updated the lineitem model`
 }})
 cb(null, updatedStockOrderLineitemModelInstance);
 });
 },
 function(error){
 cb(error);
 });
 }
 }
 else if (reportModelInstance.state === StockOrderLineitemModel.app.models.ReportModel.ReportModelStates.MANAGER_RECEIVE)
 {
 if (!stockOrderLineitemModelInstance.vendConsignmentProductId) {
 // log(methodName, '> findById > then > spread > MANAGER_RECEIVE', '\n',
 //   '> will create a consignment product in Vend');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_RECEIVE
 > will create a consignment product in Vend`
 }})
 oauthVendUtil.createStockOrderLineitemForVend(storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance)
 .then(function(newConsignmentProduct){
 // log(methodName, '> findById > then > spread > MANAGER_RECEIVE > create > then', '\n',
 //   '> created a consignment product in Vend');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_RECEIVE > create > then
 > created a consignment product in Vend`
 }});
 // log(methodName, '> findById > then > spread > MANAGER_RECEIVE > create > then', '\n',
 //   '> newConsignmentProduct', newConsignmentProduct);
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_RECEIVE > create > then
 > newConsignmentProduct`,
 newConsignmentProduct: newConsignmentProduct
 }});
 stockOrderLineitemModelInstance.vendConsignmentProductId = newConsignmentProduct.id;
 stockOrderLineitemModelInstance.vendConsignmentProduct = newConsignmentProduct;
 // TODO: should it not be left up to client side to send this property via `attributes` ?
 //stockOrderLineitemModelInstance.state = StockOrderLineitemModel.StockOrderLineitemModelStates.UNBOXED;
 stockOrderLineitemModelInstance.save()
 .then(function(updatedStockOrderLineitemModelInstance){
 // log(methodName, '> findById > then > spread > MANAGER_RECEIVE > create > then > save > then', '\n',
 //   '> updated the lineitem model');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_RECEIVE > create > then > save > then
 > updated the lineitem model`
 }})
 cb(null, updatedStockOrderLineitemModelInstance);
 });
 },
 function(error){
 cb(error);
 });
 }
 else {
 // log(methodName, '> findById > then > spread > MANAGER_RECEIVE', '\n',
 //   '> will update the existing consignment product in Vend');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_RECEIVE
 > will update the existing consignment product in Vend`
 }});
 oauthVendUtil.updateStockOrderLineitemForVend(storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance)
 .then(function(updatedConsignmentProduct){
 // log(methodName, '> findById > then > spread > MANAGER_RECEIVE > update > then', '\n',
 //   '> updated the consignment product in Vend');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_RECEIVE > update > then
 > updated the consignment product in Vend`
 }});
 // log(methodName, '> findById > then > spread > MANAGER_RECEIVE > update > then', '\n',
 //   '> updatedConsignmentProduct', updatedConsignmentProduct);
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_RECEIVE > update > then
 > updatedConsignmentProduct`,
 updatedConsignmentProduct: updatedConsignmentProduct
 }});
 stockOrderLineitemModelInstance.vendConsignmentProduct = updatedConsignmentProduct;
 stockOrderLineitemModelInstance.save()
 .then(function(updatedStockOrderLineitemModelInstance){
 // log(methodName, '> findById > then > spread > MANAGER_RECEIVE > update > then > save > then', '\n',
 //   '> updated the lineitem model');
 logger.debug({log: {
 message: `${methodName} > findById > then > spread > MANAGER_RECEIVE > update > then > save > then
 > updated the lineitem model`
 }})
 cb(null, updatedStockOrderLineitemModelInstance);
 });
 },
 function(error){
 cb(error);
 });
 }
 }
 else {
 cb(null, {updated:false});
 }
 });
 },
 function(error){
 cb(error);
 });
 }
 };

 StockOrderLineitemModel.deleteLineitem = function(id, cb) {
 var methodName = 'deleteLineitem';
 //log('inside '+methodName+'()');
 logger.debug({log: {message: `inside ${methodName}()` }});
 var currentUser = StockOrderLineitemModel.getCurrentUserModel(cb); // returns immediately if no currentUser
 if(currentUser) {
 StockOrderLineitemModel.findById(id) // chain the promise via a return statement so unexpected rejections/errors float up
 .then(function(stockOrderLineitemModelInstance) {
 //log('inside '+methodName+'() - stockOrderLineitemModelInstance', stockOrderLineitemModelInstance);
 logger.debug({log: {
 message: `inside ${methodName}() - stockOrderLineitemModelInstance`,
 stockOrderLineitemModelInstance: stockOrderLineitemModelInstance
 }});
 var waitFor1;
 if (stockOrderLineitemModelInstance.vendConsignmentProductId) {
 var ReportModel = StockOrderLineitemModel.app.models.ReportModel;
 waitFor1 = ReportModel.getAllRelevantModelInstancesForReportModel(stockOrderLineitemModelInstance.reportId)
 .spread(function(reportModelInstance, storeModelInstance/!*, storeConfigInstance*!/){
 var oauthVendUtil = require('./../../common/utils/vend')({
 'GlobalConfigModel': StockOrderLineitemModel.app.models.GlobalConfigModel,
 'StoreConfigModel': StockOrderLineitemModel.app.models.StoreConfigModel,
 'currentUser': currentUser
 });
 if (reportModelInstance.state === ReportModel.ReportModelStates.MANAGER_IN_PROCESS)
 {
 //log('inside '+methodName+'() - will delete consignment product from Vend');
 logger.debug({log: {
 message: `inside ${methodName}() - will delete consignment product from Vend`
 }});
 return oauthVendUtil.deleteStockOrderLineitemForVend(storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance)
 .then(function(response){
 //log('response from vend:', response);
 logger.debug({log: {message: 'response from vend', response: response }});
 return Promise.resolve(); // NOTE: empty/undefined value indicates success to the next block in promise chain
 },
 function(error){
 //log('ERROR', error);
 logger.error({err: error});
 //console.error(error);
 return Promise.resolve({deleted:false});
 });
 }
 else {
 //log('inside '+methodName+'() - will not delete consignment product from Vend for current ReportModel state:', reportModelInstance.state);
 logger.debug({log: {
 message: `inside ${methodName}() - will not delete consignment product from Vend for current ReportModel state`,
 reportState: reportModelInstance.state
 }});
 return Promise.resolve({deleted:false});
 }
 });
 }
 else {
 //log('inside '+methodName+'() - no consignment product available in Vend for deletion');
 logger.debug({log: {
 message: `inside ${methodName}() - no consignment product available in Vend for deletion`
 }});
 waitFor1 = Promise.resolve({deleted:false});
 }
 waitFor1.then(function(result){
 if(result) {
 //log('inside '+methodName+'() - did not delete a consignment product from Vend');
 logger.debug({log: {
 message: `inside ${methodName}() - did not delete a consignment product from Vend`
 }});
 }
 else { // NOTE: empty/undefined value indicates success in this block of promise chain
 //log('inside ' + methodName + '() - deleted a consignment product from Vend');
 logger.debug({log: {
 message: `inside ${methodName}() - deleted a consignment product from Vend`
 }});
 }
 //log('inside '+methodName+'() - will delete the StockOrderLineitemModel');
 logger.debug({log: {
 message: `inside ${methodName}() - will delete the StockOrderLineitemModel`
 }});
 return stockOrderLineitemModelInstance.destroy()
 .then(function(){
 //log('inside '+methodName+'() - deleted the StockOrderLineitemModel');'
 logger.debug({log: {
 message: `inside ${methodName}() - deleted the StockOrderLineitemModel`
 }});
 cb(null, {deleted:true});
 });
 },
 function(error){
 cb(error);
 });
 });
 }
 };*/
