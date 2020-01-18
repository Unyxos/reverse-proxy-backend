const le = require('express').Router();

le.get('/', function (req, res) {
    res.send("Let's Encrypt routes")
});

module.exports = le;