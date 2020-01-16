var nodemailer = require('nodemailer');
var aws = require('aws-sdk');
var Promise = require('bluebird');
aws.config.region = 'us-west-2';
var transporter = nodemailer.createTransport({
    SES: new aws.SES({
        apiVersion: '2010-12-01'
    })
});
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});

function sendEmail(emailOptions, options) {
    logger.debug({
        message: 'Will send email with these options',
        emailOptions,
        options,
        functionName: 'sendEmail'
    });
    return new Promise(function (resolve, reject) {
        transporter.sendMail(emailOptions, function (err, success) {
            if (err) {
                logger.error({
                    message: 'Could not send email',
                    err,
                    reason: err,
                    options,
                    functionName: 'sendEmail'
                });
                reject(err);
            }
            else {
                logger.debug({
                    message: 'Email sent successfully',
                    options,
                    functionName: 'sendEmail'
                });
                resolve(success);
            }
        });
    });
}

module.exports = {
    argsForEmail: {
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        from: '',
        text: '',
        html: '',
        attachments: [],
        type: 'email',
        mailer: transporter
    },
    sendEmail: sendEmail
};
