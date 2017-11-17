'use strict';

var debug = require('debug')('boot:create-store-mappings');
var logger = require('sp-json-logger');

var Promise = require('bluebird');

function createStoreMappings(app, cb){
  var StoreModel = app.models.StoreModel;
  var StoreMappingModel = app.models.StoreMappingModel;

  var seed = null;
  try {
    seed = require('./seed.json');
    if(process.env.SKIP_SEEDING) {
      //debug('Will skip the database seeding process');
      logger.debug({log: {message: 'Will skip the database seeding process' }});
      return cb();
    }
  } catch (err) {
    // debug('Please configure your data in `seed.json`.');
    // debug('Copy `seed.json.template` to `seed.json` and replace the values with your own.');
    logger.debug({log: {
      message: `Please configure your data in 'seed.json'.\n
      Copy 'seed.json.template' to 'seed.json' and replace the values with your own.`
    }});
    cb(err);
  }
  if(seed){
    //debug('seed each store-mapping, one-by-one');
    logger.debug({log: {message: 'seed each store-mapping, one-by-one' }});
    Promise.map(
      seed.storeConfigModels,
      function (storeData) {
        return Promise.map(
          storeData.storeMappingModels || [],
          function(oneMapping){
            return StoreMappingModel.findOrCreate(
              {where:{code:oneMapping.code}},
              oneMapping
            )
              .spread(function(mappingModelInstance,created){
                // (created) ? debug('mapping created', 'StoreMappingModel', mappingModelInstance)
                //           : debug('mapping found', 'StoreMappingModel', mappingModelInstance);
                (created) ? logger.debug({log: {message: 'mapping created', storeMappingModel: mappingModelInstance }})
                : logger.debug({log: {message: 'mapping found', storeMappingModel: mappingModelInstance }});
                return Promise.resolve();
              });
          },
          {concurrency:1}
        );
      },
      {concurrency:1}
    )
    .then(function(){
      logger.debug({message: 'Done with seeding mappings'});
      cb();
    })
    .catch(function(err){
      //debug('error', err);
      logger.error({err: error});
      cb(err);
    });
  }
}

module.exports = createStoreMappings;
