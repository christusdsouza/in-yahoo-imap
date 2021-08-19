require('dotenv').config();
const { Client, Intents } = require('discord.js');
const Imap = require('imap');
const inspect = require('util').inspect;
const PORT = process.env.PORT || 3000;
const http = require("http");
http.createServer().listen(port);

let Intent;
const urls = {
    yahoo: { link: 'https://mail.yahoo.com', img: 'https://s.yimg.com/nq/nr/img/yahoo_mail_global_english_white_1x.png', favicon: 'https://s.yimg.com/nq/nr/img/home_screen_3g_ios_180_MF0E6doar5WJzwy5qgOtSloojsjYXtcEkIOV4lizxsU_v1.png' },
    outlook: { link: 'https://outlook.live.com', img: 'https://outlook-1.cdn.office.net/assets/mail/pwa/v1/pngs/apple-touch-icon.png', favicon: 'https://outlook-1.cdn.office.net/assets/mail/pwa/v1/pngs/apple-touch-icon.png' },
    gmail: 'https://mail.google.com'
};
const bot = new Client({ intents: Intent = ["GUILDS", "GUILD_MESSAGES"] });
bot.login(process.env.token);
bot.on('ready', client => {
    // console.log(client.guilds.cache.every(
    //     guild => {
    //         console.log(guild.channels.cache.every(
    //             channel => {
    //                 // if(channel.type==="GUILD_TEXT")
    //                     console.log(channel);  
    //             })
    //         )
    //     })
    // );
    client.user.setStatus('online');
    console.log(new Date().toLocaleString());
    console.log(`Loaded with intents: ${Intent.join(" ")}`);
    console.log(`Missing Intents: ${Object.keys(Intents.FLAGS).filter(val => !Intent.includes(val)).join("  ")}`);
});

bot.on('messageCreate', message => {
    if(message.content.startsWith(`\`ping`) || message.mentions.has(bot.user.id)) message.channel.send({content: bot.ws.ping.toString()});
})

const imap = new Imap({
    user: process.env.user,
    password: process.env.password,
    host: process.env.host,
    port: process.env.port,
    tls: process.env.tls
});

function openInbox(callback) {
    imap.openBox('INBOX', true, callback);
}

// Send the newest message to discord
function sendNewest(where) {
    openInbox(function (err, box) {
        if (err) throw err;
        if (where === 'onready') return;

        const fetch = imap.seq.fetch(box.messages.total + ':*', {
            // id: 1,
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', '1'],
            struct: true
        });

        let buffer = '', count = 0;
        // let prefix = `(#${index}) `;
        fetch.on('message', (message, index) => {
            message.on('body', (stream, info) => {

                stream.on('data', function (chunk) {
                    count += chunk.length;
                    buffer += chunk.toString('utf8');
                    // console.log(prefix + 'Body [%s] (%d/%d)', inspect(info.which), count, info.size);
                });

                stream.once('end', function () {
                });

            });
        });

        fetch.once('error', function (err) {
            console.log('Fetch error: ' + err);
            imap.end();
        });

        fetch.once('end', function () {
            if (buffer === '') return;
            // console.log(buffer + '\n--------------------');

            let channel = bot.channels.cache.get(process.env.channel);
            if(!bot.channels.cache.get(process.env.channel)) {
                bot.user.setStatus('dnd');
                throw 'Restart !!!';
            } // announcments channel
            let from = buffer.match(/(?<=From: ).*/gm).shift();
            let subject = buffer.match(/(?<=Subject: ).*/gm).shift();
            let mailstamp = buffer.match(/(?<=Date: ).*/gm).shift();
            let body = (tbody = buffer.match(/^(?!\w+: ).*/gm).join('\n')).length > 4096 ? '***Body size exceeds character limit!!!***' : tbody;

            channel.send({
                embeds: [{
                    color: '#' + Math.random().toString(16).substr(2, 6),
                    url: urls.yahoo.link,
                    thumbnail: { url: urls.yahoo.img, },
                    author: { name: from },
                    title: subject,
                    description: body,
                    footer: { text: mailstamp, icon_url: urls.yahoo.favicon },
                    timestamp: new Date()
                }]
            }).catch(err => console.log(err));
            console.log('Done fetching all messages!');
        });
    });

}

imap.on('ready', () => sendNewest('onready'));
imap.on('mail', () => sendNewest('onmail'));
imap.connect();