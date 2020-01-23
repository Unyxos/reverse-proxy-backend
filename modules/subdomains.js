const subdomains = require('express').Router();

subdomains.get('/', function (req, res) {
    res.sendStatus(200);
});

subdomains.post('/refresh', function (req, res) {
    let domains = db.get('domains').value();
    for (let i = 0; i < domains.length; i++) {
        cfInstance.get("https://api.cloudflare.com/client/v4/zones/"+domains[i]['domain_id']+"/dns_records").then(function (response) {
            response = response['data']['result'];
            for (let j = 0; j < response.length; j++) {
                if (db.get('subdomains').find({subdomain : response[j]['name']}).value() === undefined && response[j]['type'] === "A" || response[j]['type'] === "CNAME"){
                    db.get('subdomains').push({
                            id: shortid.generate(),
                            subdomain: response[j]['name'],
                            subdomain_id: response[j]['id'],
                            parent_domain_id: domains[i]["id"],
                            target: response[j]["content"],
                            type: response[j]["type"],
                            ignored: 0
                        }).write();
                }
            }
        })
    }
    res.sendStatus(200)
});

module.exports = subdomains;