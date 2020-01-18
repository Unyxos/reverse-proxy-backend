const nginx = require('express').Router();

nginx.get('/', function (req, res, next) {
    res.send("Nginx routes")
});

module.exports = nginx;