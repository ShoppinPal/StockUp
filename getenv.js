'use strict';

var questions = require('./questions/qustions').getQustions();
var inquirer = require('inquirer');
var environment = process.env.npm_config_e ? process.env.npm_config_e : 'terraform';
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

function getSqsVariables() {
    var temp = '';
    var sqsVals;
    try {
        sqsVals = require('./terraform.json');
    }catch (e) {
        console.log('------------------------------------');
        console.log('Oops ! Seems like you haven\'t generated the SQS configuration yet. Do that & try again.');
        console.log('------------------------------------');
    }
    if (sqsVals) {
        for (var tkey in sqsVals) {
            switch (tkey) {
                case 'AWS_SQS_URL':
                    temp += '\n\n AWS_SQS_URL = ' + sqsVals[tkey];
                    break;
                case 'AWS_SQS_REGION':
                    temp += '\n AWS_SQS_REGION = ' + sqsVals[tkey];
                    break;
                case 'AWS_SQS_ACCESS_KEY_ID':
                    temp += '\n AWS_SQS_ACCESS_KEY_ID = ' + sqsVals[tkey];
                    break;
                case 'AWS_SQS_SECRET_ACCESS_KEY':
                    temp += '\n AWS_SQS_SECRET_ACCESS_KEY = ' + sqsVals[tkey];
                    break;
                default:
                    break;
            }
        }
    }
    return temp;
}

function generateEnv(data) {
    switch (environment) {
        case 'web':
            text = '';
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
                                            text += '\n\n ##\
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
                            text += '\n\n # AWS account credentials\n'
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
                                            text += '\n\n ## \n # A seed file contains information to populate the database. It contains: \n # - roles, usernames, passwords \n # - integration tokens gained via a successful oauth handshake, \n #   used to communicate with a point-of-sale (Vend) on behalf of retailers \n # - suppliers, outlets \n # - anything and everything which we cannot add via a UI for onboarding warehouse users. \n ##\n';
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
                            text += '\n\n ##\
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
                        case 'workers':
                            text += '\n\n ## \n # Each worker takes care of a different task. \n # Sometimes workers are renamed, so in order to avoid code changes, \n # those worker names can be configured here, instead.\n # DO NOT TOUCH - unless you are a developer.\n ## \n';
                            for (var zKey in data[key]) {
                                if (data[key].hasOwnProperty(zKey)) {
                                    switch (zKey) {
                                        case 'GENERATE_STOCK_ORDER_WORKER':
                                            text += '\n GENERATE_STOCK_ORDER_WORKER = ' + data[key][zKey];
                                            break;
                                        case 'IMPORT_STOCK_ORDER_TO_POS':
                                            text += '\n IMPORT_STOCK_ORDER_TO_POS = ' + data[key][zKey];
                                            break;
                                        case 'IMPORT_STOCK_ORDER_TO_WAREHOUSE_WITHOUT_SUPPLIER':
                                            text += '\n IMPORT_STOCK_ORDER_TO_WAREHOUSE_WITHOUT_SUPPLIER = ' + data[key][zKey];
                                            break;
                                        case 'IMPORT_STOCK_ORDER_TO_WAREHOUSE':
                                            text += '\n IMPORT_STOCK_ORDER_TO_WAREHOUSE = ' + data[key][zKey];
                                            break;
                                        case 'REMOVE_UNFULFILLED_PRODUCTS_WORKER':
                                            text += '\n REMOVE_UNFULFILLED_PRODUCTS_WORKER = ' + data[key][zKey];
                                            break;
                                        case 'REMOVE_UNRECEIVED_PRODUCTS_WORKER':
                                            text += '\n REMOVE_UNRECEIVED_PRODUCTS_WORKER = ' + data[key][zKey];
                                            break;
                                        case 'STOCK_ORDER_WORKER':
                                            text += '\n STOCK_ORDER_WORKER = ' + data[key][zKey];
                                            break;
                                    }
                                }
                            }
                            break;
                    }
                }
            }
            if (data.end.completion) {
                text += getSqsVariables();
                writeToFile('.env', text);
                console.log('------------------------------------');
                console.log('Congratulations ! you have successfully generated environment configuration for Web. You can delete the \'aws.json\' from your project.');
                console.log('------------------------------------');
            }
            break;
        case 'terraform':
            text = '';
            fs.writeFile('aws.json', JSON.stringify(data.answers, null, '\t'), function () {
                console.log('------------------------------------');
                console.log('we have saved these credentials for future purpose in aws.json');
                console.log('------------------------------------');
            });
            for (var tKey in data) {
                if (data.hasOwnProperty(tKey)) {
                    switch (tKey) {
                        case 'answers':
                            for (var sKey in data[tKey]) {
                                if (data[tKey].hasOwnProperty(sKey)) {
                                    switch (sKey) {
                                        case 'aws_iam_access_key':
                                            text += '\n aws_iam_access_key = \"' + data[tKey][sKey] + '\"';
                                            break;
                                        case 'aws_iam_secret_key':
                                            text += '\n aws_iam_secret_key = \"' + data[tKey][sKey] + '\"';
                                            break;
                                        case 'aws_region':
                                            text += '\n aws_region = \"' + data[tKey][sKey] + '\"';
                                            break;
                                        case 'Q':
                                            text += '\n Q = \"' + data[tKey][sKey] + '\"';
                                            break;
                                        case 'DLQ':
                                            text += '\n DLQ = \"' + data[tKey][sKey] + '\"';
                                            break;
                                    }
                                }
                            }
                            break;
                        default:
                            break;
                    }
                }
            }
            if (data.end.completion) {
                writeToFile('terraform/terraform.tfvars', text);
                console.log('------------------------------------');
                console.log('Congratulations ! You have successfully configured the SQS infrastructure. Now you can generate the environment configuration again for web,worker & worker2 respectively.');
                console.log('------------------------------------');
            }
            break;
        case 'worker':
            text = '';
            for (var wkey in data) {
                if (data.hasOwnProperty(wkey)) {
                    switch (wkey) {
                        case 'answers':
                            for (var gKey1 in data[wkey]) {
                                if (data[wkey].hasOwnProperty(gKey1)) {
                                    switch (gKey1) {
                                        case 'db_url':
                                            text += '\n DbUrl = ' + data[wkey][gKey1];
                                            break;
                                        case 'cache_url':
                                            text += '\n # cache is used when we want to:\n # - limit the memory consumed by workers\n # - reuse common data across multiple worker runs\n # DO NOT TOUCH - unless you are a developer/devops';
                                            text += '\n cacheUrl = ' + data[wkey][gKey1];
                                            break;
                                        case 'AWS_SQS_URL_2':
                                            text += '\n AWS_SQS_URL_2 = ' + data[wkey][gKey1];
                                            break;
                                        case 'WORKERS_VERSION':
                                            text += '\n # Important to determine which set of workers are being called\n # to route the operations properly. This is for the time-being\n # until all workers are transitioned to v2';
                                            text += '\n WORKERS_VERSION = ' + data[wkey][gKey1];
                                            break;
                                    }
                                }
                            }
                            break;
                    }
                }
            }
            if (data.end.completion) {
                text += getSqsVariables();
                writeToFile('worker.env', text);
                console.log('------------------------------------');
                console.log('Congratulations ! you have successfully generated environment configuration for Worker.');
                console.log('------------------------------------');
            }
            break;
        case 'worker2':
            text = '';
            for (var wkey2 in data) {
                if (data.hasOwnProperty(wkey2)) {
                    switch (wkey2) {
                        case 'answers':
                            for (var gKey2 in data[wkey2]) {
                                if (data[wkey2].hasOwnProperty(gKey2)) {
                                    switch (gKey2) {
                                        case 'db_url':
                                            text += '\n DbUrl = ' + data[wkey2][gKey2];
                                            break;
                                        case 'cache_url':
                                            text += '\n # cache is used when we want to:\n # - limit the memory consumed by workers\n # - reuse common data across multiple worker runs\n # DO NOT TOUCH - unless you are a developer/devops';
                                            text += '\n cacheUrl = ' + data[wkey2][gKey2];
                                            break;
                                        case 'WORKERS_VERSION':
                                            text += '\n # Important to determine which set of workers are being called\n # to route the operations properly. This is for the time-being\n # until all workers are transitioned to v2';
                                            text += '\n WORKERS_VERSION = ' + data[wkey2][gKey2];
                                            break;
                                    }
                                }
                            }
                            break;
                    }
                }
            }
            if (data.end.completion) {
                text += getSqsVariables();
                writeToFile('worker2.env', text);
                console.log('------------------------------------');
                console.log('Congratulations ! you have successfully generated environment configuration for Worker2.');
                console.log('------------------------------------');
            }
            break;
        default:
            break;
    }
}

