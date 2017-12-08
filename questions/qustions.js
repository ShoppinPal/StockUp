'use strict';

var getQustions=function getQustions() {
    var questions={
        generalQuestions:[
            {
                type: 'list',
                name: 'env',
                message: 'enter the environment for which you want to generate the configuration',
                choices: ['local', 'development', 'staging', 'production'],
                filter: function (val) {
                    return val.toLowerCase();
                }
            },
            {
                type: 'list',
                name: 'scheme',
                message: 'enter the scheme for the configuration',
                choices: ['http', 'https'],
                filter: function (val) {
                    return val.toLowerCase();
                }
            },
            {
                type: 'input',
                name: 'external_ip',
                message: 'enter the external ip for the application'
            },
            {
                type: 'list',
                name: 'worker_type',
                message: 'enter the worker type for the configuration',
                choices: ['aws', 'inworker'],
                filter: function (val) {
                    return val.toUpperCase();
                }
            }
        ],
        awsqs:[
            {
                type: 'input',
                name: 'aws_access_key_id',
                message: 'Enter the AWS access key id (leave blank if not known)'
            },
            {
                type: 'input',
                name: 'aws_secret_access_key',
                message: 'Enter the AWS Secret access key (leave blank if not known)'
            },
            {
                type:'input',
                name:'aws_bucket',
                message:'Enter the AWS bucket (leave blank if not known)'
            },
            {
                type:'input',
                name:'aws_default_region',
                message:'Enter the AWS default region'
            },
            {
                type:'input',
                name:'aws_key',
                message:'Enter the AWS Key'
            }
        ],
        vendqs:[
            {
                type: 'input',
                name: 'vend_client_id',
                message: 'Enter the VEND Client ID  (leave blank if not known)'
            },
            {
                type: 'input',
                name: 'vend_client_secret',
                message: 'Enter the VEND Client Secret  (leave blank if not known)'
            }
        ],
        oauthqs:[
            {
                type: 'input',
                name: 'oauth_secret_key',
                message: 'Enter the OAUTH Secret Key  (leave blank if not known)'
            }
        ],
        endqs:[
            {
                type: 'confirm',
                name: 'completion',
                message: 'Are you finished configuring the environment?'
            }
        ]
    };
    return questions;
};

module.exports={
    getQustions:getQustions
};