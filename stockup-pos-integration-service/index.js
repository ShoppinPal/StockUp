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

app.use('/clover', cloverRoutes);


/**
 * 404 error handler
 */
app.use((req, res, next) => {
    let statusCode = 404;
    let errorMessage = "Not Found";
    res.status(statusCode).send(errorMessage);
});


/**
 * Global error handler
 */
app.use((err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let errorMessage = err.message || 'Something unexpected happened';
    res.status(statusCode).send(errorMessage);
});

app.listen(3002, () => {
    logger.debug({
        message:'Listening to port 3002',
    });
});
