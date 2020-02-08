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
    res.status(200).send("OK")
});

nginx.get('/config', function (req, res) {
    let httpConfigs = getAllHttpConfigs();
    console.log(httpConfigs);
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
                console.log(err);
                res.status(500).json({response: "Internal server error."})
            }
        });
    } else {
        res.status(404).json({response: "No configuration found for " + name});
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
                conf.nginx.server._add('location', '/');
                conf.nginx.server.location._add('proxy_pass', 'http://'+target);
                conf.flush();
                exec('nginx -s reload', (err, stdout, stderr) => {
                    res.status(200).json({response: 'Created http-'+name+'.conf and reloaded nginx'})
                });
            } else {
                console.log(err);
                res.status(500).json({response: "Internal server error."})
            }
        });
    } else {
        res.status(400).json({response: "Missing one or more mandatory parameters."});
    }
});

module.exports = nginx;