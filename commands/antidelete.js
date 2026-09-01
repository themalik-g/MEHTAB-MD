const fs = require('fs');
const path = require('path');
const { getContentType, downloadMediaMessage } = require('@whiskeysockets/baileys');
const { unwrapMessage, getProtocolMessage } = require('../lib/msgcontent');
const { getOwnerJid, isBotJid } = require('../lib/jids');

const configPath = path.join(__dirname, '../data/antidelete.json');
const tempDir = path.join(__dirname, '../temp');

// Ensure directories exist
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// Message cache (keeps up to 2000 recent messages)
const messageStore = new Map();
const MAX_MESSAGES = 2000;

// Revocations can reach us from both messages.upsert and messages.update
const handledRevocations = new Set();

function alreadyHandled(messageId) {
    if (handledRevocations.has(messageId)) return true;
    handledRevocations.add(messageId);
    setTimeout(() => handledRevocations.delete(messageId), 60000);
    return false;
}

function readConfig() {
    try {
        if (!fs.existsSync(configPath)) {
            const defaultConfig = { enabled: true, sendTo: 'chat' };
            fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return { enabled: !!config.enabled, sendTo: config.sendTo === 'owner' ? 'owner' : 'chat' };
    } catch (e) {
        return { enabled: true, sendTo: 'chat' };
    }
}

function saveConfig(data) {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

/**
 * Stores incoming message metadata and downloads media if applicable
 */
async function storeMessage(sock, msg) {
    try {
        // Handle argument order if storeMessage is called as (msg, sock) or (sock, msg)
        if (sock && sock.key && sock.message) {
            const temp = sock;
            sock = msg;
            msg = temp;
        }

        if (!msg?.key?.id || !msg?.message) return;

        // Don't store protocol messages (deletions/edits) directly
        if (getProtocolMessage(msg.message)) return;

        const messageId = msg.key.id;
        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const sender = isGroup ? (msg.key.participant || msg.participant) : from;

        // Unpack ephemeral / viewOnce / document-with-caption wrappers
        const messageContent = unwrapMessage(msg.message);
        if (!messageContent) return;

        const type = getContentType(messageContent);

        let content = '';
        let mediaType = null;
        let mediaPath = null;

        // Extract Text Content
        if (type === 'conversation') {
            content = messageContent.conversation;
        } else if (type === 'extendedTextMessage') {
            content = messageContent.extendedTextMessage.text;
        } else if (type === 'imageMessage') {
            mediaType = 'image';
            content = messageContent.imageMessage.caption || '';
        } else if (type === 'videoMessage') {
            mediaType = 'video';
            content = messageContent.videoMessage.caption || '';
        } else if (type === 'stickerMessage') {
            mediaType = 'sticker';
        } else if (type === 'audioMessage') {
            mediaType = 'audio';
        } else if (type === 'documentMessage') {
            mediaType = 'document';
            content = messageContent.documentMessage.caption || messageContent.documentMessage.fileName || '';
        }

        // Cache cleanup if threshold reached
        if (messageStore.size >= MAX_MESSAGES) {
            const oldestKey = messageStore.keys().next().value;
            const oldestMsg = messageStore.get(oldestKey);
            if (oldestMsg?.mediaPath && fs.existsSync(oldestMsg.mediaPath)) {
                try { fs.unlinkSync(oldestMsg.mediaPath); } catch (e) {}
            }
            messageStore.delete(oldestKey);
        }

        // Save media to temp directory if message contains media
        if (mediaType && sock) {
            try {
                const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                });
                
                if (buffer) {
                    const ext = mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : mediaType === 'sticker' ? 'webp' : mediaType === 'audio' ? 'mp3' : 'bin';
                    const filename = `antidel_${Date.now()}_${messageId}.${ext}`;
                    mediaPath = path.join(tempDir, filename);
                    fs.writeFileSync(mediaPath, buffer);
                }
            } catch (err) {
                // Ignore download errors for expired media
            }
        }

        messageStore.set(messageId, {
            sender,
            group: isGroup ? from : null,
            content,
            mediaType,
            mediaPath,
            rawMessage: msg,
            timestamp: Date.now()
        });
    } catch (err) {
        console.error('Anti-delete storeMessage error:', err);
    }
}

