'use strict';

var questions = require('./questions/qustions').getQustions();
var inquirer = require('inquirer');
var fs = require('fs');
var obj = {};
var text = '';


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
                                    text += '\n OAUTH SECRET KEY = ' + data[key][oKey];
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
            }).then(()=>{
                inquirer.prompt(questions.endqs).then(endval => {
                    obj.end = endval;
                    generateEnv(obj);
                });
            });
        });
    });
});




