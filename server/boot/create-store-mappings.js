'use strict';

var debug = require('debug')('boot:create-store-mappings');

var Promise = require('bluebird');
var _ = require('underscore');


module.exports = function(app){
  var StoreModel = app.models.StoreModel;
  var StoreMappingModel = app.models.StoreMappingModel;

  var seed = null;
  try {
    seed = require('./seed.json');
    if(process.env.SKIP_SEEDING) {
      debug('Will skip the database seeding process');
      return;
    }
  } catch (err) {
    debug('Please configure your data in `seed.json`.');
    debug('Copy `seed.json.template` to `seed.json` and replace the values with your own.');
  }
  if(seed){
    debug('seed each store-mapping, one-by-one');
      return Promise.map(
        seed.storeConfigModels,
        function (storeData) {

          return Promise.map(
            storeData.storeMappingModels,
            function(oneMapping){
              return StoreMappingModel.findOrCreate(
                {where:{code:oneMapping.code}},
                oneMapping
              )
                .spread(function(mappingModelInstance,created){
                  (created) ? debug('mapping created', 'StoreMappingModel', mappingModelInstance)
                    : debug('mapping found', 'StoreMappingModel', mappingModelInstance);
              });
            },
            {concurrency:1}
          )
        },
        {concurrency:1}
    )
  }
};