/**
 * Handles detection and restoration of revoked or edited messages
 */
async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const config = readConfig();

        const protocolMsg = getProtocolMessage(revocationMessage.message);
        if (!protocolMsg) return;

        const messageId = protocolMsg.key?.id;
        if (!messageId) return;

        // TYPE 0: REVOKE / DELETE
        if (protocolMsg.type === 0 || protocolMsg.type === 'REVOKE') {
            if (!config.enabled) return;
            if (alreadyHandled(messageId)) return;

            const original = messageStore.get(messageId);
            if (!original) return;

            const remoteJid = revocationMessage.key.remoteJid;
            const deletedBy = revocationMessage.key.participant || revocationMessage.participant || remoteJid;

            // Ignore if deleted by the bot itself
            if (revocationMessage.key.fromMe || isBotJid(sock, deletedBy)) return;

            const sender = original.sender;
            const senderName = sender.split('@')[0];
            let groupName = '';

            if (original.group) {
                try {
                    const groupMetadata = await sock.groupMetadata(original.group);
                    groupName = groupMetadata.subject;
                } catch (e) {
                    groupName = 'Group Chat';
                }
            }

            const time = new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Kolkata',
                hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit',
                day: '2-digit', month: '2-digit', year: 'numeric'
            });

            let text = `*🔰 ANTIDELETE REPORT 🔰*\n\n` +
                `*🗑️ Deleted By:* @${deletedBy.split('@')[0]}\n` +
                `*👤 Sender:* @${senderName}\n` +
                `*📱 Number:* +${sender.split('@')[0]}\n` +
                `*🕒 Time:* ${time}\n`;

            if (groupName) text += `*👥 Group:* ${groupName}\n`;
            if (original.content) text += `\n*💬 Deleted Message:*\n${original.content}`;

            const targetJid = config.sendTo === 'owner' ? getOwnerJid(sock) : remoteJid;
            const mentions = [deletedBy, sender];

            // Send Report Header
            await sock.sendMessage(targetJid, { text, mentions });

            // Send Recovered Media if applicable
            if (original.mediaType && original.mediaPath && fs.existsSync(original.mediaPath)) {
                const mediaOptions = {
                    caption: `*Deleted ${original.mediaType.toUpperCase()}*\nSender: @${senderName}`,
                    mentions: [sender]
                };

                try {
                    switch (original.mediaType) {
                        case 'image':
                            await sock.sendMessage(targetJid, { image: fs.readFileSync(original.mediaPath), ...mediaOptions });
                            break;
                        case 'video':
                            await sock.sendMessage(targetJid, { video: fs.readFileSync(original.mediaPath), ...mediaOptions });
                            break;
                        case 'sticker':
                            await sock.sendMessage(targetJid, { sticker: fs.readFileSync(original.mediaPath) });
                            break;
                        case 'audio':
                            await sock.sendMessage(targetJid, { audio: fs.readFileSync(original.mediaPath), mimetype: 'audio/mpeg', ptt: false, ...mediaOptions });
                            break;
                        case 'document':
                            await sock.sendMessage(targetJid, { document: fs.readFileSync(original.mediaPath), mimetype: 'application/octet-stream', ...mediaOptions });
                            break;
                    }
                } catch (err) {
                    console.error('Error re-sending media:', err);
                }

                try { fs.unlinkSync(original.mediaPath); } catch (err) {}
            }

            messageStore.delete(messageId);
            return;
        }

    } catch (err) {
        console.error('handleMessageRevocation error:', err);
    }
}

