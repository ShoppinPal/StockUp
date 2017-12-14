'use strict';

var questions = require('./questions/qustions').getQustions();
var inquirer = require('inquirer');
var environment = process.env.npm_config_e ? process.env.npm_config_e : 'web';
var fs = require('fs');
var obj = {};
var text;

function writeToFile(destPath, messageId) {
    fs.open(destPath, 'w+', function (err, fd) {
        if (err) {
            console.log('Error opening file', err);
            return;
        }
        fs.write(fd, messageId, function (err) {
            if (err) {
                console.log('Could not write to file', err);
            }
            else {
                console.log('written to file', destPath);
            }
        });
    });
}

function generateEnv(data) {
    if (environment === 'worker') {
        for (var wkey in data) {
            if (data.hasOwnProperty(wkey)) {
                switch (wkey) {
                    case 'answers':
                        for (var gKey in data[wkey]) {
                            if (data[wkey].hasOwnProperty(gKey)) {
                                switch (gKey) {
                                    case 'db_url':
                                        text += '\n DbUrl = ' + data[wkey][gKey];
                                        break;
                                    case 'cache_url':
                                        text += '\n cacheUrl = ' + data[wkey][gKey];
                                        break;
                                }
                            }
                        }
                        break;
                }
            }
        }
        if (data.end.completion) {
            writeToFile('worker.env', text);
        }
    } else if (environment === 'web') {
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                switch (key) {
                    case 'general':
                        for (var gKey in data[key]) {
                            if (data[key].hasOwnProperty(gKey)) {
                                switch (gKey) {
                                    case 'env':
                                        text += '\n NODE_ENV = ' + data[key][gKey];
                                        break;
                                    case 'scheme':
                                        text += '\n SCHEME = ' + data[key][gKey];
                                        break;
                                    case 'external_ip':
                                        text+='\n\n ##\
                                        \n # To accommodate redirects, the code needs to know the external facing URL (FQDN or IP)\
                                        \n ##';
                                        text += '\n VM_EXTERNAL_IP = ' + data[key][gKey];
                                        break;
                                    case 'worker_type':
                                        text += '\n WORKER_TYPE = ' + data[key][gKey];
                                        break;
                                }
                            }
                        }
                        break;
                    case 'aws':
                        text+='\n\n # AWS account credentials\n'
                        for (var aKey in data[key]) {
                            if (data[key].hasOwnProperty(aKey)) {
                                switch (aKey) {
                                    case 'aws_access_key_id':
                                        text += '\n AWS_ACCESS_KEY_ID = ' + data[key][aKey];
                                        break;
                                    case 'aws_secret_access_key':
                                        text += '\n AWS_SECRET_ACCESS_KEY = ' + data[key][aKey];
                                        break;
                                    case 'aws_bucket':
                                        text +='\n\n ## \n # A seed file contains information to populate the database. It contains: \n # - roles, usernames, passwords \n # - integration tokens gained via a successful oauth handshake, \n #   used to communicate with a point-of-sale (Vend) on behalf of retailers \n # - suppliers, outlets \n # - anything and everything which we cannot add via a UI for onboarding warehouse users. \n ##\n';
                                        text += '\n AWS_BUCKET = ' + data[key][aKey];
                                        break;
                                    case 'aws_default_region':
                                        text += '\n AWS_DEFAULT_REGION = ' + data[key][aKey];
                                        break;
                                    case 'aws_key':
                                        text += '\n AWS_KEY = ' + data[key][aKey];
                                        break;
                                }
                            }
                        }
                        break;
                    case 'vend':
                        text+='\n\n ##\
                        \n # Whomever is running warehouse, needs to be identified as a unique player by the point-of-sale (Vend)\
                        \n # To get these, you can:\
                        \n # - Register as a developer or Sign In: https://developers.vendhq.com/\
                        \n # - View or Add Application\
                        \n #   - https://developers.vendhq.com/developer/applications\
                        \n ##\
                        \n\n # your identification credentials given by Vend\n';
                        for (var vKey in data[key]) {
                            if (data[key].hasOwnProperty(vKey)) {
                                switch (vKey) {
                                    case 'vend_client_id':
                                        text += '\n VEND_CLIENT_ID = ' + data[key][vKey];
                                        break;
                                    case 'vend_client_secret':
                                        text += '\n VEND_CLIENT_SECRET = ' + data[key][vKey];
                                        break;
                                }
                            }
                        }
                        break;
                    case 'oauth':
                        for (var oKey in data[key]) {
                            if (data[key].hasOwnProperty(oKey)) {
                                switch (oKey) {
                                    case 'oauth_secret_key':
                                        text += '\n\n OAUTH SECRET KEY = ' + data[key][oKey];
                                        break;
                                }
                            }
                        }
                        break;
                }
            }
        }
        if (data.end.completion) {
            writeToFile('.env', text);
        }
    }

}


if (environment === 'worker') {
    text = '';
    inquirer.prompt(questions.workerqs).then(answers => {
        obj.answers = answers;
        //obj.worker=answers;
    }).then(() => {
        inquirer.prompt(questions.endqs).then(endval => {
            obj.end = endval;
            generateEnv(obj);
        });
    });
} else if (environment === 'web') {
    text = ' ## \n # Each worker takes care of a different task. \n # Sometimes workers are renamed, so in order to avoid code changes, \n # those worker names can be configured here, instead.\n # DO NOT TOUCH - unless you are a developer.\n ## \n';
    text+='\n GENERATE_STOCK_ORDER_WORKER=generateStockOrderSeriallyWithPaging\
    \n IMPORT_STOCK_ORDER_TO_POS=addProductsToVendConsignment\
    \n IMPORT_STOCK_ORDER_TO_WAREHOUSE=wh.order.import.cached\
    \n IMPORT_STOCK_ORDER_TO_WAREHOUSE_WITHOUT_SUPPLIER=wh.order.import.cached.excel.without.supplier\
    \n REMOVE_UNFULFILLED_PRODUCTS_WORKER=removeUnfulfilledProductsFromStockOrder\
    \n REMOVE_UNRECEIVED_PRODUCTS_WORKER=removeUnreceivedProductsFromStockOrder\
    \n STOCK_ORDER_WORKER=generateStockOrder\n';
    inquirer.prompt(questions.generalQuestions).then(answers => {
        obj.general = answers;
    }).then(() => {
        inquirer.prompt(questions.awsqs).then(awsvals => {
            obj.aws = awsvals;
        }).then(() => {
            inquirer.prompt(questions.vendqs).then(vendvals => {
                obj.vend = vendvals;
            }).then(() => {
                inquirer.prompt(questions.oauthqs).then(oavals => {
                    obj.oauth = oavals;
                }).then(() => {
                    inquirer.prompt(questions.endqs).then(endval => {
                        obj.end = endval;
                        generateEnv(obj);
                    });
                });
            });
        });
    });
} else {
    console.log('------------------------------------');
    console.log('Oops ! An Invalid Option Entered, Please choose either web or worker as an environment');
    console.log('------------------------------------');
}





