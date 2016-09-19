'use strict';

var debug = require('debug')('boot:create-store-mappings');

var Promise = require('bluebird');

function createStoreMappings(app, cb){
  var StoreModel = app.models.StoreModel;
  var StoreMappingModel = app.models.StoreMappingModel;

  var seed = null;
  try {
    seed = require('./seed.json');
    if(process.env.SKIP_SEEDING) {
      debug('Will skip the database seeding process');
      return cb();
    }
  } catch (err) {
    debug('Please configure your data in `seed.json`.');
    debug('Copy `seed.json.template` to `seed.json` and replace the values with your own.');
    cb(err);
  }
  if(seed){
    debug('seed each store-mapping, one-by-one');
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
                (created) ? debug('mapping created', 'StoreMappingModel', mappingModelInstance)
                          : debug('mapping found', 'StoreMappingModel', mappingModelInstance);
                return Promise.resolve();
              });
          },
          {concurrency:1}
        );
      },
      {concurrency:1}
    )
    .then(function(){
      debug('Done with seeding mappings');
      cb();
    })
    .catch(function(err){
      debug('error', err);
      cb(err);
    });
  }
}

module.exports = createStoreMappings;