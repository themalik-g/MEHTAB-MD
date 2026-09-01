const settings = require('../settings');

const CHUNK_SIZE = 3500;

const sections = {
    general: {
        title: '🌐 GENERAL COMMANDS',
        lines: [
            '.help / .menu — Show the full command menu with the bot image.',
            '.learn — Show this text guide. Use `.learn <topic>` or `.learn all`.',
            '.ping — Check the bot speed and response time.',
            '.alive — Check if the bot is running.',
            '.owner — Get the owner contact card.',
            '.tts <text> — Convert your text into a voice note.',
            '.joke — Send a random joke.',
            '.quote — Send a random quote.',
            '.fact — Send a random fact.',
            '.weather <city> — Current weather of a city. Example: .weather Lahore',
            '.news — Latest news headlines.',
            '.attp <text> — Turn text into an animated sticker.',
            '.lyrics <song> — Get the lyrics of a song.',
            '.8ball <question> — Ask the magic 8ball a yes/no question.',
            '.groupinfo — Show information about the current group.',
            '.staff / .admins — List the admins of the group.',
            '.vv / .viewonce — Reply to a view once media to reveal it.',
            '.getpp @user — Get the profile picture of a user.',
            '.trt <text> <lang> — Translate text. Example: .trt hello ur',
            '.ss <link> — Take a screenshot of a website.',
            '.jid — Show the JID (id) of the current chat.',
            '.url — Reply to media to upload it and get a link.',
            '.movie <name> — Movie details + poster from OMDb. Example: .movie Inception',
            '.qr <text> — Generate a QR code from text. Reply to an image with .qr to read a QR code.'
        ]
    },
    admin: {
        title: '👮‍♂️ ADMIN COMMANDS (group admins only)',
        lines: [
            '.ban @user — Ban a user from using the bot.',
            '.unban @user — Remove a ban.',
            '.promote @user — Make a member group admin.',
            '.demote @user — Remove admin from a member.',
            '.kick @user — Remove a member from the group.',
            '.mute <minutes> — Close the group for a number of minutes.',
            '.unmute — Open the group again.',
            '.delete / .del — Reply to a message to delete it.',
            '.warn @user — Give a warning to a user.',
            '.warnings @user — Show how many warnings a user has.',
            '.antilink — Toggle deleting messages that contain links.',
            '.antibadword — Toggle deleting bad words.',
            '.antitag <on/off> — Punish members who tag everyone.',
            '.clear — Clear the chat for the bot.',
            '.tag <message> — Tag all members with your message.',
            '.tagall — Tag every member of the group.',
            '.tagnotadmin — Tag only non admin members.',
            '.hidetag <message> — Send a message that silently notifies everyone.',
            '.chatbot <on/off> — Turn AI auto replies on or off in the group.',
            '.resetlink — Reset the group invite link.',
            '.welcome <on/off> — Welcome message for new members.',
            '.goodbye <on/off> — Goodbye message for leaving members.',
            '.setgdesc <text> — Change the group description.',
            '.setgname <text> — Change the group name.',
            '.setgpp — Reply to an image to set it as the group picture.'
        ]
    },
    owner: {
        title: '🔐 OWNER COMMANDS (owner / sudo only)',
        lines: [
            '.mode <public/private> — Let everyone use the bot, or only you.',
            '.settings — Show the current settings of the bot.',
            '.update — Update the bot to the latest version.',
            '.clearsession — Delete session files.',
            '.cleartmp — Delete temporary files.',
            '.setpp — Reply to an image to change the bot profile picture.',
            '.antidelete <on/off> — Restore messages that someone deletes.',
            '.antidelete to <chat/owner> — Choose where restored messages are sent.',
            '.antiedit <g/p/jid/off> — Show the original text when a message is edited.',
            '.antivv <g/p/jid/off> — Auto reveal view once media.',
            '.autoreact <on/off> — Auto react to messages.',
            '.autostatus <on/off> — Auto view statuses.',
            '.autostatus react <on/off> — Auto react to statuses.',
            '.autostatus emoji <emoji> — Set the status reaction emoji.',
            '.autotyping <on/off> — Show typing before replying.',
            '.autoread <on/off> — Auto read incoming messages.',
            '.anticall <on/off> — Reject incoming calls automatically.',
            '.pmblocker <on/off/status> — Block people who message you in private.',
            '.pmblocker setmsg <text> — Set the message sent before blocking.',
            '.mention <on/off> — Auto reply when someone mentions you.',
            '.setmention — Reply to a message to use it as the mention reply.',
            '.alwaysonline <on/off> — Keep the bot presence always online. Without on/off it toggles.',
            '.getonline — List all known chats and contacts and show which users are online now.',
            '.sudo add/del @user — Manage sudo users.'
        ]
    },
    image: {
        title: '🎨 IMAGE / STICKER COMMANDS',
        lines: [
            '.sticker — Reply to an image or short video to make a sticker.',
            '.simage — Reply to a sticker to turn it back into an image.',
            '.take <packname> — Re-steal a sticker with your own pack name.',
            '.crop — Reply to an image to crop it into a sticker.',
            '.blur — Reply to an image to blur it.',
            '.removebg — Reply to an image to remove the background.',
            '.remini / .enhance / .upscale — Improve the quality of a photo.',
            '.tgsticker <link> — Download a Telegram sticker pack.',
            '.emojimix <emoji1>+<emoji2> — Mix two emojis into a sticker.',
            '.meme — Random meme image.',
            '.igs <link> / .igsc <link> — Instagram story / story caption downloader.'
        ]
    },
    ai: {
        title: '🤖 AI COMMANDS',
        lines: [
            '.gpt <question> — Ask ChatGPT.',
            '.gemini <question> — Ask Gemini.',
            '.imagine <prompt> — Generate an AI image.',
            '.flux <prompt> — Generate an image with the Flux model.',
            '.sora <prompt> — Generate an AI video.'
        ]
    },
    download: {
        title: '📥 DOWNLOADER COMMANDS',
        lines: [
            '.play <song name> — Play a song from YouTube.',
            '.song <song name> — Download a song as audio.',
            '.video <name> / .ytmp4 <link> — Download a YouTube video.',
            '.spotify <query> — Download a track from Spotify.',
            '.instagram <link> — Download an Instagram video.',
            '.facebook <link> — Download a Facebook video.',
            '.tiktok <link> — Download a TikTok video without a watermark.'
        ]
    },
    games: {
        title: '🎮 GAME COMMANDS',
        lines: [
            '.tictactoe @user — Start a tic tac toe game.',
            '.hangman — Start hangman, then guess with .guess <letter>.',
            '.trivia — Start a trivia question, answer with .answer <answer>.',
            '.truth — Random truth question.',
            '.dare — Random dare.'
        ]
    },
    fun: {
        title: '💃 FUN COMMANDS',
        lines: [
            '.compliment @user — Send a compliment.',
            '.insult @user — Send a playful insult.',
            '.flirt — Random flirty line.',
            '.shayari — Random shayari.',
            '.goodnight — Good night message.',
            '.roseday — Rose day message.',
            '.character @user — Guess the character of a user.',
            '.wasted @user — Wasted effect on a profile picture.',
            '.ship @user — Ship two members.',
            '.simp @user — Simp card.',
            '.stupid @user [text] — Stupid meme card.'
        ]
    },
    textmaker: {
        title: '🔤 TEXTMAKER COMMANDS',
        lines: [
            'Usage: <command> <text> — makes a logo image from your text.',
            'Available: .metallic .ice .snow .impressive .matrix .light .neon .devil .purple .thunder .leaves .1917 .arena .hacker .sand .blackpink .glitch .fire',
            'Example: .neon MEHTAB'
        ]
    },
    pies: {
        title: '🖼️ PIES COMMANDS',
        lines: [
            '.pies <country> — Random picture from a country.',
            'Shortcuts: .china .indonesia .japan .korea .hijab .malaysia .thailand'
        ]
    },
    anime: {
        title: '🌸 ANIME COMMANDS',
        lines: [
            'Send the command, optionally tagging a user: .nom .poke .cry .kiss .pat .hug .wink .facepalm'
        ]
    },
    misc: {
        title: '🧩 MISC COMMANDS',
        lines: [
            'Image effect commands, most of them need a reply to an image or some text:',
            '.heart .horny .circle .lgbt .lolice .its-so-stupid .namecard .oogway .tweet .ytcomment .comrade .gay .glass .jail .passed .triggered'
        ]
    },
    github: {
        title: '💻 GITHUB COMMANDS',
        lines: [
            '.git / .github / .sc / .script / .repo — Get the source code repository link.'
        ]
    }
};

