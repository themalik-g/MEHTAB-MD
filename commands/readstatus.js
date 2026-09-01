const isOwnerOrSudo = require('../lib/isOwner');
const { sendStatusReaction, getStatusReactionEmoji } = require('./autostatus');
const { getStatuses, markRead } = require('./statusstore');

function describe(entry) {
    const content = entry.message || {};
    const inner = content.ephemeralMessage?.message || content;
    if (inner.imageMessage) return '🖼️ image';
    if (inner.videoMessage) return '🎥 video';
    if (inner.audioMessage) return '🎵 audio';
    if (inner.extendedTextMessage || inner.conversation) return '📝 text';
    return '📄 status';
}

/**
 * .readstatus - views and reacts to every status currently cached by the bot
 */
async function readStatusCommand(sock, chatId, message, args) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner or sudo can use .readstatus' }, { quoted: message });
            return;
        }

        const emoji = (args && args[0]) ? args[0].trim() : getStatusReactionEmoji();
        const statuses = getStatuses();

        if (!statuses.length) {
            await sock.sendMessage(chatId, {
                text: '📭 No statuses cached yet. The bot only sees statuses received while it is online.'
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            text: `👀 Viewing and reacting (${emoji}) to ${statuses.length} status update(s)…`
        }, { quoted: message });

        const summary = [];
        let failed = 0;

        for (const entry of statuses) {
            try {
                await sock.readMessages([entry.key]);
                await sendStatusReaction(sock, entry.key, emoji);
                markRead(entry.key);
                summary.push(`• @${String(entry.sender).split('@')[0]} — ${describe(entry)}`);
            } catch (error) {
                if (error.message?.includes('rate-overlimit')) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    try {
                        await sock.readMessages([entry.key]);
                        await sendStatusReaction(sock, entry.key, emoji);
                        markRead(entry.key);
                        summary.push(`• @${String(entry.sender).split('@')[0]} — ${describe(entry)}`);
                        continue;
                    } catch {}
                }
                failed++;
            }
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        const mentions = statuses.map(entry => entry.sender).filter(Boolean);
        await sock.sendMessage(chatId, {
            text: `✅ *Statuses read & reacted* ${emoji}\n\n${summary.join('\n') || '—'}` +
                (failed ? `\n\n⚠️ ${failed} status(es) could not be processed.` : ''),
            mentions
        }, { quoted: message });
    } catch (error) {
        console.error('Error in readstatus command:', error);
        await sock.sendMessage(chatId, { text: `❌ Failed to read statuses: ${error.message}` }, { quoted: message });
    }
}

module.exports = readStatusCommand;
