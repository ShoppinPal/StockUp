"use strict";

const router = require('express').Router();

router
    .post('/categories', function (req, res) {
        res.json({ success: true });
        const body = req.body;
        req.app.models.CategoryModel.upsertWithWhere()

    });

module.exports = router;
