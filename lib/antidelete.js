const fs = require('fs');
const path = require('path');
const { getContentType } = require('@whiskeysockets/baileys');

const dataFilePath = path.join(__dirname, '../data/antidelete.json');

// In-memory cache for up to 2,000 recent messages
const messageCache = new Map();
const MAX_CACHE_SIZE = 2000;

function getAntiDeleteConfig() {
    try {
        if (!fs.existsSync(dataFilePath)) {
            fs.writeFileSync(dataFilePath, JSON.stringify({ enabled: true }, null, 2));
        }
        return JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
    } catch (e) {
        return { enabled: true };
    }
}

function storeMessage(msg) {
    if (!msg?.key?.id || !msg?.message) return;
    if (msg.message.protocolMessage) return;

    if (messageCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = messageCache.keys().next().value;
        messageCache.delete(oldestKey);
    }

    messageCache.set(msg.key.id, {
        key: msg.key,
        message: msg.message,
        pushName: msg.pushName || 'User',
        participant: msg.key.participant || msg.participant || msg.key.remoteJid,
        timestamp: Date.now()
    });
}

async function handleAntiDelete(sock, msg) {
    try {
        const config = getAntiDeleteConfig();
        if (!config.enabled) return;

        const protocolMsg = msg?.message?.protocolMessage;
        // Baileys Type 0 = REVOKE action (deleted for everyone)
        if (!protocolMsg || protocolMsg.type !== 0) return;

        const deletedKey = protocolMsg.key;
        if (!deletedKey || !deletedKey.id) return;

        const cached = messageCache.get(deletedKey.id);
        if (!cached) return;

        const remoteJid = deletedKey.remoteJid;
        const sender = (cached.participant || '').split('@')[0];
        const isGroup = remoteJid.endsWith('@g.us');

        const header = 
            `⚠️ *[ ANTI-DELETE DETECTED ]* ⚠️\n\n` +
            `👤 *Sender:* @${sender}\n` +
            `🕒 *Time:* ${new Date(cached.timestamp).toLocaleTimeString()}\n` +
            (isGroup ? `👥 *Location:* Group Chat\n` : `💬 *Location:* Private Chat\n`);

        const mentions = [cached.participant];
        const type = getContentType(cached.message);

        if (type === 'conversation' || type === 'extendedTextMessage') {
            const body = cached.message.conversation || cached.message.extendedTextMessage?.text || '';
            await sock.sendMessage(remoteJid, {
                text: `${header}\n📝 *Deleted Message:*\n${body}`,
                mentions
            });
        } else {
            await sock.sendMessage(remoteJid, {
                text: `${header}\n📦 *Restoring deleted media below:*`,
                mentions
            });

            await sock.sendMessage(remoteJid, {
                forward: cached
            });
        }
    } catch (err) {
        console.error('[ANTIDELETE ERROR]:', err);
    }
}

module.exports = {
    storeMessage,
    handleAntiDelete,
    getAntiDeleteConfig
};
