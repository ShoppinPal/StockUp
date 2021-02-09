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
        if (file.split('.').pop() === 'json') {
            console.log(dir + file);
            //load the schema for the model
            const Schema = require(path.resolve(dir + file));

            const Model = app.registry.createModel(Schema);
            app.model(Model, {dataSource: 'db'});
        }
    });
}

loadModelsInDir(__dirname + '/common/models/');
loadModelsInDir(__dirname + '/node_modules/loopback/common/models/');

app.models.UserModel.find({
    include: 'orgModel',
    limit: 1
}, (err, data) => {
    console.log(err, data);
});
