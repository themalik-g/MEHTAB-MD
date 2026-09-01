const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');
const { getViewOnceContent } = require('../lib/msgcontent');
const { getOwnerJid } = require('../lib/jids');

const configPath = path.join(__dirname, '../data/antivv.json');

const handledViewOnce = new Set();

function alreadyHandled(id) {
    if (!id) return false;
    if (handledViewOnce.has(id)) return true;
    handledViewOnce.add(id);
    setTimeout(() => handledViewOnce.delete(id), 300000);
    return false;
}

async function toBuffer(stream) {
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

function readConfig() {
    try {
        if (!fs.existsSync(configPath)) {
            return { value: null };
        }
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        return { value: null };
    }
}

function saveConfig(data) {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

function parseJid(text) {
    if (!text) return null;
    const match = text.match(/([0-9]{5,16}|0)(@s\.whatsapp\.net|@g\.us)?/);
    if (!match) return null;
    if (match[2]) return match[0];
    return `${match[1]}@s.whatsapp.net`;
}

async function antiVVCommand(sock, chatId, message, rawMatch = '') {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

    if (!message.key.fromMe && !isOwner) {
        return await sock.sendMessage(chatId, { text: '❌ Only owner/sudo can use anti view once command.' }, { quoted: message });
    }

    const match = rawMatch.trim().replace(/^(on|enable)\b/i, 'g');
    const parts = match.split(/\s+/);
    const dest = parts[0] || '';
    const scope = parts[1]?.toLowerCase() || '';
    const jid = parseJid(dest);
    const isDisable = dest === 'off' || dest === 'false' || dest === 'null';
    const validScopes = ['pm', 'gm', 'no-pm', 'no-gm'];

    if (!dest || (!['p', 'g', 'off', 'false', 'null'].includes(dest) && !jid)) {
        return await sock.sendMessage(chatId, {
            text: `> *Anti View Once Usage Examples:*\n` +
                `- .antivv g - Send VV in same chat\n` +
                `- .antivv p - Send VV to bot/owner chat\n` +
                `- .antivv g pm - Same chat, PMs only\n` +
                `- .antivv g gm - Same chat, groups only\n` +
                `- .antivv p no-gm - To owner, exclude groups\n` +
                `- .antivv <jid> - Send VV to specific JID\n` +
                `- .antivv on - Same as .antivv g\n` +
                `- .antivv off - Disable anti view once\n\n` +
                `*Scopes:* pm, gm, no-pm, no-gm`
        }, { quoted: message });
    }

    if (scope && !validScopes.includes(scope)) {
        return await sock.sendMessage(chatId, {
            text: `❌ *Invalid scope:* ${scope}\n*Valid scopes:* pm, gm, no-pm, no-gm`
        }, { quoted: message });
    }

    if (isDisable) {
        saveConfig({ value: null });
        return await sock.sendMessage(chatId, { text: '_Anti view once has been disabled._' }, { quoted: message });
    }

    saveConfig({ value: match });

    const destText = jid
        ? `_View once messages will be sent to: ${jid}_`
        : dest === 'p'
            ? '_View once messages will be sent to owner/sudo DM._'
            : '_View once messages will be sent to the chat itself._';

    const scopeText = scope
        ? '\n📌 _' + ({
            'pm': 'Only for personal chats',
            'gm': 'Only for group chats',
            'no-pm': 'Excluding personal chats',
            'no-gm': 'Excluding group chats',
        }[scope]) + '_'
        : '';

    await sock.sendMessage(chatId, { text: destText + scopeText }, { quoted: message });
}

async function handleAntiVV(sock, message) {
    try {
        const config = readConfig();
        if (!config || !config.value || config.value === 'null' || config.value === 'false') return;

        const parts = config.value.trim().split(/\s+/);
        const dest = parts[0];
        const scope = parts[1]?.toLowerCase() || '';

        const chatId = message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        // Scope filtering
        if (scope === 'pm' && isGroup) return;
        if (scope === 'gm' && !isGroup) return;
        if (scope === 'no-pm' && !isGroup) return;
        if (scope === 'no-gm' && isGroup) return;

        // Extract viewOnce media from any of its wrappers (plain, ephemeral,
        // v2, v2 extension) or from media flagged with viewOnce directly
        const msgObj = getViewOnceContent(message.message);
        if (!msgObj) return;
        if (alreadyHandled(message.key?.id)) return;

        const imgMsg = msgObj.imageMessage;
        const videoMsg = msgObj.videoMessage;
        const audioMsg = msgObj.audioMessage;

        const targetJid = parseJid(dest) || (dest === 'p' ? getOwnerJid(sock) : chatId);

        const sender = message.key.participant || message.key.remoteJid;
        const senderName = sender.split('@')[0];
        const captionPrefix = `*👁️ ANTIVIEWONCE DETECTED 👁️*\n*From:* @${senderName}\n\n`;

        if (imgMsg) {
            const buffer = await toBuffer(await downloadContentFromMessage(imgMsg, 'image'));
            await sock.sendMessage(targetJid, {
                image: buffer,
                caption: captionPrefix + (imgMsg.caption || ''),
                mentions: [sender]
            });
        } else if (videoMsg) {
            const buffer = await toBuffer(await downloadContentFromMessage(videoMsg, 'video'));
            await sock.sendMessage(targetJid, {
                video: buffer,
                caption: captionPrefix + (videoMsg.caption || ''),
                mentions: [sender]
            });
        } else if (audioMsg) {
            const buffer = await toBuffer(await downloadContentFromMessage(audioMsg, 'audio'));
            await sock.sendMessage(targetJid, {
                text: captionPrefix.trim(),
                mentions: [sender]
            });
            await sock.sendMessage(targetJid, {
                audio: buffer,
                mimetype: audioMsg.mimetype || 'audio/mp4',
                ptt: audioMsg.ptt || false
            });
        }
    } catch (error) {
        console.error('Error in handleAntiVV:', error);
    }
}

module.exports = {
    antiVVCommand,
    handleAntiVV,
    readConfig
};
