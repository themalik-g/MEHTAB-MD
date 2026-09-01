const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const configPath = path.join(__dirname, '../data/antiedit.json');
const textCache = new Map();
const MAX_CACHE = 2000;

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

function storeMessageContent(message) {
    try {
        if (!message?.key?.id || !message?.message) return;
        const msgId = message.key.id;

        // Skip protocol messages
        if (message.message.protocolMessage) return;

        let content = '';
        const msg = message.message;

        if (msg.conversation) {
            content = msg.conversation;
        } else if (msg.extendedTextMessage?.text) {
            content = msg.extendedTextMessage.text;
        } else if (msg.imageMessage?.caption) {
            content = msg.imageMessage.caption;
        } else if (msg.videoMessage?.caption) {
            content = msg.videoMessage.caption;
        }

        if (content) {
            if (textCache.size >= MAX_CACHE) {
                const oldestKey = textCache.keys().next().value;
                textCache.delete(oldestKey);
            }
            const sender = message.key.participant || message.key.remoteJid;
            textCache.set(msgId, {
                content,
                sender,
                chatId: message.key.remoteJid,
                timestamp: Date.now()
            });
        }
    } catch (e) {
        console.error('Error caching message for Anti Edit:', e);
    }
}

async function antiEditCommand(sock, chatId, message, rawMatch = '') {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

    if (!message.key.fromMe && !isOwner) {
        return await sock.sendMessage(chatId, { text: '❌ Only owner/sudo can use anti edit command.' }, { quoted: message });
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
            text: `> *Anti Edit Usage Examples:*\n` +
                `- .antiedit g - Send edited msg in same chat\n` +
                `- .antiedit p - Send edited msg to owner chat\n` +
                `- .antiedit g pm - Same chat, PMs only\n` +
                `- .antiedit g gm - Same chat, groups only\n` +
                `- .antiedit p no-gm - To owner, exclude groups\n` +
                `- .antiedit <jid> - Send edited msg to specific JID\n` +
                `- .antiedit off - Disable anti edit\n\n` +
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
        return await sock.sendMessage(chatId, { text: '_Anti edit has been disabled._' }, { quoted: message });
    }

    saveConfig({ value: match });

    const destText = jid
        ? `_Edited messages will be sent to: ${jid}_`
        : dest === 'p'
            ? '_Edited messages will be sent to owner/sudo DM._'
            : '_Edited messages will be sent to the chat itself._';

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

async function handleAntiEdit(sock, message) {
    try {
        const config = readConfig();
        if (!config || !config.value || config.value === 'null' || config.value === 'false') return;

        const protocolMsg = message.message?.protocolMessage;
        // Check if message is an edit message (type 14 is REVOKE_EDIT / EDIT)
        if (!protocolMsg || (protocolMsg.type !== 14 && !protocolMsg.editedMessage)) return;

        const editedMessageId = protocolMsg.key?.id;
        if (!editedMessageId) return;

        const cached = textCache.get(editedMessageId);
        if (!cached) return;

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

        // Extract new edited text
        const newMsgObj = protocolMsg.editedMessage;
        let newContent = '';
        if (newMsgObj?.conversation) {
            newContent = newMsgObj.conversation;
        } else if (newMsgObj?.extendedTextMessage?.text) {
            newContent = newMsgObj.extendedTextMessage.text;
        } else if (newMsgObj?.imageMessage?.caption) {
            newContent = newMsgObj.imageMessage.caption;
        } else if (newMsgObj?.videoMessage?.caption) {
            newContent = newMsgObj.videoMessage.caption;
        }

        const sender = cached.sender || message.key.participant || chatId;
        const senderName = sender.split('@')[0];
        const ownerJid = (sock.user?.id || '').split(':')[0] + '@s.whatsapp.net';
        const targetJid = parseJid(dest) || (dest === 'p' ? ownerJid : chatId);

        const reportText = `*✏️ ANTI EDIT DETECTED ✏️*\n\n` +
            `*👤 User:* @${senderName}\n` +
            `*📌 Original Message:*\n${cached.content}\n\n` +
            `*📝 New Message:*\n${newContent || '[Media/Unreadable]'}`;

        await sock.sendMessage(targetJid, {
            text: reportText,
            mentions: [sender]
        });

        textCache.delete(editedMessageId);
    } catch (error) {
        console.error('Error in handleAntiEdit:', error);
    }
}

module.exports = {
    antiEditCommand,
    handleAntiEdit,
    storeMessageContent,
    readConfig
};
