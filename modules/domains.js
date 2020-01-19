const domains = require('express').Router();

domains.get('/', function (req, res) {
    cfInstance.get("https://api.cloudflare.com/client/v4/zones").then(function (response) {
        let domains = [];
        for (let i = 0; i < response['data']['result'].length; i++) {
            domains[i] = response['data']['result'][i]['name'];
        }
        res.json({domains: domains})
    });
});

module.exports = domains;