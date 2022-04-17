const path = require('path'),
    commandName = path.basename(__filename,'.js'),
    logger = require('sp-json-logger')({fileName: 'workers: workers-v2:'+ commandName});
var dbUrl = process.env.DB_URL,
    MongoClient = require('mongodb').MongoClient,
    ObjectId = require('mongodb').ObjectID,
    _ = require('underscore'),
    Promise = require('bluebird'),
    vendSdk = require('vend-nodejs-sdk')({}),
    categoryBatchNumber;

var runMe = function(vendConnectionInfo, orgModelId, versionsAfter) {
    var db = null;

    logger.debug({
        orgModelId,
        message: 'This worker will fetch and save incremental Product Category from vend to StockUp'
    });

    return MongoClient.connect(dbUrl, {promiseLibrary: Promise})
    .then(function(dbInstance){
            db = dbInstance;
            logger.debug({
                message: 'Connected with Mongodb Database'
            });
            categoryBatchNumber = 0;
           return fetchCategory(dbInstance, vendConnectionInfo,orgModelId, versionsAfter); 
    })
    .finally(function(){
        logger.debug({
            orgModelId,
            message: 'Closing DB Connection'
        });
        if(db){
            return db.close();
        }
    }).catch(function(error){
        logger.error({
            orgModelId,
            message:'Could not close db connection',
            err : error
        });

        return Promise.resolve();
    })

}


var fetchCategory = function (dbInstance, vendConnectionInfo,orgModelId, versionsAfter){
    categoryBatchNumber+=1;
    var argsForProductTypes = vendSdk.args.productTypes.fetch();
            //change args to fetch all product types at once
            argsForProductTypes.deleted.value = 1; 
            argsForProductTypes.after = versionsAfter;
            argsForProductTypes.pageSize = 1000;
            return vendSdk.productTypes.fetch(argsForProductTypes, vendConnectionInfo)
            .catch(function(error){
                logger.error({
                    message:'Could not fetch category from vend',
                    orgModelId,
                    categoryBatchNumber,
                    error,
                    functionName: 'fetchCategory'
                })
                return Promise.reject('Could not fetch category from vend');
            }).then(function(response){
                if(response && response.data && response.data.length){
                    logger.debug({
                        message: 'Fetch category data from vend, will save to DB',
                        categoryCount: response.data.length,
                        orgModelId,
                        categoryBatchNumber,
                        functionName: 'fetchCategory'
                    });
                    return saveCategory(dbInstance,vendConnectionInfo,orgModelId,response);
                }
                else if(response && response.data && !response.data.length){
                    logger.debug({
                        message : 'No more new category available to fetch',
                        orgModelId,
                        categoryBatchNumber,
                        functionName: 'fetchCategory'
                    });

                    return Promise.resolve('No Incremental Category');
                }
                else{
                    logger.debug({
                        message:'Vend API returning null response',
                        response,
                        categoryBatchNumber,
                        orgModelId,
                        functionName: 'fetchCategory'
                    });

                    return Promise.reject();
                }
            });
}


var saveCategory = function (dbInstance, vendConnectionInfo, orgModelId, categories){
    
    var categoriesToDelete = _.filter(categories.data, function(eachCategory){
        return eachCategory.deleted_at !== undefined && eachCategory.deleted_at !==null;
    })

    var categoriesToSave = _.difference(categories.data, categoriesToDelete);

    logger.debug({
        message : 'Found deleted & incremental categories',
        orgModelId,
        categoryBatchNumber,
        deletedCategories : categoriesToDelete.length,
        saveToCategory: categoriesToSave.length,
        functionName :'saveCategory',
        db: dbInstance.collection('CategoryModel')
    });

    var batch = dbInstance.collection('CategoryModel').initializeUnorderedBulkOp();
    _.each(categoriesToSave,function(eachCategory){
        batch.find({
            orgModelId: ObjectId(orgModelId),
            api_id: eachCategory.id
        }).upsert().updateOne({
            $set:{
                name: eachCategory.name,
                api_id: eachCategory.id,
                orgModelId : ObjectId(orgModelId),
                updatedAt: new Date()
            }
        });
    });

    _.each(categoriesToDelete,function(eachCategory){
        batch.find({
            orgModelId: ObjectId(orgModelId),
            api_id: eachCategory.id
        }).remove({
            api_id: eachCategory.id
        });
    });

    return executeBatch(batch,orgModelId)
        .catch(function(err){
            logger.error({
                message:'Could not executing batch',
                err,
                categoryBatchNumber,
                functionName:'saveCategory',
                orgModelId
            });

            return Promise.reject();
        })
        .then(function(){
            logger.debug({
                message:' Successfully executed the batch',
                orgModelId,
                categoryBatchNumber,
                functionName: 'saveCategory'
            });

            return dbInstance.collection('SyncModel').updateOne({
                $and:[
                        {'orgmModelId': ObjectId(orgModelId)},
                        {'name':'product_types'}
                     ],
                    },
                    {
                        $set:{
                            'version':categories.version.max
                        }
                    });
        })
        .catch(function(error){
            logger.error({
                message:'Could not update the version number in DB, will stop sync',
                error,
                orgModelId,
                categoryBatchNumber,
                functionName:'saveCategory'
            });
            return Promise.reject('Could not update the version number in DB, will stop sync');
        })
        .then(function(){
            logger.debug({
                message:'Updated the version number in DB, Will fetch another batch',
                categoryBatchNumber,
                functionName:'saveCategory',
                orgModelId
            });
            return fetchCategory(dbInstance,vendConnectionInfo,orgModelId, categories.version.max);

        });
}

function executeBatch(batch, orgModelId){
    return new Promise(function(resolve,reject){
        logger.debug({
            orgModelId,
            message: `Executing batch of Category`,
            categoryBatchNumber,
            batch,
            functionName : 'excuteBatch'
        });
        if (batch.s && batch.s.currentBatch && batch.s.currentBatch.operations) {
            batch.execute(function (err, result) {
                if (err) {
                    logger.error({
                        orgModelId,
                        message: `ERROR in batch`,
                        categoryBatchNumber,
                        err: err,
                        functionName: 'executeBatch'
                    });
                    reject(err);
                }
                else {
                    logger.debug({
                        orgModelId,
                        message: `Successfully executed batch operation`,
                        categoryBatchNumber,
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
                suppliersBatchNumber,
                message: `Skipping empty batch`,
                functionName: 'executeBatch'
            });
            resolve('Skipped');
        }
    });
}

module.exports ={
    run: runMe
}