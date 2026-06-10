const { Client, GatewayIntentBits, Partials } = require('discord.js');
const CONFIG = require('./config');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message]
});

// Load events
require('./events/ready')(client);
require('./events/messageCreate')(client, CONFIG);
require('./events/interactionCreate')(client, CONFIG);

client.login(CONFIG.token);
