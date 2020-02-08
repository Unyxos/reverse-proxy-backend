require('dotenv').config();
const express = require('express');
const app = express();
const axios = require('axios');
const bodyParser = require('body-parser');
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
global.shortid = require('shortid');
const multer = require('multer');
const upload = multer();
const fs = require('fs');

let mandatoryDirs = ['data', 'data/certs', 'data/nginx-configs', 'data/nginx-configs/http', 'data/nginx-configs/tcp'];
for (let i = 0; i < mandatoryDirs.length; i++) {
    if (!fs.existsSync('/home/'+mandatoryDirs[i])){
        fs.mkdirSync('/home/'+mandatoryDirs[i]);
    }
}
const adapter = new FileSync('/home/data/db.json');
global.db = lowdb(adapter);

db.defaults({domains: [], subdomains: [], certs: []}).write();

const cfEmail = process.env.CF_Email;
const cfApiKey = process.env.CF_Key;

global.cfInstance = axios.create({
    headers : {
        post: {
            "X-Auth-Email" : cfEmail,
            "X-Auth-Key" : cfApiKey
        },
        get: {
            "X-Auth-Email" : cfEmail,
            "X-Auth-Key" : cfApiKey
        }
    }
});

const nginxRouter = require('/home/modules/nginx');
const leRouter = require('/home/modules/letsencrypt');
const subdomainsRouter = require('/home/modules/subdomains');
const domainsRouter = require('/home/modules/domains');

const getDurationInMilliseconds = (start) => {
    const NS_PER_SEC = 1e9;
    const NS_TO_MS = 1e6;
    const diff = process.hrtime(start);

    return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
};

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({extended: true}));
app.use(upload.array());

app.use((req, res, next) => {
    const start = process.hrtime();
    res.on('finish', () => {
        const durationInMilliseconds = getDurationInMilliseconds (start);
        console.log(`${req.ip} -> [${req.method}] ${res.statusCode} ${req.originalUrl} ${durationInMilliseconds .toLocaleString()} ms`);
    });
    next();
});

app.get('/', function (req, res){
    res.json({status: 1})
});

app.use('/api/nginx', nginxRouter);
app.use('/api/certs', leRouter);
app.use('/api/subdomains', subdomainsRouter);
app.use('/api/domains', domainsRouter);

app.listen(3000);