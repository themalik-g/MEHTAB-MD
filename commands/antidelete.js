const fs = require('fs');
const path = require('path');
const { getContentType, downloadMediaMessage } = require('@whiskeysockets/baileys');

const configPath = path.join(__dirname, '../data/antidelete.json');
const tempDir = path.join(__dirname, '../temp');

// Ensure directories exist
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// Message cache (keeps up to 1500 recent messages)
const messageStore = new Map();
const MAX_MESSAGES = 1500;

function readConfig() {
    try {
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, JSON.stringify({ enabled: true, sendTo: 'chat' }, null, 2));
        }
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        return { enabled: true, sendTo: 'chat' }; // 'chat' = group/current chat, 'owner' = bot owner DM
    }
}

function saveConfig(data) {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

/**
 * Stores incoming message metadata and downloads media if applicable
 */
async function storeMessage(msg, sock) {
    try {
        if (!msg?.key?.id || !msg?.message) return;
        if (msg.message.protocolMessage) return;

        const messageId = msg.key.id;
        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const sender = isGroup ? (msg.key.participant || msg.participant) : from;
        const type = getContentType(msg.message);

        let content = '';
        let mediaType = null;
        let mediaPath = null;

        // Extract Text Content
        if (type === 'conversation') {
            content = msg.message.conversation;
        } else if (type === 'extendedTextMessage') {
            content = msg.message.extendedTextMessage.text;
        } else if (type === 'imageMessage') {
            mediaType = 'image';
            content = msg.message.imageMessage.caption || '';
        } else if (type === 'videoMessage') {
            mediaType = 'video';
            content = msg.message.videoMessage.caption || '';
        } else if (type === 'stickerMessage') {
            mediaType = 'sticker';
        } else if (type === 'audioMessage') {
            mediaType = 'audio';
        }

        // Cache message metadata
        if (messageStore.size >= MAX_MESSAGES) {
            const oldestKey = messageStore.keys().next().value;
            const oldestMsg = messageStore.get(oldestKey);
            if (oldestMsg?.mediaPath && fs.existsSync(oldestMsg.mediaPath)) {
                try { fs.unlinkSync(oldestMsg.mediaPath); } catch (e) {}
            }
            messageStore.delete(oldestKey);
        }

        // Save media to temp directory if message contains media
        if (mediaType) {
            try {
                const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
                    logger: console,
                    reuploadRequest: sock?.updateMediaMessage
                });
                
                if (buffer) {
                    const ext = mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : mediaType === 'sticker' ? 'webp' : 'mp3';
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
 * Handles detection and restoration of revoked messages
 */
async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const config = readConfig();
        if (!config.enabled) return;

        const protocolMsg = revocationMessage.message?.protocolMessage;
        if (!protocolMsg || protocolMsg.type !== 0) return;

        const messageId = protocolMsg.key?.id;
        if (!messageId) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const remoteJid = protocolMsg.key.remoteJid;
        const deletedBy = revocationMessage.key.participant || revocationMessage.participant || remoteJid;
        const botNumber = (sock.user?.id || '').split(':')[0] + '@s.whatsapp.net';

        // Ignore if deleted by the bot itself
        if (deletedBy.includes(botNumber.split('@')[0])) return;

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

        // Destination: send to current chat or owner's DM based on configuration
        const targetJid = config.sendTo === 'owner' ? botNumber : remoteJid;
        const mentions = [deletedBy, sender];

        // 1. Send Report Header
        await sock.sendMessage(targetJid, {
            text,
            mentions
        });

        // 2. Send Recovered Media
        if (original.mediaType && original.mediaPath && fs.existsSync(original.mediaPath)) {
            const mediaOptions = {
                caption: `*Deleted ${original.mediaType.toUpperCase()}*\nSender: @${senderName}`,
                mentions: [sender]
            };

            try {
                switch (original.mediaType) {
                    case 'image':
                        await sock.sendMessage(targetJid, {
                            image: fs.readFileSync(original.mediaPath),
                            ...mediaOptions
                        });
                        break;
                    case 'video':
                        await sock.sendMessage(targetJid, {
                            video: fs.readFileSync(original.mediaPath),
                            ...mediaOptions
                        });
                        break;
                    case 'sticker':
                        await sock.sendMessage(targetJid, {
                            sticker: fs.readFileSync(original.mediaPath)
                        });
                        break;
                    case 'audio':
                        await sock.sendMessage(targetJid, {
                            audio: fs.readFileSync(original.mediaPath),
                            mimetype: 'audio/mpeg',
                            ptt: false,
                            ...mediaOptions
                        });
                        break;
                }
            } catch (err) {
                console.error('Error re-sending media:', err);
            }

            // Cleanup local temp file
            try {
                fs.unlinkSync(original.mediaPath);
            } catch (err) {}
        }

        messageStore.delete(messageId);
    } catch (err) {
        console.error('handleMessageRevocation error:', err);
    }
}

/**
 * Command Handler
 */
async function handleAntideleteCommand(sock, m, args) {
    if (!m.isOwner && !m.isAdmin) {
        return m.reply('❌ This command can only be used by Group Admins or the Bot Owner.');
    }

    const action = args[0]?.toLowerCase();
    const config = readConfig();

    if (action === 'on' || action === 'enable') {
        config.enabled = true;
        saveConfig(config);
        return m.reply('✅ *Anti-Delete has been ENABLED.* Deleted messages will now be caught.');
    } else if (action === 'off' || action === 'disable') {
        config.enabled = false;
        saveConfig(config);
        return m.reply('❌ *Anti-Delete has been DISABLED.*');
    } else if (action === 'to' || action === 'mode') {
        const mode = args[1]?.toLowerCase();
        if (mode === 'chat' || mode === 'group') {
            config.sendTo = 'chat';
            saveConfig(config);
            return m.reply('✅ Recovered messages will now be sent to the **chat/group** where they were deleted.');
        } else if (mode === 'owner' || mode === 'dm') {
            config.sendTo = 'owner';
            saveConfig(config);
            return m.reply('✅ Recovered messages will now be forwarded to the **Owner DM**.');
        } else {
            return m.reply('⚠️ Use: `.antidelete to chat` or `.antidelete to owner`');
        }
    } else {
        return m.reply(
            `*───『 🔰 ANTIDELETE SETTINGS 🔰 』───*\n\n` +
            `*• Status:* ${config.enabled ? '🟢 ENABLED' : '🔴 DISABLED'}\n` +
            `*• Destination:* ${config.sendTo === 'owner' ? '👤 Owner DM' : '👥 Current Chat'}\n\n` +
            `*Commands:*\n` +
            `• \`.antidelete on\` - Activate anti-delete\n` +
            `• \`.antidelete off\` - Deactivate anti-delete\n` +
            `• \`.antidelete to chat\` - Restore deleted message in chat\n` +
            `• \`.antidelete to owner\` - Forward deleted message to owner DM`
        );
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
    storeMessage
};
