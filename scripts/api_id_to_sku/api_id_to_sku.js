const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: commandName});
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var _ = require('underscore');
var Promise = require('bluebird');
var dbUrl = process.env.MONGOLAB_URL;

var db = null;
return MongoClient.connect(dbUrl, {promiseLibrary: Promise})
    .then(function (dbInstance) {
        db = dbInstance;

        var batch = dbInstance.collection('ProductModel').initializeUnorderedBulkOp();
        return db.collection('ProductModel').find({
            sku: {
                $exists: false
            }
        }).toArray()
            .then(function (productModels) {
                logger.debug({
                    message: 'Found product models',
                    count: productModels.length
                });
                _.each(productModels, function (eachProduct) {
                    batch.find({
                        _id: ObjectId(eachProduct._id)
                    })
                        .updateOne({
                            $set: {
                                sku: eachProduct.api_id
                            }
                        })
                });
                return executeBatch(batch, productModels[0].orgModelId);
            })
            .then(function () {
                logger.debug({
                    message: 'Operation successful, will exit'
                });
                process.exit(0);
            })
    });

function executeBatch(batch, orgModelId) {
    return new Promise(function (resolve, reject) {
        logger.debug({
            orgModelId,
            message: `Executing batch of inventory`,
            functionName: 'executeBatch'
        });
        if (batch.s && batch.s.currentBatch && batch.s.currentBatch.operations) {
            batch.execute(function (err, result) {
                if (err) {
                    logger.error({
                        orgModelId,
                        message: `ERROR in batch`,
                        err: err,
                        functionName: 'executeBatch'
                    });
                    reject(err);
                }
                else {
                    logger.debug({
                        orgModelId,
                        message: `Successfully executed batch operation`,
                        "nInserted": result.nInserted,
                        "nUpserted": result.nUpserted,
                        "nMatched": result.nMatched,
                        "nModified": result.nModified,
                        "nRemoved": result.nRemoved,
                        functionName: 'executeBatch'
                    });
                    resolve('Executed');
                }
            });
        }
        else {
            logger.debug({
                orgModelId,
                message: `Skipping empty batch`,
                functionName: 'executeBatch'
            });
            resolve('Skipped');
        }
    });
}
