require('dotenv').config();
const express = require('express');
const app = express();
const axios = require('axios');
const bodyParser = require('body-parser');
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
global.shortid = require('shortid');

var multer = require('multer');
var upload = multer();

const adapter = new FileSync('db.json');
global.db = lowdb(adapter);

db.defaults({domains: [], subdomains: [], certs: []}).write();

const cfEmail = process.env.CLOUDFLARE_EMAIL;
const cfApiKey = process.env.CLOUDFLARE_API_KEY;

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

const nginxRouter = require('./modules/nginx');
const leRouter = require('./modules/letsencrypt');
const subdomainsRouter = require('./modules/subdomains');
const domainsRouter = require('./modules/domains');

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