const letsencrypt = require('express').Router();
const { exec } = require('child_process');
const fs = require('fs');
const { Certificate, PrivateKey } = require('@fidm/x509')

var rmDir = function(dir, rmSelf) {
    var files;
    rmSelf = (rmSelf === undefined) ? true : rmSelf;
    dir = dir + "/";
    try { files = fs.readdirSync(dir); } catch (e) { console.log("!Oops, directory not exist."); return; }
    if (files.length > 0) {
        files.forEach(function(x, i) {
            if (fs.statSync(dir + x).isDirectory()) {
                rmDir(dir + x);
            } else {
                fs.unlinkSync(dir + x);
            }
        });
    }
    if (rmSelf) {
        // check if user want to delete the directory ir just the files in this directory
        fs.rmdirSync(dir);
    }
}

letsencrypt.get('/', function (req, res) {
    //const cert = Certificate.fromPEM(fs.readFileSync('/home/data/certs/shiba.wtf/cert.cer'));
    res.sendStatus(200)
});

letsencrypt.post('/new', function (req, res) {
    let {domain} = req.body;
    let splittedDomain = domain.split('.');
    if (db.get('domains').find({domain : (splittedDomain[splittedDomain.length-2]+"."+splittedDomain[splittedDomain.length-1])}).value() !== undefined){
        let dirName;
        if (domain.charAt(0) === "*") {
            dirName = "_"+domain.substr(2);
        } else {
                dirName = domain;
        }
        if (!fs.existsSync('/home/data/certs/'+dirName)){
            fs.mkdirSync('/home/data/certs/'+dirName);
            exec('acme.sh --force --issue --staging --dns dns_cf --standalone -d ' + domain + ' --cert-file /home/data/certs/' + dirName + '/cert.cer --key-file /home/data/certs/' + dirName + '/key.cer --ca-file /home/data/certs/' + dirName + '/ca.cer --fullchain-file /home/data/certs/' + dirName + '/fullchain.cer', (err, stdout, stderr) => {
                console.log(fs.readdirSync('/home/data/certs/'+dirName));
                if (fs.readdirSync('/home/data/certs/'+dirName) !== 0) {
                    if (db.get('certs').find({covered_domain : domain}).value() !== undefined){
                        db.get('certs').remove({covered_domain : domain}).write();
                    }
                    let parentDomainId = db.get('domains').find({domain : (splittedDomain[splittedDomain.length-2]+"."+splittedDomain[splittedDomain.length-1])}).value()['id'];
                    let cert = Certificate.fromPEM(fs.readFileSync('/home/data/certs/' + dirName + '/cert.cer'));
                    db.get('certs').push({
                        id: shortid(),
                        parentDomainId : parentDomainId,
                        dirName : dirName,
                        covered_domain : domain,
                        validFrom: Date.parse(cert['validFrom']),
                        validTo: Date.parse(cert['validTo'])
                    }).write();
                    res.status(200).json({response: "Successfully created certificate for " + domain});
                } else {
                    res.status(500).json({response : "An error occured, please try again"});
                }
            });
        } else {
            rmDir('/home/data/certs/'+dirName);
            res.status(500).json({response : "Could not generate certificate for " + domain + ", please try again"});
        }
    } else {
        res.status(500).json({response : "Can't generate certificate for non owned domains."});
    }
});

module.exports = letsencrypt;