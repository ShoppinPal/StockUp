const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'server:boot:' + fileName});

module.exports = function (app) {
    logger.debug({message: 'Defining role and roleMapping models'});
    var mongodb = app.datasources.db;
    var ObjectID = mongodb.connector.getDefaultIdType();
    var RoleMapping = app.models.RoleMapping;
    var UserModel = app.models.UserModel;
    var StoreModel = app.models.StoreModel;
    var Role = app.models.Role;

    RoleMapping.defineProperty('principalId', {
        type: ObjectID
    });
    RoleMapping.belongsTo(UserModel, {
        as: 'principal',
        foreignKey: 'principalId'
    });
    RoleMapping.referencesMany(StoreModel, {
        as: 'storeModels',
        foreignKey: 'storeModelIds',
        options: {
            validate: true,
            forceId: false
        }});
    UserModel.hasMany(RoleMapping, {foreignKey: 'principalId'});
    UserModel.hasMany(Role, {as: 'roles', through: RoleMapping, foreignKey: 'principalId'});
    Role.hasMany(UserModel, {through: RoleMapping, foreignKey: 'roleId'});
};
