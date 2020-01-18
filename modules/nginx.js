const nginx = require('express').Router();

nginx.get('/', function (req, res) {
    res.send("Nginx routes")
});

module.exports = nginx;