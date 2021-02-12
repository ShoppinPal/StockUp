"use strict";
const Slack = require('slack-node');
const logger = require('sp-json-logger')({fileName: 'common:utils:slack'});

function sendOrgSignupAlert(data) {
    var title = 'Signup Alert';
    var message = Object.keys(data)
        .map(function (key) {
            return ` ${key}: ${data[key]}`;
        })
        .join('\n');

    logger.debug({
        title: title,
        value: message,
        message: 'debug slack message content',
        functionName: 'sendOrgSignupAlert'
    });

    var color = 'good';
    var webhookUri = process.env.SLACK_NOTIFICATION_URL;
    var slack = new Slack();
    slack.setWebhook(webhookUri);
    var emoji = ':white_check_mark:';
    slack.webhook({
        username: 'StockUp - ' + process.env.NODE_ENV,
        icon_emoji: emoji,
        attachments: [
            {
                color: color,
                fields: [
                    {
                        title: title,
                        value: message
                    }
                ]
            }
        ],
    }, function (err, response) {
        if (err) {
            logger.error({
                err: err,
                message: 'Error in SlackMessaging',
                functionName: 'sendOrgSignupAlert'
            });
        }else {
            logger.debug({
                response,
                message: 'SlackMessaging',
                functionName: 'sendOrgSignupAlert'
            });
        }
    });
}

module.exports = {
    sendOrgSignupAlert
};
