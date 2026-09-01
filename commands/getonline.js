const store = require('../lib/lightweight_store');
const isOwnerOrSudo = require('../lib/isOwner');

const ONLINE_STATES = ['available', 'composing', 'recording'];
const PRESENCE_TTL = 10 * 60 * 1000;
const MAX_SUBSCRIBE = 150;

const presenceMap = new Map();

function handlePresenceUpdate(update) {
    try {
        if (!update?.presences) return;
        for (const [jid, data] of Object.entries(update.presences)) {
            const presence = data?.lastKnownPresence;
            if (!presence) continue;
            presenceMap.set(jid, {
                presence,
                lastSeen: data.lastSeen || null,
                updatedAt: Date.now()
            });
        }
    } catch (error) {
        console.error('Error handling presence update:', error);
    }
}

function collectJids() {
    const chats = new Set();
    const groups = new Set();

    const add = (jid) => {
        if (!jid || typeof jid !== 'string') return;
        if (jid === 'status@broadcast' || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) return;
        if (jid.endsWith('@g.us')) groups.add(jid);
        else chats.add(jid);
    };

    Object.keys(store.chats || {}).forEach(add);
    Object.keys(store.messages || {}).forEach(add);
    Object.keys(store.contacts || {}).forEach(add);

    return { chats: [...chats], groups: [...groups] };
}

function displayName(jid) {
    const contact = (store.contacts || {})[jid];
    const name = contact?.name || contact?.subject || '';
    const number = jid.split('@')[0].split(':')[0];
    return name ? `${name} (+${number})` : `+${number}`;
}

async function getOnlineCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { text: '❌ This command is only available for the owner or sudo!' }, { quoted: message });
            return;
        }

        const { chats, groups } = collectJids();

        if (chats.length === 0 && groups.length === 0) {
            await sock.sendMessage(chatId, { text: '❌ No chats or contacts found yet. Let the bot run for a while and try again.' }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { text: `⏳ Checking presence of ${Math.min(chats.length, MAX_SUBSCRIBE)} chats... please wait.` }, { quoted: message });

        const targets = chats.slice(0, MAX_SUBSCRIBE);
        for (const jid of targets) {
            try {
                await sock.presenceSubscribe(jid);
            } catch (e) {}
        }

        await new Promise(resolve => setTimeout(resolve, 6000));

        const now = Date.now();
        const online = [];
        for (const jid of targets) {
            const entry = presenceMap.get(jid);
            if (!entry) continue;
            if (now - entry.updatedAt > PRESENCE_TTL) continue;
            if (!ONLINE_STATES.includes(entry.presence)) continue;
            online.push({ jid, presence: entry.presence });
        }

        let text = '┌───────────────────┈⚝\n';
        text += '   *🟢 ONLINE CHECK*\n';
        text += '└───────────────────┈⚝\n\n';
        text += `*Private chats:* ${chats.length}\n`;
        text += `*Groups:* ${groups.length}\n`;
        text += `*Known contacts:* ${Object.keys(store.contacts || {}).length}\n`;
        text += `*Checked:* ${targets.length}\n\n`;

        if (online.length === 0) {
            text += '😴 No users are online right now.\n';
            text += '\n_Note: users who hide their online status cannot be detected._';
        } else {
            text += `*🟢 Online users (${online.length}):*\n`;
            online.forEach((user, i) => {
                const label = user.presence === 'composing'
                    ? 'typing'
                    : user.presence === 'recording'
                        ? 'recording'
                        : 'online';
                text += `${i + 1}. ${displayName(user.jid)} — ${label}\n`;
            });
            text += '\n_Note: users who hide their online status cannot be detected._';
        }

        await sock.sendMessage(chatId, {
            text,
            mentions: online.map(u => u.jid)
        }, { quoted: message });

    } catch (error) {
        console.error('Error in getonline command:', error);
        await sock.sendMessage(chatId, { text: '❌ Error checking online users.' }, { quoted: message });
    }
}

module.exports = {
    getOnlineCommand,
    handlePresenceUpdate
};