const aliases = {
    gen: 'general',
    basic: 'general',
    group: 'admin',
    admins: 'admin',
    own: 'owner',
    sudo: 'owner',
    sticker: 'image',
    stickers: 'image',
    img: 'image',
    dl: 'download',
    downloader: 'download',
    game: 'games',
    text: 'textmaker',
    logo: 'textmaker',
    git: 'github'
};

function renderSection(key) {
    const section = sections[key];
    let text = `*${section.title}*\n\n`;
    section.lines.forEach(line => {
        text += `• ${line}\n`;
    });
    return text;
}

function buildIntro() {
    let text = '┌───────────────────┈⚝\n';
    text += `   *📚 ${settings.botName || 'MEHTAB-MD'} LEARN GUIDE*\n`;
    text += '└───────────────────┈⚝\n\n';
    text += 'Every command starts with a dot `.`\n';
    text += 'Words in <> are what you type yourself, they are not part of the command.\n';
    text += 'Some commands need you to *reply* to an image, sticker or message.\n\n';
    text += '*How to read a command*\n';
    text += '`.movie <name>` → you send: `.movie Titanic`\n';
    text += '`.trt <text> <lang>` → you send: `.trt good morning ur`\n\n';
    text += '*Topics*\n';
    Object.keys(sections).forEach(key => {
        text += `• .learn ${key} — ${sections[key].title}\n`;
    });
    text += '\nSend `.learn all` to get the complete guide.';
    return text;
}