/**
 * Baileys also reports deletions through the `messages.update` event.
 * Rebuild a revocation message from that payload and reuse the same handler.
 */
async function handleRevocationUpdate(sock, update) {
    try {
        const deletedId = update?.key?.id;
        const revokeKey = update?.update?.key || update?.key;
        if (!deletedId || !revokeKey) return;
        if (update.update?.message !== null) return;

        await handleMessageRevocation(sock, {
            key: revokeKey,
            message: {
                protocolMessage: {
                    type: 0,
                    key: { ...update.key, id: deletedId }
                }
            }
        });
    } catch (err) {
        console.error('handleRevocationUpdate error:', err);
    }
}

/**
 * Command Handler for .antidelete
 */
async function handleAntideleteCommand(sock, chatId, message, args) {
    const action = args[0]?.toLowerCase();
    const config = readConfig();

    if (action === 'on' || action === 'enable') {
        config.enabled = true;
        saveConfig(config);
        return sock.sendMessage(chatId, { text: '✅ *Anti-Delete has been ENABLED.* Deleted messages will now be caught.' }, { quoted: message });
    } else if (action === 'off' || action === 'disable') {
        config.enabled = false;
        saveConfig(config);
        return sock.sendMessage(chatId, { text: '❌ *Anti-Delete has been DISABLED.*' }, { quoted: message });
    } else if (action === 'g' || action === 'chat' || action === 'group') {
        config.enabled = true;
        config.sendTo = 'chat';
        saveConfig(config);
        return sock.sendMessage(chatId, { text: '✅ Anti-Delete is *ON* and deleted messages will be restored in the *same chat*.' }, { quoted: message });
    } else if (action === 'p' || action === 'owner' || action === 'dm') {
        config.enabled = true;
        config.sendTo = 'owner';
        saveConfig(config);
        return sock.sendMessage(chatId, { text: '✅ Anti-Delete is *ON* and deleted messages will be forwarded to the *Owner DM*.' }, { quoted: message });
    } else if (action === 'to' || action === 'mode') {
        const mode = args[1]?.toLowerCase();
        if (mode === 'chat' || mode === 'group' || mode === 'g') {
            config.sendTo = 'chat';
            saveConfig(config);
            return sock.sendMessage(chatId, { text: '✅ Recovered deleted messages will now be sent to the *chat/group* where they were deleted.' }, { quoted: message });
        } else if (mode === 'owner' || mode === 'dm' || mode === 'p') {
            config.sendTo = 'owner';
            saveConfig(config);
            return sock.sendMessage(chatId, { text: '✅ Recovered deleted messages will now be forwarded to the *Owner DM*.' }, { quoted: message });
        } else {
            return sock.sendMessage(chatId, { text: '⚠️ Use: `.antidelete to chat` or `.antidelete to owner`' }, { quoted: message });
        }
    } else {
        return sock.sendMessage(chatId, {
            text: `*🔰 ANTIDELETE SETTINGS 🔰*\n\n` +
                  `*• Status:* ${config.enabled ? '🟢 ENABLED' : '🔴 DISABLED'}\n` +
                  `*• Destination:* ${config.sendTo === 'owner' ? '👤 Owner DM' : '👥 Current Chat'}\n\n` +
                  `*Commands:*\n` +
                  `• \`.antidelete on\` - Activate anti-delete\n` +
                  `• \`.antidelete off\` - Deactivate anti-delete\n` +
                  `• \`.antidelete g\` - Restore deleted message in the same chat\n` +
                  `• \`.antidelete p\` - Forward deleted message to owner DM`
        }, { quoted: message });
    }
}

module.exports = {
    name: 'antidelete',
    alias: ['antidel', 'antirevoke'],
    category: 'group',
    desc: 'Capture and recover deleted messages',
    execute: handleAntideleteCommand,
    handleAntideleteCommand,
    handleMessageRevocation,
    handleRevocationUpdate,
    storeMessage
};