switch (environment) {
    case 'web':
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
                        inquirer.prompt(questions.workersqs).then(workers => {
                            obj.workers = workers;
                        }).then(() => {
                            inquirer.prompt(questions.endqs).then(endval => {
                                obj.end = endval;
                                generateEnv(obj);
                            });
                        });
                    });
                });
            });
        });
        break;
    case 'terraform':
        inquirer.prompt(questions.terraformqs).then(answers => {
            obj.answers = answers;
        }).then(() => {
            inquirer.prompt(questions.endqs).then(endval => {
                obj.end = endval;
                generateEnv(obj);
            });
        });
        break;
    case 'worker':
        inquirer.prompt(questions.workerqs).then(answers => {
            obj.answers = answers;
            //obj.worker=answers;
        }).then(() => {
            inquirer.prompt(questions.endqs).then(endval => {
                obj.end = endval;
                generateEnv(obj);
            });
        });
        break;
    case 'worker2':
        inquirer.prompt(questions.worker2qs).then(answers => {
            obj.answers = answers;
        }).then(() => {
            inquirer.prompt(questions.endqs).then(endval => {
                obj.end = endval;
                generateEnv(obj);
            });
        });
        break;

    default:
        console.log('------------------------------------');
        console.log('Oops ! An Invalid Option Entered, Please choose correct option among : ');
        console.log(' 1.terraform \n 2.web \n 3.worker \n 4.worker2');
        console.log('------------------------------------');
        break;
}





