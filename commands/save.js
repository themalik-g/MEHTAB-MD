const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');
const { getOwnerJid } = require('../lib/jids');
const { findStatus, getLatestStatus } = require('./statusstore');

const MEDIA_TYPES = [
    ['imageMessage', 'image'],
    ['videoMessage', 'video'],
    ['audioMessage', 'audio'],
    ['stickerMessage', 'sticker'],
    ['documentMessage', 'document']
];

function unwrap(content) {
    if (!content) return null;
    if (content.ephemeralMessage) return unwrap(content.ephemeralMessage.message);
    if (content.viewOnceMessage) return unwrap(content.viewOnceMessage.message);
    if (content.viewOnceMessageV2) return unwrap(content.viewOnceMessageV2.message);
    if (content.viewOnceMessageV2Extension) return unwrap(content.viewOnceMessageV2Extension.message);
    if (content.documentWithCaptionMessage) return unwrap(content.documentWithCaptionMessage.message);
    return content;
}

async function download(mediaMessage, type) {
    const stream = await downloadContentFromMessage(mediaMessage, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

async function buildPayload(content, caption) {
    const message = unwrap(content);
    if (!message) return null;

    for (const [field, type] of MEDIA_TYPES) {
        const media = message[field];
        if (!media) continue;
        const buffer = await download(media, type === 'sticker' ? 'image' : type);
        const mediaCaption = [media.caption, caption].filter(Boolean).join('\n\n');
        if (type === 'image') return { image: buffer, caption: mediaCaption };
        if (type === 'video') return { video: buffer, caption: mediaCaption };
        if (type === 'audio') return { audio: buffer, mimetype: media.mimetype || 'audio/mp4', ptt: !!media.ptt };
        if (type === 'sticker') return { sticker: buffer };
        return {
            document: buffer,
            mimetype: media.mimetype || 'application/octet-stream',
            fileName: media.fileName || 'file',
            caption: mediaCaption
        };
    }

    const text = message.conversation || message.extendedTextMessage?.text || '';
    if (!text) return null;
    return { text: caption ? `${caption}\n\n${text}` : text };
}

/**
 * .save - forwards the replied status (or any replied message) to the owner DM
 */
async function saveCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner or sudo can use .save' }, { quoted: message });
            return;
        }

        const contextInfo = message.message?.extendedTextMessage?.contextInfo
            || message.message?.imageMessage?.contextInfo
            || message.message?.videoMessage?.contextInfo;

        let content = contextInfo?.quotedMessage;
        let author = contextInfo?.participant || contextInfo?.remoteJid || chatId;

        if (!content) {
            const cached = findStatus(contextInfo?.stanzaId) || getLatestStatus();
            if (cached) {
                content = cached.message;
                author = cached.sender || author;
            }
        }

        if (!content) {
            await sock.sendMessage(chatId, { text: '❌ Reply to a status (or any message) with .save' }, { quoted: message });
            return;
        }

        const authorName = String(author).split('@')[0];
        const caption = `💾 *Saved Status*\n👤 *From:* @${authorName}`;
        const payload = await buildPayload(content, caption);

        if (!payload) {
            await sock.sendMessage(chatId, { text: '❌ This status type cannot be saved.' }, { quoted: message });
            return;
        }

        const ownerJid = getOwnerJid(sock);
        await sock.sendMessage(ownerJid, { ...payload, mentions: [author] });

        if (chatId !== ownerJid) {
            await sock.sendMessage(chatId, { text: '✅ Saved to your chat.' }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in save command:', error);
        await sock.sendMessage(chatId, { text: `❌ Failed to save: ${error.message}` }, { quoted: message });
    }
}

module.exports = saveCommand;
