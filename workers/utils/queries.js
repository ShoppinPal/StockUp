const ObjectId = require('mongodb').ObjectID;

/**
 * Find store inventory needed to be replenished
 * @param storeModelId
 * @param db
 * @return {*}
 */
function getAggregatedStoreInventory(storeModelId, db) {
    var aggregationQuery = [
        {
            $match: {
                storeModelId: ObjectId(storeModelId)
            }
        },
        {
            $lookup: {
                "from": "CategoryModel",
                "localField": "categoryModelId",
                "foreignField": "_id",
                "as": "categoryModel"
            }
        },
        {
            $lookup: {
                from: 'ProductsReorderPointsMultiplierMappings',
                localField: "productModelId",
                foreignField: "productModelId",
                as: "productsReorderPointsMultiplierMapping"
            }
        },
        {
            $unwind: '$productsReorderPointsMultiplierMapping'
        },
        {
            $lookup: {
                from: 'ReorderPointsMultiplierModel',
                localField: "productsReorderPointsMultiplierMapping.reorderPointsMultiplierModelId",
                foreignField: "_id",
                as: "reorderPointsMultiplierModel"
            }
        },
        {
            $group: {
                _id: '$optionLevelKey',
                totalProducts: {
                    $sum: 1
                },
                productModels: {
                    $addToSet: {
                        productModelId: '$productModelId',
                        inventory_level: '$physical_inventory_level',
                        reorder_point: '$stockUpReorderPoint',
                        reorder_threshold: '$stockUpReorderThreshold',
                        multiplier: {
                            $cond: {
                                if: {
                                    $eq: [{
                                        $arrayElemAt: ['$reorderPointsMultiplierModel.isActive', 0]
                                    }, true]
                                },
                                then: {
                                    $arrayElemAt: ['$reorderPointsMultiplierModel.multiplier', 0]
                                },
                                else: null
                            },

                        }
                    }
                },
                inventory_level: {
                    $sum: '$physical_inventory_level'
                },
                reorder_point: {
                    $sum: '$stockUpReorderPoint'
                },
                reorder_threshold: {
                    $sum: '$stockUpReorderThreshold'
                },
                categoryModel: {
                    $first: '$categoryModel'
                }
            }
        },

        {
            $project: {
                to_replenish: {
                    $and: [
                        {$gt: ['$reorder_threshold', '$inventory_level']},
                        {$gt: ['$reorder_threshold', 0]}
                    ]
                },
                optionLevelKey: '$_id',
                totalProducts: '$totalProducts',
                productModels: '$productModels',
                inventory_level: '$inventory_level',
                reorder_point: '$reorder_point',
                reorder_threshold: '$reorder_threshold',
                categoryModel: '$categoryModel'
            }
        },
        {
            $match: {
                to_replenish: true
            }
        }
    ];
    return db.collection('InventoryModel').aggregate(aggregationQuery, {allowDiskUse: true}).toArray();
}

/**
 * Find inventory available in warehouse to replenish
 * @param warehouseModelId
 * @param productModelIds
 * @param db
 * @return {Promise.<T>}
 */
function findWarehouseInventory(warehouseModelId, productModelIds, db) {
    var aggregationQuery = [
        {
            $match: {
                productModelId: {
                    $in: productModelIds
                },
                storeModelId: ObjectId(warehouseModelId)
            }
        },
        {
            $group: {
                _id: '$optionLevelKey',
                inventory_level: {
                    $sum: '$inventory_level'
                },
                totalProducts: {
                    $sum: 1
                },
                productModels: {
                    $addToSet: {
                        productModelId: '$productModelId',
                        inventory_level: '$inventory_level',
                        reorder_point: '$stockUpReorderPoint',
                        reorder_threshold: '$stockUpReorderThreshold'
                    }
                },
            }
        },
        {
            $match: {
                inventory_level: {
                    $gt: 0
                }
            }
        }
    ];
    return db.collection('InventoryModel').aggregate(aggregationQuery).toArray();
}

module.exports = {
    getAggregatedStoreInventory,
    findWarehouseInventory
};
