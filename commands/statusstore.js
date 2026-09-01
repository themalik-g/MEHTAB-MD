const MAX_STATUSES = 200;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Statuses are volatile, so they are only kept in memory for a WhatsApp day
const statuses = new Map();

function statusId(key) {
    const participant = key.participant || key.remoteJid || '';
    return `${participant}_${key.id}`;
}

function prune() {
    const now = Date.now();
    for (const [id, entry] of statuses) {
        if (now - entry.savedAt > MAX_AGE_MS) statuses.delete(id);
    }
    while (statuses.size > MAX_STATUSES) {
        const oldest = statuses.keys().next().value;
        statuses.delete(oldest);
    }
}

function rememberStatus(message) {
    try {
        if (!message?.key || message.key.remoteJid !== 'status@broadcast') return;
        if (!message.message) return;
        const id = statusId(message.key);
        statuses.delete(id);
        statuses.set(id, {
            key: message.key,
            message: message.message,
            sender: message.key.participant || message.participant || '',
            timestamp: Number(message.messageTimestamp) || Math.floor(Date.now() / 1000),
            savedAt: Date.now(),
            read: false
        });
        prune();
    } catch (error) {
        console.error('Error caching status:', error.message);
    }
}

function getStatuses({ unreadOnly = false } = {}) {
    prune();
    const list = [...statuses.values()];
    return unreadOnly ? list.filter(entry => !entry.read) : list;
}

function markRead(key) {
    const entry = statuses.get(statusId(key));
    if (entry) entry.read = true;
}

function getLatestStatus() {
    const list = getStatuses();
    return list.length ? list[list.length - 1] : null;
}

function findStatus(id) {
    if (!id) return null;
    for (const entry of statuses.values()) {
        if (entry.key.id === id) return entry;
    }
    return null;
}

module.exports = {
    rememberStatus,
    getStatuses,
    getLatestStatus,
    findStatus,
    markRead
};
