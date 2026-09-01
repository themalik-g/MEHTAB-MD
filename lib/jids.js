const settings = require('../settings');

/** DM JID the recovered/edited content should be forwarded to when "owner" is picked */
function getOwnerJid(sock) {
    const configured = String(settings.ownerNumber || '').replace(/\D/g, '');
    if (configured) return `${configured}@s.whatsapp.net`;
    const botId = sock?.user?.id || '';
    return `${botId.split(':')[0].split('@')[0]}@s.whatsapp.net`;
}

/** True when the JID belongs to the account the bot is logged in with */
function isBotJid(sock, jid) {
    if (!jid) return false;
    const user = jid.split('@')[0].split(':')[0];
    const ids = [sock?.user?.id, sock?.user?.lid].filter(Boolean);
    return ids.some(id => id.split('@')[0].split(':')[0] === user);
}

module.exports = { getOwnerJid, isBotJid };
