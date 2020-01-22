const domains = require('express').Router();

domains.get('/', function (req, res) {
    res.sendStatus(200);
});

domains.post('/refresh', function (req, res) {
    cfInstance.get("https://api.cloudflare.com/client/v4/zones").then(function (response) {
        let domains = [];
        let currentCount = db.get('domains').size().value();
        for (let i = 0; i < response['data']['result'].length; i++) {
            domains[i] = response['data']['result'][i]['name'];
            if (db.get('domains').find({domain : response['data']['result'][i]['name']}).value() === undefined){
                db.get('domains').push({id: shortid.generate(), domain : response['data']['result'][i]['name'], domain_id: response['data']['result'][i]['id']}).write();
            }
        }
        res.json({domains: domains})
    });
});

module.exports = domains;