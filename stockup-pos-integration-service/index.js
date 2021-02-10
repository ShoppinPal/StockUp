"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const logger = require('sp-json-logger')({fileName: 'pos:index'});
const models = require('./models');
const cloverRoutes = require('./routes/cloverRoutes');
const app = express();

app.use(bodyParser());
app.models = models;

app.use((req, res, next) => {
    logger.info({message: 'request'});
    next();
});


app.get('/health-check', function (req,res) {
    res.status(200).send('OK');
});

app.use('/webhooks', cloverRoutes);


/**
 * 404 error handler
 */
app.use((req, res, _) => {
    let statusCode = 404;
    let errorMessage = "Not Found";
    res.status(statusCode).send(errorMessage);
});


/**
 * Global error handler
 */
app.use((err, req, res, _) => {
    let statusCode = err.statusCode || 500;
    let errorMessage = err.message || 'Something unexpected happened';
    res.status(statusCode).send(errorMessage);
});

app.listen(process.env.POS_SERVICE_PORT, () => {
    logger.debug({
        message:'Listening to port' + process.env.POS_SERVICE_PORT,
    });
});
