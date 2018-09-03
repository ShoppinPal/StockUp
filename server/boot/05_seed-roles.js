'use strict';
var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
var Promise = require('bluebird'); // jshint ignore:line

module.exports = function (app, cb) {
    var Role = app.models.Role;
    Promise.resolve()
        .then(function () {
            logger.debug({message: 'Creating/finding storeManager role'});
            return Role.findOrCreate(
                {where: {name: 'storeManager'}}, // find
                {name: 'storeManager', description: 'Store Manager'}
            );
        })
        .then(function (created, found) {
            logger.debug({message: 'Creating/finding warehouseManager role'});
            return Role.findOrCreate(
                {where: {name: 'warehouseManager'}}, // find
                {
                    name: 'warehouseManager',
                    description: 'Warehouse Manager'
                }
            );
        })
        .then(function () {
            logger.debug('Roles created/found successfully');
            return cb();
        })
        .catch(function (error) {
            logger.error({
                message: 'Error in creating roles',
                error
            });
            return cb(error);
        });
};
