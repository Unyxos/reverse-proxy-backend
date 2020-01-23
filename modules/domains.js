const domains = require('express').Router();

domains.get('/', function (req, res) {
    let domainsList = db.get('domains').value();
    let jsonReply = {};
    let key = "domains";
    jsonReply[key] = [];
    for (let i = 0; i < domainsList.length; i++) {
        jsonReply[key].push({id: domainsList[i]['id'], domain: domainsList[i]['domain']});
    }
    res.json(jsonReply);
});

domains.post('/refresh', function (req, res) {
    cfInstance.get("https://api.cloudflare.com/client/v4/zones").then(function (response) {
        let domains = [];
        for (let i = 0; i < response['data']['result'].length; i++) {
            domains[i] = response['data']['result'][i]['name'];
            if (db.get('domains').find({domain : response['data']['result'][i]['name']}).value() === undefined){
                db.get('domains').push({id: shortid.generate(), domain : response['data']['result'][i]['name'], domain_id: response['data']['result'][i]['id']}).write();
            }
        }
        res.json({domains: domains});
    });
});

module.exports = domains;