function chunkText(text) {
    const chunks = [];
    let current = '';
    for (const line of text.split('\n')) {
        if ((current + line + '\n').length > CHUNK_SIZE) {
            chunks.push(current.trimEnd());
            current = '';
        }
        current += line + '\n';
    }
    if (current.trim()) chunks.push(current.trimEnd());
    return chunks;
}

async function learnCommand(sock, chatId, message, args) {
    try {
        const topic = (args[0] || '').toLowerCase().replace(/^\./, '');

        if (!topic) {
            await sock.sendMessage(chatId, { text: buildIntro() }, { quoted: message });
            return;
        }

        if (topic === 'all' || topic === 'full') {
            let text = buildIntro() + '\n\n';
            Object.keys(sections).forEach(key => {
                text += '\n' + renderSection(key) + '\n';
            });
            const chunks = chunkText(text);
            for (let i = 0; i < chunks.length; i++) {
                await sock.sendMessage(chatId, {
                    text: `${chunks[i]}\n\n_Part ${i + 1}/${chunks.length}_`
                }, i === 0 ? { quoted: message } : undefined);
            }
            return;
        }

        const key = sections[topic] ? topic : aliases[topic];

        if (!key || !sections[key]) {
            await sock.sendMessage(chatId, {
                text: `❌ Unknown topic "${topic}".\n\nAvailable topics: ${Object.keys(sections).join(', ')}\n\nSend .learn for the guide or .learn all for everything.`
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { text: renderSection(key) }, { quoted: message });

    } catch (error) {
        console.error('Error in learn command:', error);
        await sock.sendMessage(chatId, { text: '❌ Error showing the learn guide.' }, { quoted: message });
    }
}

module.exports = learnCommand;
