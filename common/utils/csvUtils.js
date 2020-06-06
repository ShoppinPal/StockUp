const fs = require('fs');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:utils:' + fileName});
const multiparty = require("multiparty");
const papaparse = require('papaparse');

function parseCSVToJson(req, options) {
    return new Promise(function (resolve, reject) {
        var form = new multiparty.Form();
        form.parse(req, function (err, fields, files) {
            if (err) {
                logger.error({
                    message: 'Error in parsing form data',
                    functionName: 'parseCSVToJson',
                    options
                });
                reject(err);
            }
            else {
                //TODO: add file and fields validation
                logger.debug({
                    message: 'Received the following file, will parse it to json',
                    files,
                    fields,
                    functionName: 'parseCSVToJson',
                    options
                });
                var fileData = fs.readFileSync(files.file[0].path, 'utf8');
                var csvData = papaparse.parse(fileData);
                logger.debug({
                    message: 'Parsed file to json',
                    csvData,
                    functionName: 'parseCSVToJson',
                    options
                });
                resolve({
                    csvData: csvData,
                    fields: fields
                });
            }
        });
    });

}

module.exports = {
    parseCSVToJson
};
