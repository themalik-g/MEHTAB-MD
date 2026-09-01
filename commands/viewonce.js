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

    if (quotedImage && quotedImage.viewOnce) {
        const stream = await downloadContentFromMessage(quotedImage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        await sock.sendMessage(chatId, { image: buffer, fileName: 'media.jpg', caption: quotedImage.caption || '' }, { quoted: message });
    } else if (quotedVideo && quotedVideo.viewOnce) {
        const stream = await downloadContentFromMessage(quotedVideo, 'video');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        await sock.sendMessage(chatId, { video: buffer, fileName: 'media.mp4', caption: quotedVideo.caption || '' }, { quoted: message });
    } else if (quotedAudio && quotedAudio.viewOnce) {
        const stream = await downloadContentFromMessage(quotedAudio, 'audio');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        await sock.sendMessage(chatId, { audio: buffer, mimetype: quotedAudio.mimetype || 'audio/mp4', ptt: true }, { quoted: message });
    } else {
        await sock.sendMessage(chatId, { text: '❌ Please reply to a view-once image, video, or audio message.' }, { quoted: message });
    }
}

/**
 * Intercepts incoming viewOnce messages automatically
 */
async function handleAutoViewOnce(sock, msg) {
    try {
        const config = readConfig();
        if (!config.enabled) return;

        if (!msg?.message) return;

        let messageContent = msg.message;
        if (messageContent.ephemeralMessage) {
            messageContent = messageContent.ephemeralMessage.message;
        }

        const viewOnceMessage = messageContent.viewOnceMessageV2?.message || messageContent.viewOnceMessage?.message;
        if (!viewOnceMessage) return;

        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || msg.participant || chatId;
        const senderName = sender.split('@')[0];

        const imageMsg = viewOnceMessage.imageMessage;
        const videoMsg = viewOnceMessage.videoMessage;
        const audioMsg = viewOnceMessage.audioMessage;

        const caption = `*👁️ AUTO ANTI-VIEWONCE DETECTED*\n👤 *Sender:* @${senderName}`;

        if (imageMsg) {
            const stream = await downloadContentFromMessage(imageMsg, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            await sock.sendMessage(chatId, {
                image: buffer,
                caption: imageMsg.caption ? `${caption}\n📝 *Caption:* ${imageMsg.caption}` : caption,
                mentions: [sender]
            }, { quoted: msg });
        } else if (videoMsg) {
            const stream = await downloadContentFromMessage(videoMsg, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            await sock.sendMessage(chatId, {
                video: buffer,
                caption: videoMsg.caption ? `${caption}\n📝 *Caption:* ${videoMsg.caption}` : caption,
                mentions: [sender]
            }, { quoted: msg });
        } else if (audioMsg) {
            const stream = await downloadContentFromMessage(audioMsg, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            await sock.sendMessage(chatId, {
                text: `${caption}\n🎵 *ViewOnce Voice/Audio below:*`,
                mentions: [sender]
            }, { quoted: msg });
            await sock.sendMessage(chatId, {
                audio: buffer,
                mimetype: audioMsg.mimetype || 'audio/mp4',
                ptt: true
            });
        }
    } catch (err) {
        console.error('handleAutoViewOnce error:', err);
    }
}

module.exports = {
    viewonceCommand,
    antiViewOnceCommand,
    handleAutoViewOnce
};
