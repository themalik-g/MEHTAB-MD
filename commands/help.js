const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const helpMessage = `
┌───────────────────┈⚝
   *🤖 ${settings.botName || 'MEHTAB-MD'}*
   Version: *${settings.version || '3.0.0'}*
   by ${settings.botOwner || 'MALIK MEHTAB'}
   YT : ${global.ytch}
└───────────────────┈⚝

*AVAILABLE COMMANDS*

┌── ❮ 🌐 ɢᴇɴᴇʀᴀʟ ᴄᴏᴍᴍᴀɴᴅꜱ ❯
│
│ ◈ .help or .menu
│ ◈ .learn <topic/all>
│ ◈ .ping
│ ◈ .alive
│ ◈ .tts <text>
│ ◈ .owner
│ ◈ .joke
│ ◈ .quote
│ ◈ .fact
│ ◈ .weather <city>
│ ◈ .news
│ ◈ .attp <text>
│ ◈ .lyrics <song_title>
│ ◈ .8ball <question>
│ ◈ .groupinfo
│ ◈ .staff or .admins
│ ◈ .vv or .viewonce
│ ◈ .getpp @user
│ ◈ .trt <text> <lang>
│ ◈ .ss <link>
│ ◈ .jid
│ ◈ .url
│ ◈ .movie <name>
│ ◈ .qr <text/reply to img>
│
└───────────────────┈⚝

┌──❮ 👮‍♂️ ᴀᴅᴍɪɴ ᴄᴏᴍᴍᴀɴᴅꜱ ❯
│
│ ◈ .ban @user
│ ◈ .promote @user
│ ◈ .demote @user
│ ◈ .mute <minutes>
│ ◈ .unmute
│ ◈ .delete or .del
│ ◈ .kick @user
│ ◈ .warnings @user
│ ◈ .warn @user
│ ◈ .antilink
│ ◈ .antibadword
│ ◈ .clear
│ ◈ .tag <message>
│ ◈ .tagall
│ ◈ .tagnotadmin
│ ◈ .hidetag <message>
│ ◈ .chatbot
│ ◈ .resetlink
│ ◈ .antitag <on/off>
│ ◈ .welcome <on/off>
│ ◈ .goodbye <on/off>
│ ◈ .setgdesc <description>
│ ◈ .setgname <new name>
│ ◈ .setgpp (reply to image)
│
└───────────────────┈⚝

┌──❮ 🔐 ᴏᴡɴᴇʀ ᴄᴏᴍᴍᴀɴᴅꜱ ❯
│
│ ◈ .mode <public/private>
│ ◈ .clearsession
│ ◈ .antidelete <on/off/>
│ ◈ .antidelete to <chat/owner>
│ ◈ .antiedit <g/p/jid/off> [scope]
│ ◈ .antivv <g/p/jid/off> [scope]
│ ◈ .cleartmp
│ ◈ .update
│ ◈ .update now (full resync)
│ ◈ .save (reply to a status)
│ ◈ .readstatus [emoji]
│ ◈ .settings
│ ◈ .setpp <reply to image>
│ ◈ .autoreact <on/off>
│ ◈ .autostatus <on/off>
│ ◈ .autostatus react <on/off>
│ ◈ .autostatus emoji <emoji>
│ ◈ .autotyping <on/off>
│ ◈ .autoread <on/off>
│ ◈ .anticall <on/off>
│ ◈ .pmblocker <on/off/status>
│ ◈ .pmblocker setmsg <text>
│ ◈ .setmention <reply to msg>
│ ◈ .mention <on/off>
│ ◈ .alwaysonline <on/off>
│ ◈ .getonline
│
└───────────────────┈⚝

┌──❮ 🎨 ɪᴍᴀɢᴇ / ꜱᴛɪᴄᴋᴇʀ ❯
│
│ ◈ .blur <image>
│ ◈ .simage <reply to sticker>
│ ◈ .sticker <reply to image>
│ ◈ .removebg
│ ◈ .remini
│ ◈ .crop <reply to image>
│ ◈ .tgsticker <Link>
│ ◈ .meme
│ ◈ .take <packname>
│ ◈ .emojimix <emj1>+<emj2>
│ ◈ .igs <insta link>
│ ◈ .igsc <insta link>
│
└───────────────────┈⚝

┌──❮ 🖼️ ᴘɪᴇꜱ ᴄᴏᴍᴍᴀɴᴅꜱ ❯
│
│ ◈ .pies <country>
│ ◈ .china
│ ◈ .indonesia
│ ◈ .japan
│ ◈ .korea
│ ◈ .hijab
│
└───────────────────┈⚝

┌──❮ 🎮 ɢᴀᴍᴇ ᴄᴏᴍᴍᴀɴᴅꜱ ❯
│
│ ◈ .tictactoe @user
│ ◈ .hangman
│ ◈ .guess <letter>
│ ◈ .trivia
│ ◈ .answer <answer>
│ ◈ .truth
│ ◈ .dare
│
└───────────────────┈⚝

┌──❮ 🤖 ᴀɪ ᴄᴏᴍᴍᴀɴᴅꜱ ❯
│
│ ◈ .gpt <question>
│ ◈ .gemini <question>
│ ◈ .imagine <prompt>
│ ◈ .flux <prompt>
│ ◈ .sora <prompt>
│
└───────────────────┈⚝

┌──❮ 💃 ꜰᴜɴ ᴄᴏᴍᴍᴀɴᴅꜱ ❯
│
│ ◈ .compliment @user
│ ◈ .insult @user
│ ◈ .flirt
│ ◈ .shayari
│ ◈ .goodnight
│ ◈ .roseday
│ ◈ .character @user
│ ◈ .wasted @user
│ ◈ .ship @user
│ ◈ .simp @user
│ ◈ .stupid @user [text]
│
└───────────────────┈⚝

┌──❮ 🔤 ᴛᴇXᴛᴍᴀᴋᴇʀ 🔢 ❯
│
│ ◈ .metallic <text>
│ ◈ .ice <text>
│ ◈ .snow <text>
│ ◈ .impressive <text>
│ ◈ .matrix <text>
│ ◈ .light <text>
│ ◈ .neon <text>
│ ◈ .devil <text>
│ ◈ .purple <text>
│ ◈ .thunder <text>
│ ◈ .leaves <text>
│ ◈ .1917 <text>
│ ◈ .arena <text>
│ ◈ .hacker <text>
│ ◈ .sand <text>
│ ◈ .blackpink <text>
│ ◈ .glitch <text>
│ ◈ .fire <text>
│
└───────────────────┈⚝

┌──❮ 📥 ᴅᴏᴡɴʟᴏᴀᴅᴇʀ ❯
│
│ ◈ .play <song_name>
│ ◈ .song <song_name>
│ ◈ .spotify <query>
│ ◈ .instagram <link>
│ ◈ .facebook <link>
│ ◈ .tiktok <link>
│ ◈ .video <song name>
│ ◈ .ytmp4 <Link>
│
└───────────────────┈⚝

┌──❮ 🧩 ᴍɪꜱᴄ ᴄᴏᴍᴍᴀɴᴅꜱ ❯
│
│ ◈ .heart
│ ◈ .horny
│ ◈ .circle
│ ◈ .lgbt
│ ◈ .lolice
│ ◈ .its-so-stupid
│ ◈ .namecard
│ ◈ .oogway
│ ◈ .tweet
│ ◈ .ytcomment
│ ◈ .comrade
│ ◈ .gay
│ ◈ .glass
│ ◈ .jail
│ ◈ .passed
│ ◈ .triggered
│
└───────────────────┈⚝

┌──❮ 🌸 ᴀɴɪᴍᴇ ᴄᴏᴍᴍᴀɴᴅꜱ ❯
│
│ ◈ .nom
│ ◈ .poke
│ ◈ .cry
│ ◈ .kiss
│ ◈ .pat
│ ◈ .hug
│ ◈ .wink
│ ◈ .facepalm
│
└───────────────────┈⚝

┌──❮ 💻 ɢɪᴛʜᴜʙ ᴄᴏᴍᴍᴀɴᴅꜱ ❯
│
│ ◈ .git
│ ◈ .github
│ ◈ .sc
│ ◈ .script
│ ◈ .repo
│
└───────────────────┈⚝
Join our channel for updates:`;

    try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: helpMessage,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363409689492071@newsletter',
                        newsletterName: 'MEHTAB-MD',
                        serverMessageId: -1
                    }
                }
            },{ quoted: message });
        } else {
            console.error('Bot image not found at:', imagePath);
            await sock.sendMessage(chatId, { 
                text: helpMessage,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363409689492071@newsletter',
                        newsletterName: 'MEHTAB-MD by MALIK MEHTAB',
                        serverMessageId: -1
                    } 
                }
            });
        }
    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: helpMessage });
    }
}

module.exports = helpCommand;
