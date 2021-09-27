"use strict";
var Promise = require("bluebird");
var _ = require("underscore");

var path = require("path");
var fileName = path.basename(__filename, ".js"); // gives the filename without the .js extension
const logger = require("sp-json-logger")({
    fileName: "common:models:" + fileName,
});

module.exports = function (StockOrderLineitemModel) {
    // https://github.com/strongloop/loopback/issues/418
    // once a model is attached to the data source
    StockOrderLineitemModel.on("dataSourceAttached", function (obj) {
        // wrap the whole model in Promise
        // but we need to avoid 'validate' method
        StockOrderLineitemModel = Promise.promisifyAll(
            StockOrderLineitemModel,
            {
                filter: function (name, func, target) {
                    return !(name == "validate");
                },
            }
        );
    });

    StockOrderLineitemModel.scanBarcodeStockOrder = function (
        scanType,
        productSku,
        orgModelId,
        reportModelId,
        force,
        options
    ) {
        logger.debug({
            functionName: "scanBarcodeStockOrder",
            message: "Will find Stock Order line item and increment quantity",
            scanType,
            productSku,
            orgModelId,
            reportModelId,
            force,
            options,
        });
        // let searchPattern = new RegExp(productSku, 'i');
        // var pattern = new RegExp('.*'+productSku+'.*', "i"); /* case-insensitive RegExp search */
        // var filterData = pattern.toString();
        return StockOrderLineitemModel.app.models.ProductModel.findOne({
            where: {
                orgModelId,
                // sku: { "regexp": filterData }
                sku: productSku,
            },
        })
            .catch(function (error) {
                logger.error({
                    error,
                    functionName: "scanBarcodeStockOrder",
                    message: "Error Running query for product search",
                    scanType,
                    productSku,
                    orgModelId,
                    reportModelId,
                    force,
                    options,
                });
            })
            .then(function (productModel) {
                logger.debug({
                    functionName: "scanBarcodeStockOrder",
                    message:
                        "Found Product Model Instance assocated with the sku",
                    productModel,
                    scanType,
                    productSku,
                    orgModelId,
                    reportModelId,
                    force,
                    options,
                });
                if (productModel) {
                    const filter = {
                        where: {
                            orgModelId,
                            reportModelId,
                            approved: true,
                            productModelId: productModel.id,
                        },
                    };
                    if (scanType === "receive") {
                        delete filter.where.approved; // receivable item may or may not be approved
                        filter.where.fulfilled = true;
                    }
                    logger.debug({
                        functionName: "scanBarcodeStockOrder",
                        message:
                            "Found Product Model Instance Will Find a Stock Order Item with Product Id",
                        productModel,
                        filter,
                        scanType,
                        productSku,
                        orgModelId,
                        reportModelId,
                        force,
                        options,
                    });
                    return StockOrderLineitemModel.findOne(filter);
                } else {
                    logger.debug({
                        functionName: "scanBarcodeStockOrder",
                        message:
                            "No Product Found Associated with the entered SKU, Will Exit",
                        productModel,
                        scanType,
                        productSku,
                        orgModelId,
                        reportModelId,
                        force,
                        options,
                    });
                    return Promise.reject("No Product found matching the SKU");
                }
            })
            .then(function (orderLineItem) {
                logger.debug({
                    functionName: "scanBarcodeStockOrder",
                    message: "Found Stock Order Line Item Query Result",
                    orderLineItem,
                    scanType,
                    productSku,
                    orgModelId,
                    reportModelId,
                    force,
                    options,
                });
                if (!orderLineItem) {
                    logger.debug({
                        functionName: "scanBarcodeStockOrder",
                        message: "Stock Order line item not found, Will Exit",
                        orderLineItem,
                        scanType,
                        productSku,
                        orgModelId,
                        reportModelId,
                        force,
                        options,
                    });
                    return Promise.reject("No Such Stock Order Item Exists");
                }
                // If Ordered quantity is equal to fulfilled then show Alert on client side And do not check if forced
                if (!force) {
                    if (
                        (scanType === "fulfill" &&
                            orderLineItem.fulfilledQuantity ===
                            orderLineItem.orderQuantity) ||
                        (scanType === "receive" &&
                            orderLineItem.receivedQuantity ===
                            orderLineItem.fulfilledQuantity)
                    ) {
                        logger.debug({
                            functionName: "scanBarcodeStockOrder",
                            message:
                                "Quantity is already fulfilled/received, sending discrepency = true",
                            orderLineItem,
                            reportModelId,
                            force,
                            options,
                        });
                        return Promise.all([
                            Promise.resolve({ showDiscrepancyAlert: true }),
                            Promise.resolve(orderLineItem.id),
                        ]);
                    }
                } else {
                    logger.debug({
                        functionName: "scanBarcodeStockOrder",
                        message:
                            'Force "true" received will increment forcefully',
                        orderLineItem,
                        reportModelId,
                        force,
                        options,
                    });
                }

                //Prepare update Object based on scanType
                let updateSetObject = {};
                if (scanType === "fulfill") {
                    updateSetObject = {
                        $inc: {
                            // Increment Extended Operator
                            fulfilledQuantity: 1,
                        },
                    };
                } else if (scanType === "receive") {
                    updateSetObject = {
                        $inc: {
                            receivedQuantity: 1,
                        },
                    };
                } else {
                    logger.debug({
                        functionName: "scanBarcodeStockOrder",
                        message: "UnKnown ScanType Encountered",
                        orderLineItem,
                        reportModelId,
                        force,
                        options,
                    });
                    return Promise.reject("ScanType not allowed");
                }

                // Set fulfilled true when fulfilled quantity will be equal to ordered Quantity
                // TODO: try to add it to query itself
                if (
                    scanType === "fulfill" &&
                    orderLineItem.fulfilledQuantity + 1 >=
                    orderLineItem.orderQuantity
                ) {
                    updateSetObject = Object.assign({}, updateSetObject, {
                        $set: { fulfilled: true },
                    });
                } else if (
                    scanType === "receive" &&
                    orderLineItem.receivedQuantity + 1 ===
                    orderLineItem.fulfilledQuantity
                ) {
                    updateSetObject = Object.assign({}, updateSetObject, {
                        $set: { received: true },
                    });
                }
                logger.debug({
                    functionName: "scanBarcodeStockOrder",
                    message: "Updating line items with incremented quantity",
                    reportModelId,
                    force,
                    options,
                });
                return Promise.all([
                    StockOrderLineitemModel.updateAll(
                        {
                            id: orderLineItem.id,
                        },
                        updateSetObject,
                        // Allows use of increment operator
                        { allowExtendedOperators: true }
                    ),
                    Promise.resolve(orderLineItem.id),
                ]);
            })
            .catch(function (error) {
                logger.error({
                    functionName: "scanBarcodeStockOrder",
                    message: "Error While Incrementing",
                    error,
                });
                return Promise.reject(error);
            })

            .then(function ([obj, stockOrderLineItemId]) {
                logger.debug({
                    functionName: "scanBarcodeStockOrder",
                    message: "Finding updated lineitem",
                    stockOrderLineItemId,
                    reportModelId,
                    force,
                    options,
                });
                return Promise.all([
                    obj,
                    StockOrderLineitemModel.findOne({
                        where: {
                            id: stockOrderLineItemId,
                        },
                        include: "productModel",
                    }),
                ]);
            })
            .catch(function (error) {
                logger.error({
                    functionName: "scanBarcodeStockOrder",
                    message: "Error While finding updated line item",
                    error,
                    options,
                });
                return Promise.reject(error);
            })

            .then(function ([obj, stockLineItem]) {
                return Promise.resolve(
                    Object.assign({}, obj, stockLineItem.toJSON())
                );
            });
    };
};
