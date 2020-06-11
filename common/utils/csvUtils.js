const fs = require('fs');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:utils:' + fileName});
const multiparty = require("multiparty");
const papaparse = require('papaparse');
const fileUtils = require('./fileUtils');

function parseCSVToJson(req, options) {
    return fileUtils.readFileData(req, options)
        .then(function (response) {
            var csvData = papaparse.parse(response.fileData);
            return {
                csvData: csvData,
                fields: response.fields
            }
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not parse csv file',
                error,
                options,
                functionName: 'parseCSVToJson'
            });
            return Promise.reject('Could not parse csv data');
        });
}

module.exports = {
    parseCSVToJson
};
