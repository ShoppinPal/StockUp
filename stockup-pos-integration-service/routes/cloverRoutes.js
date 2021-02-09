const router = require('express').Router();

router
    .get('/integrations', (req, res) => {
        req.app.models.UserModel.find({
            limit: 1
        }, (err, list) => {
            res.json(list);
        });
    });

module.exports = router;
