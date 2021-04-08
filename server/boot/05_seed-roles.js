'use strict';
var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'server:boot:' + fileName});
var Promise = require('bluebird'); // jshint ignore:line
const constants = require('../../common/utils/constants');
const ROLES = constants.ROLES;

module.exports = function (app, cb) {
    var Role = app.models.Role;
    Promise.resolve()
        .then(function () {
            logger.debug({message: 'Creating/finding orgAdmin role'});
            return Role.findOrCreate(
                {where: {name: 'orgAdmin'}}, // find
                {name: 'orgAdmin', description: 'Org Admin'}
            );
        })
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
            logger.debug({message: 'Creating/finding discrepancy role'});
            return Role.findOrCreate(
                {where: {name: ROLES.DISCREPANCY_MANAGER}}, // find
                {
                    name: ROLES.DISCREPANCY_MANAGER,
                    description: 'Discrepancy Manager'
                }
            );
        })
        .then(function () {
            logger.debug({message: 'Creating/finding order Manager role'});
            return Role.findOrCreate(
                {where: {name: ROLES.ORDER_MANAGER}}, // find
                {
                    name: ROLES.ORDER_MANAGER,
                    description: 'Order Manager'
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
