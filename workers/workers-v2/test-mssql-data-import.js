const sql = require('mssql');
sql.Promise = require('bluebird');
const MongoClient = require('mongodb').MongoClient;
const dbUrl = process.env.DB_URL;
var db = null;
var incrementalProducts;
var sqlPool = null;
var pagesToFetch = 7100;
var _ = require('underscore');
var ObjectId = require('mongodb').ObjectID;
const config = {
    user: 'kamal',
    password: '8QK3C^XYdFhD',
    server: 'stockup-stag.database.windows.net', // You can use 'localhost\\instance' to connect to named instance
    database: 'stockup-fno-lmsea',
    options: {
        encrypt: true // Use this if you're on Windows Azure
    }
};
sql.connect(config).then(pool => {
    // Query
    sqlPool = pool;

    return MongoClient.connect(dbUrl, {promiseLibrary: Promise});

})
    .catch(function (error) {
        console.log('Could not connect to Mongo DB');
        return Promise.reject(error);
    })
    .then(dbInstance => {
        console.log('Connected to mongodb database, will look for sync models to sync');
        db = dbInstance;
        return fetchPaginatedProducts();
    })
    .then(function (result) {
        console.log('synced', result);
        process.exit(1);
    })
    .catch(err => {
        console.log('err1', err);
        process.exit(1);
    });

function fetchPaginatedProducts() {
    if (pagesToFetch>0) {
        return sqlPool.request()
            .query('SELECT TOP 10 * FROM dbo.HSPRODUCTSYNCTABLEStaging')
            .then(function (result) {
                incrementalProducts = result.recordset;
                console.log(JSON.stringify(incrementalProducts, null, 2));
                var batch = db.collection('ProductModel').initializeUnorderedBulkOp();
                _.each(incrementalProducts, function (eachProduct) {
                    batch.find({
                        itemId: eachProduct.ITEMID
                    }).upsert().updateOne({
                        $set: {
                            name: eachProduct.NAME,
                            itemId: eachProduct.ITEMID,
                            orgModelId: ObjectId('5bbf4ba99bff0f00d46301ab')
                        }
                    })
                });
                return batch.execute();
            })
            .then(function (result) {
                console.log('Inserted data to Mongo', result);
                return sqlPool.request().query('DELETE TOP (10) FROM dbo.HSPRODUCTSYNCTABLEStaging');
            })
            .then(function (result) {
                console.log('Deleted', JSON.stringify(result, null, 2));
                pagesToFetch--;
                return fetchPaginatedProducts();
            });
    }
    else {
        return Promise.resolve('Executed all pages: '+pagesToFetch);
    }
}

sql.on('error', err => {
    console.log('err2', err);
    process.exit(1);
});
