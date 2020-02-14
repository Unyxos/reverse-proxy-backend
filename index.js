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
const morgan = require("morgan");
let rfs = require('rotating-file-stream');
const compression = require("compression");

let mandatoryDirs = ['data', 'data/logs', 'data/certs', 'data/nginx-configs', 'data/nginx-configs/http', 'data/nginx-configs/tcp'];
let logDirectory = '/home/data/logs';

let accessLogStream = rfs.createStream('api-access.log', {
    interval: '7d',
    path: logDirectory,
    compress: "gzip"
});

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
global.leServer = process.env.LE_Server;

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

app.use(morgan('common', { stream: accessLogStream }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(upload.array());
app.use(compression());

app.get('/', function (req, res){
    res.json({status: 1})
});

app.use('/api/nginx', nginxRouter);
app.use('/api/certs', leRouter);
app.use('/api/subdomains', subdomainsRouter);
app.use('/api/domains', domainsRouter);

app.listen(3000);