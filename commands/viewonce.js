const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage, downloadMediaMessage } = require('@whiskeysockets/baileys');

const configPath = path.join(__dirname, '../data/antiviewonce.json');

function readConfig() {
    try {
        if (!fs.existsSync(configPath)) {
            const defaultConfig = { enabled: true };
            fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        return { enabled: true };
    }
}

function saveConfig(data) {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

/**
 * Command Handler for .antiviewonce / .antivv
 */
async function antiViewOnceCommand(sock, chatId, message, args) {
    const config = readConfig();
    const action = args[0]?.toLowerCase();

    if (action === 'on' || action === 'enable') {
        config.enabled = true;
        saveConfig(config);
        return sock.sendMessage(chatId, { text: '✅ *Auto Anti-ViewOnce has been ENABLED.* View-once media will automatically be sent as normal media.' }, { quoted: message });
    } else if (action === 'off' || action === 'disable') {
        config.enabled = false;
        saveConfig(config);
        return sock.sendMessage(chatId, { text: '❌ *Auto Anti-ViewOnce has been DISABLED.*' }, { quoted: message });
    } else {
        return sock.sendMessage(chatId, {
            text: `*───『 👁️ ANTI-VIEWONCE SETTINGS 👁️ 』───*\n\n` +
                  `*• Status:* ${config.enabled ? '🟢 ENABLED' : '🔴 DISABLED'}\n\n` +
                  `*Commands:*\n` +
                  `• \`.antiviewonce on\` - Enable auto anti-viewonce\n` +
                  `• \`.antiviewonce off\` - Disable auto anti-viewonce`
        }, { quoted: message });
    }
}

/**
 * Manual viewonce recovery command (.viewonce / .vv)
 */
async function viewonceCommand(sock, chatId, message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedImage = quoted?.imageMessage;
    const quotedVideo = quoted?.videoMessage;
    const quotedAudio = quoted?.audioMessage;

    const settings = require('../settings');
    const ownerNumber = settings.ownerNumber;
    const ownerJid = ownerNumber ? `${ownerNumber}@s.whatsapp.net` : null;

    // We want to send the revealed media to the owner's chat.
    const targetChatId = ownerJid || chatId;

    // If we're redirecting to the owner, we probably don't want to quote the original message
    // because it might be from a different chat, which could cause an error.
    const sendOptions = targetChatId === chatId ? { quoted: message } : {};

    let mediaHandled = false;

    if (quotedImage && quotedImage.viewOnce) {
        const stream = await downloadContentFromMessage(quotedImage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        await sock.sendMessage(targetChatId, { image: buffer, fileName: 'media.jpg', caption: quotedImage.caption || '' }, sendOptions);
        mediaHandled = true;
    } else if (quotedVideo && quotedVideo.viewOnce) {
        const stream = await downloadContentFromMessage(quotedVideo, 'video');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        await sock.sendMessage(targetChatId, { video: buffer, fileName: 'media.mp4', caption: quotedVideo.caption || '' }, sendOptions);
        mediaHandled = true;
    } else if (quotedAudio && quotedAudio.viewOnce) {
        const stream = await downloadContentFromMessage(quotedAudio, 'audio');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        await sock.sendMessage(targetChatId, { audio: buffer, mimetype: quotedAudio.mimetype || 'audio/mp4', ptt: true }, sendOptions);
        mediaHandled = true;
    } else {
        await sock.sendMessage(chatId, { text: '❌ Please reply to a view-once image, video, or audio message.' }, { quoted: message });
    }

    if (mediaHandled) {
        // Only delete if it's sent by the owner/fromMe and is in a DM
        const isGroup = chatId.endsWith('@g.us');
        const senderId = message.key.participant || message.key.remoteJid;
        const fromMe = message.key.fromMe;
        const isOwner = senderId === ownerJid || fromMe;

        if (!isGroup && isOwner) {
            try {
                // Try to delete the original .vv message
                await sock.sendMessage(chatId, { delete: message.key });
            } catch (err) {
                console.error('Failed to delete .vv command message:', err);
            }
        }
    }
}

module.exports = {
    viewonceCommand,
    antiViewOnceCommand
};
