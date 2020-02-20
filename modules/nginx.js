const nginx = require('express').Router();
var fs = require('fs');
var NginxConfFile = require('nginx-conf').NginxConfFile;
const { exec } = require('child_process');

function getAllHttpConfigs(){
    let configs = [];
    fs.readdirSync('/home/data/nginx-configs/http/').forEach(file => {
        configs.push(file);
    });
    return configs;
}

function getAllTcpConfigs(){
    let configs = [];
    fs.readdirSync('/home/data/nginx-configs/tcp/').forEach(file => {
        configs.push(file);
    });
    return configs;
}

nginx.get('/', function (req, res) {
    let httpConfigs = getAllHttpConfigs();
    let jsonReply = {};
    jsonReply[('http')]= [];
    jsonReply['tcp']= [];
    for (let i = 0; i < httpConfigs.length; i++) {
        jsonReply[('http')].push(httpConfigs[i])
    }
    res.status(200).json(jsonReply)
});

nginx.get('/config/:name', function (req, res) {
    let name = req.params.name;
    let httpConfigs = getAllHttpConfigs();
    if (httpConfigs.includes("http-"+name+".conf")){
        NginxConfFile.create('/home/data/nginx-configs/http/http-'+name+'.conf', function(err, conf) {
            if (!err) {
                res.status(200).json({config: conf.nginx._getString()})
            } else {
                res.status(500).json({response: "Internal server error."})
            }
        });
    } else {
        res.status(404).json({response: "No configuration found for " + name});
    }
});

nginx.post('/add_ssl', function (req, res) {
    let {forceSsl, configName, certName} = req.body;
    if (forceSsl !== undefined && configName !== undefined && certName !== undefined){
        let httpConfigs = getAllHttpConfigs();
        if (httpConfigs.includes("http-"+configName+".conf")){
            if (db.get('certs').find({covered_domain: certName}).value() !== undefined){
                let certInfo = db.get('certs').find({covered_domain: certName}).value();
                NginxConfFile.create('/home/data/nginx-configs/http/http-'+configName+'.conf', function(err, conf) {
                    if (!err) {
                        if (forceSsl === 'true'){
                            conf.nginx.server._add('return', '301 https://$server_name$request_uri');
                        }
                        let target = conf.nginx.server.location.proxy_pass._value;

                        conf.nginx._add('server');
                        conf.nginx.server[1]._add('listen', '443 ssl');
                        conf.nginx.server[1]._add('server_name', configName);
                        conf.nginx.server[1]._add('ssl_certificate', '/home/data/certs/' + certInfo['dirName'] + '/fullchain.cer');
                        conf.nginx.server[1]._add('ssl_certificate_key', '/home/data/certs/' + certInfo['dirName'] + '/key.cer');
                        conf.nginx.server[1]._add('ssl_protocols', 'TLSv1 TLSv1.1 TLSv1.2');
                        conf.nginx.server[1]._add('ssl_ciphers', 'EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH');
                        conf.nginx.server[1]._add('access_log', '/var/log/nginx/http-' + configName + '-access.log  main');
                        conf.nginx.server[1]._add('error_log', '/var/log/nginx/http-' + configName + '-error.log');
                        conf.nginx.server[1]._add('location', '/');
                        conf.nginx.server[1].location._add('proxy_pass', target);
                        conf.nginx.server[1].location._add('proxy_buffering', 'off');
                        conf.nginx.server[1].location._add('proxy_set_header', 'Host $host');
                        conf.nginx.server[1].location._add('proxy_set_header', 'X-Forwarded-For $remote_addr');
                        conf.nginx.server[1].location._add('proxy_set_header', 'X-Forwarded-Proto $scheme');
                        conf.nginx.server[1].location._add('proxy_set_header', 'X-Real-IP $remote_addr');

                        conf.flush();
                        exec('nginx -s reload', (err, stdout, stderr) => {
                            res.status(200).json({response: 'Added ' + certName + ' certs to http-'+configName+'.conf and reloaded nginx'})
                        });
                    } else {
                        res.status(500).json({response: "Internal server error."})
                    }
                });
            } else {
                res.status(404).json({response: "No certificate found for " + certName});
            }
        } else {
            res.status(404).json({response: "No configuration found for " + configName});
        }
    } else {
        res.status(400).json({response: "Missing either one or more mandatory parameters."})
    }
});

nginx.post('/new', function (req, res) {
    let {name, target, tcpPort} = req.body;
    if (name !== undefined || target !== undefined){
        fs.writeFileSync('/home/data/nginx-configs/http/http-'+name+'.conf', '', function (err) {
           if (err){
               res.status(500).json({response: "Couldn't create config file."})
           }
        });
        NginxConfFile.create('/home/data/nginx-configs/http/http-'+name+'.conf', function(err, conf) {
            if (!err) {
                conf.nginx._add('server');
                conf.nginx.server._add('listen', '80');
                conf.nginx.server._add('server_name', name);
                conf.nginx.server._add('access_log', '/var/log/nginx/http-' + name + '-access.log  main');
                conf.nginx.server._add('error_log', '/var/log/nginx/http-' + name + '-error.log');
                conf.nginx.server._add('location', '/');
                conf.nginx.server.location._add('proxy_pass', 'http://'+target);
                conf.nginx.server.location._add('proxy_buffering', 'off');
                conf.nginx.server.location._add('proxy_set_header', 'Host $host');
                conf.nginx.server.location._add('proxy_set_header', 'X-Forwarded-For $remote_addr');
                conf.nginx.server.location._add('proxy_set_header', 'X-Forwarded-Proto $scheme');
                conf.nginx.server.location._add('proxy_set_header', 'X-Real-IP $remote_addr');
                conf.flush();
                exec('nginx -s reload', (err, stdout, stderr) => {
                    res.status(200).json({response: 'Created http-'+name+'.conf and reloaded nginx'})
                });
            } else {
                res.status(500).json({response: "Internal server error."})
            }
        });
    } else {
        res.status(400).json({response: "Missing one or more mandatory parameters."});
    }
});

module.exports = nginx;
