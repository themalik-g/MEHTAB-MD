const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');

const configPath = path.join(__dirname, '../data/antivv.json');

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

    const match = rawMatch.trim();
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

        // Extract viewOnce media from message
        let msgObj = message.message;
        let isViewOnce = false;

        if (msgObj?.viewOnceMessage) {
            msgObj = msgObj.viewOnceMessage.message;
            isViewOnce = true;
        } else if (msgObj?.viewOnceMessageV2) {
            msgObj = msgObj.viewOnceMessageV2.message;
            isViewOnce = true;
        } else if (msgObj?.viewOnceMessageV2Extension) {
            msgObj = msgObj.viewOnceMessageV2Extension.message;
            isViewOnce = true;
        }

        const imgMsg = msgObj?.imageMessage;
        const videoMsg = msgObj?.videoMessage;
        const audioMsg = msgObj?.audioMessage;

        if (imgMsg?.viewOnce || videoMsg?.viewOnce || audioMsg?.viewOnce) {
            isViewOnce = true;
        }

        if (!isViewOnce) return;

        const ownerJid = (sock.user?.id || '').split(':')[0] + '@s.whatsapp.net';
        const targetJid = parseJid(dest) || (dest === 'p' ? ownerJid : chatId);

        const sender = message.key.participant || message.key.remoteJid;
        const senderName = sender.split('@')[0];
        const captionPrefix = `*👁️ ANTIVIEWONCE DETECTED 👁️*\n*From:* @${senderName}\n\n`;

        if (imgMsg) {
            const stream = await downloadContentFromMessage(imgMsg, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            await sock.sendMessage(targetJid, {
                image: buffer,
                caption: captionPrefix + (imgMsg.caption || ''),
                mentions: [sender]
            });
        } else if (videoMsg) {
            const stream = await downloadContentFromMessage(videoMsg, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            await sock.sendMessage(targetJid, {
                video: buffer,
                caption: captionPrefix + (videoMsg.caption || ''),
                mentions: [sender]
            });
        } else if (audioMsg) {
            const stream = await downloadContentFromMessage(audioMsg, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
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
