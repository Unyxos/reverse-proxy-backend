const subdomains = require('express').Router();

subdomains.get('/', function (req, res) {
    res.send("Subdomains routes")
});

module.exports = subdomains;