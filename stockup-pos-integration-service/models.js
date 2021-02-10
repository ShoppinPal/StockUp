"use strict";
global.Promise = require('bluebird');
const loopback = require('loopback');
const path = require('path');
const fs = require('fs');
const app = loopback();

app.dataSource('db', {connector: require("loopback-connector-mongodb"), url: process.env.MONGOLAB_URI});
app.loopback.modelBuilder.mixins.define('Timestamp', require('./common/mixins/timestamp'));


function loadModelsInDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(function (file) {
        const fileExt = file.split('.').pop();
        if (fileExt === 'json') {
            console.log(dir + file);
            //load the schema for the model
            const Schema = require(path.resolve(dir + file));

            const Model = app.registry.createModel(Schema);
            // const fileNameWithoutExt = file.split('.')[0];
            // console.log(path.resolve(dir + fileNameWithoutExt + '.js'));
            // require(path.resolve(dir + fileNameWithoutExt + '.js'))(Model);
            app.model(Model, {dataSource: 'db'});
        }
    });
}

loadModelsInDir(__dirname + '/common/models/');
loadModelsInDir(__dirname + '/node_modules/loopback/common/models/');

module.exports = app.models;
