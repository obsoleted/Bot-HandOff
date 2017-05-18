import * as express from 'express';
import * as builder from 'botbuilder';
import * as bodyParser from 'body-parser';
import { Handoff } from './handoff';
import { commandsMiddleware } from './commands';

import { MongooseProvider } from './mongoose-provider';
//=========================================================
// Bot Setup
//=========================================================

const app = express();
const mongoseProvider = new MongooseProvider()
// Setup Express Server
app.listen(process.env.port || process.env.PORT || 3978, '::', () => {
    console.log('Server Up');
});
// Create chat bot
const connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

const bot = new builder.UniversalBot(connector, [
    function (session, args, next) {
        session.endConversation('Echo ' + session.message.text);
    }
]);
// parse application/json
app.use(bodyParser.json());
app.get('/api/conversations', async (req, res) => {
    const authHeader = req.headers['authorization'];
    console.log(authHeader);
    console.log(req.headers);
    if(authHeader) {
        if(authHeader === 'Bearer ' + process.env.MICROSOFT_APP_PASSWORD) {
            let conversations = await mongoseProvider.getCurrentConversations()
            res.status(200).send(conversations);
        }
    }
    res.status(401).send('Not Authorized');
});

app.post('/api/conversations', async (req, res) => {
    const authHeader = req.headers['authorization'];
    console.log(authHeader);
    console.log(req.headers);
    if(authHeader) {
        if(authHeader === 'Bearer ' + process.env.MICROSOFT_APP_PASSWORD) {
            if (await handoff.tweakConvo(req.body.conversationId)) {
                res.status(200).send("Ok");
            } else {
                res.status(400).send("Meh");
            }
        }
    }
    res.status(401).send('Not Authorized');
});

app.post('/api/messages', connector.listen());

// Create endpoint for agent / call center
app.use('/webchat', express.static('public'));

// replace this function with custom login/verification for agents
const isAgent = (session: builder.Session) =>
    session.message.user.name.startsWith("Agent");

const handoff = new Handoff(bot, isAgent);

//========================================================
// Bot Middleware
//========================================================
bot.use(
    commandsMiddleware(handoff),
    handoff.routingMiddleware(),
    /* other bot middlware should probably go here */
);

