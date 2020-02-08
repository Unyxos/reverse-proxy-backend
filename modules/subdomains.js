const subdomains = require('express').Router();

function refreshSubdomains(){
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
}

subdomains.get('/', function (req, res) {
    let domainsList = db.get('domains').value();
    let jsonReply = {};
    for (let i = 0; i < domainsList.length; i++) {
        let domainId = domainsList[i]['id'];
        jsonReply[domainsList[i]['domain']] = [];
        let subdomains = db.get('subdomains').filter({parent_domain_id: domainId}).value();
        for (let j = 0; j < subdomains.length; j++) {
            jsonReply[domainsList[i]['domain']].push({id: subdomains[j]['id'], subdomain : subdomains[j]['subdomain'], target: subdomains[j]['target'], type: subdomains[j]['type']})
        }
    }
    res.json(jsonReply);
});

subdomains.get('/list/:domain', function (req, res) {
    if (db.get('domains').find({domain: req.params.domain}).value() !== undefined){
        let jsonReply = {}, domainId = db.get('domains').find({domain: req.params.domain}).value()['id'];
        jsonReply["subdomains"] = [];
        let subdomains = db.get('subdomains').filter({parent_domain_id: domainId}).value();
        for (let i = 0; i < subdomains.length; i++) {
            jsonReply["subdomains"].push({id: subdomains[i]['id'], subdomain: subdomains[i]['subdomain'], target: subdomains[i]['target'], type: subdomains[i]['type'], ignored: subdomains[i]['ignored']});
        }
        res.status(200).json(jsonReply);
    } else {
        res.status(404).json({response: "Unknown domain."});
    }
});

subdomains.post('/refresh', function (req, res) {
    refreshSubdomains();
    res.sendStatus(200)
});

subdomains.post('/new', function (req, res) {
    let name = req.body.name, target = req.body.target, type = req.body.type;
    if (name !== undefined || target !== undefined || type !== undefined){
        if (db.get('subdomains').find({subdomain: name, }).value() === undefined){
            let domainSplit = name.split("."), domainName = (domainSplit[domainSplit.length-2]+"."+domainSplit[(domainSplit.length-1)]);
            if (db.get('domains').find({domain: domainName}).value() !== undefined){
                let zoneId = db.get('domains').find({domain: domainName}).value()['domain_id'];
                cfInstance.post("https://api.cloudflare.com/client/v4/zones/"+zoneId+"/dns_records", {
                    type: type,
                    name: name,
                    content: target
                }).then(function (response) {
                    refreshSubdomains();
                });
                res.status(200).json({response: "Subdomain added"});
            } else {
                res.status(400).json({response: "Unknown domain name."});
            }
        } else {
            res.status(400).json({response: "Subdomain already existing."});
        }
    } else {
        res.status(400).json({response: "Missing one or more mandatory parameters."});
    }
});

module.exports = subdomains;