const subdomains = require('express').Router();

subdomains.get('/', function (req, res) {
    res.sendStatus(200);
});

subdomains.post('/refresh', function (req, res) {

});

module.exports = subdomains;