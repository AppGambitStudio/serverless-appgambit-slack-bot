const 
serverless  = require('serverless-http'),
express     = require('express'),
bodyParser  = require('body-parser'),
config      = require('./config/' + process.env.STAGE + '.json'),
holidays    = require('./data/holidays.json'),
commands    = require('./data/commands.json'),
_           = require('lodash'),
crypto      = require('crypto');

const app         = express();

app.use( ( req, res, next) => {
    var data = '';
    req.on('data', function(chunk) { 
        data += chunk;
    });
    req.on('end', function() {
        req.rawBody = data;
    });
    next();
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use( (req, res, next) => {
    const timestamp = req.headers['x-slack-request-timestamp'];
    const sig_basestring = 'v0:' + timestamp + ':' + req.rawBody;
    const req_signature = 'v0=' + crypto.createHmac(
        "sha256", 
        config.slack_signing_secret
    ).update(sig_basestring).digest("hex");
    
    const slack_signature = req.headers['x-slack-signature'];

    if(req_signature !== slack_signature){
        res.send(400);
    }else{
        next();
    }
});

const holidayRes = {
    "response_type": "ephemeral",
    "text": "2019 Holiday Calendar",
    "attachments": _.map(holidays.data, d => { 
        return {"text" : d.date + " : " + d.title};
    })
};

const helpRes = {
    "response_type": "ephemeral",
    "text": "Please use one of these commands.",
    "attachments": _.map(commands.data, c => {
        return {"text": c.command}
    })
};

app.post('/', (req, res) => {
    const { text } = req.body;

    let resData = {};
    if(text == 'holidays'){
        resData = holidayRes
    }else{
        resData = helpRes
    }

    res.send(resData);
});

module.exports.handler = serverless(app);