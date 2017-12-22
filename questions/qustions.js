'use strict';

var getQustions = function getQustions() {
    var awsAccessKey = '';
    var questions = {
        generalQuestions: [
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
                message: 'enter the external ip for the application',
                default: function () {
                    return 'lb';
                }
            },
            {
                type: 'list',
                name: 'worker_type',
                message: 'enter the worker type for the configuration',
                choices: ['aws', 'inworker'],
                filter: function (val) {
                    return val.toUpperCase();
                },
                default:function () {
                    return 'inworker';
                }
            }
        ],
        workersqs:[
            {
                type: 'input',
                name: 'GENERATE_STOCK_ORDER_WORKER',
                message: 'enter the name for GENERATE_STOCK_ORDER_WORKER worker',
                default:function(){
                    return 'generateStockOrderSeriallyWithPaging';
                }
            },
            {
                type: 'input',
                name: 'IMPORT_STOCK_ORDER_TO_POS',
                message: 'enter the name for IMPORT_STOCK_ORDER_TO_POS worker',
                default:function(){
                    return 'addProductsToVendConsignment';
                }
            },
            {
                type: 'input',
                name: 'IMPORT_STOCK_ORDER_TO_WAREHOUSE_WITHOUT_SUPPLIER',
                message: 'enter the name for IMPORT_STOCK_ORDER_TO_WAREHOUSE_WITHOUT_SUPPLIER worker',
                default:function(){
                    return 'wh.order.import.cached.excel.without.supplier';
                }
            },
            {
                type: 'input',
                name: 'IMPORT_STOCK_ORDER_TO_WAREHOUSE',
                message: 'enter the name for IMPORT_STOCK_ORDER_TO_WAREHOUSE worker',
                default:function(){
                    return 'wh.order.import.cached';
                }
            },
            {
                type: 'input',
                name: 'REMOVE_UNFULFILLED_PRODUCTS_WORKER',
                message: 'enter the name for REMOVE_UNFULFILLED_PRODUCTS_WORKER worker',
                default:function(){
                    return 'removeUnfulfilledProductsFromStockOrder';
                }
            },
            {
                type: 'input',
                name: 'REMOVE_UNRECEIVED_PRODUCTS_WORKER',
                message: 'enter the name for REMOVE_UNRECEIVED_PRODUCTS_WORKER worker',
                default:function(){
                    return 'removeUnreceivedProductsFromStockOrder';
                }
            },
            {
                type: 'input',
                name: 'STOCK_ORDER_WORKER',
                message: 'enter the name for STOCK_ORDER_WORKER worker',
                default:function(){
                    return 'generateStockOrder';
                }
            }
        ],
        awsqs: [
            {
                type: 'input',
                name: 'aws_access_key_id',
                message: 'Enter the AWS access key id (leave blank if not known)',
                validate: function (value) {
                    awsAccessKey = value;
                    return true;
                }
            },
            {
                type: 'input',
                name: 'aws_secret_access_key',
                message: 'Enter the AWS Secret access key (leave blank if not known)',
                validate: function (value) {
                    var terraform = require('./../terraform.json');
                    if (terraform.AWS_SQS_ACCESS_KEY_ID === awsAccessKey && terraform.AWS_SQS_SECRET_ACCESS_KEY === value) {
                        console.warn('\n\n WARNING: The key/secret are more powerful than they need to be. ');
                        console.warn(' Everything will work but ideally we should automate the process and change this to use IAM acc based on AWS keys which has permissions like only put/post message on SQS queues that were generated and only read from the S3 bucket. \n');
                    }
                    return true;
                }
            },
            {
                type: 'input',
                name: 'aws_bucket',
                message: 'Enter the AWS bucket (leave blank if not known)'
            },
            {
                type: 'input',
                name: 'aws_default_region',
                message: 'Enter the AWS default region',
                default: function () {
                    return 'us-west-2';
                }
            },
            {
                type: 'input',
                name: 'aws_key',
                message: 'Enter the AWS Key'
            }
        ],
        vendqs: [
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
        oauthqs: [
            {
                type: 'input',
                name: 'oauth_secret_key',
                message: 'Enter the OAUTH Secret Key  (leave blank if not known)'
            }
        ],
        endqs: [
            {
                type: 'confirm',
                name: 'completion',
                message: 'Are you finished configuring the environment?'
            }
        ],
        workerqs: [
            {
                type: 'input',
                name: 'db_url',
                message: 'enter the DB URL for the worker',
                default: function () {
                    return 'mongodb://warehouse_db_1:27020/warehouse-local';
                }
            },
            {
                type: 'input',
                name: 'cache_url',
                message: 'enter the Cache URL for the worker',
                default: function () {
                    return 'memcache:11211';
                }
            },
            {
                type: 'input',
                name: 'AWS_SQS_URL_2',
                message: 'enter the alternate url for sqs queue for the worker'
            },
            {
                type: 'input',
                name: 'WORKERS_VERSION',
                message: 'enter the workers version for the worker',
                default: function () {
                    return 'v1';
                }
            }
        ],
        terraformqs: [
            {
                type: 'input',
                name: 'aws_iam_access_key',
                message: 'enter the AWS IAM Access Key for the terraform'
            },
            {
                type: 'input',
                name: 'aws_iam_secret_key',
                message: 'enter the AWS IAM Secret Key for the terraform'
            },
            {
                type: 'input',
                name: 'aws_region',
                message: 'enter the AWS Region for the terraform'
            },
            {
                type: 'input',
                name: 'Q',
                message: 'enter the Queue name for the terraform'
            },
            {
                type: 'input',
                name: 'DLQ',
                message: 'enter the DLQ name for the terraform'
            }
        ],
        worker2qs: [
            {
                type: 'input',
                name: 'db_url',
                message: 'enter the DB URL for the worker',
                default:function () {
                    return 'mongodb://warehouse_db_1:27020/warehouse-local';
                }
            },
            {
                type: 'input',
                name: 'cache_url',
                message: 'enter the Cache URL for the worker',
                default: function () {
                    return 'memcache:11211';
                }
            },
            {
                type: 'input',
                name: 'WORKERS_VERSION',
                message: 'enter the workers version for the worker',
                default: function () {
                    return 'v2';
                }
            }
        ]
    };
    return questions;
};

module.exports = {
    getQustions: getQustions
};