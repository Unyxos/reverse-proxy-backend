const express = require('express');
const app = express();
const nginxRouter = require('./modules/nginx');

app.get('/', function (req, res){
    res.send("Hello World!")
});

app.use('/nginx', nginxRouter);

app.listen(3000);