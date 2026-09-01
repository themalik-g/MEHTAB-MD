async function getppCommand(sock, chatId, message, args) {
    try {
        let targetJid;

        // 1. Check mentioned users
        const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        // 2. Check quoted message
        const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;

        if (mentionedJid) {
            targetJid = mentionedJid;
        } else if (quotedParticipant) {
            targetJid = quotedParticipant;
        } else if (args && args[0]) {
            let cleanNumber = args[0].replace(/[^0-9]/g, '');
            if (cleanNumber) {
                targetJid = cleanNumber + '@s.whatsapp.net';
            }
        }

        if (!targetJid) {
            targetJid = message.key.participant || message.key.remoteJid;
        }

        // Standardize JID
        if (!targetJid.includes('@')) {
            targetJid = targetJid + '@s.whatsapp.net';
        }

        try {
            const ppUrl = await sock.profilePictureUrl(targetJid, 'image');
            if (ppUrl) {
                await sock.sendMessage(chatId, {
                    image: { url: ppUrl },
                    caption: `📸 *Profile Picture of:* @${targetJid.split('@')[0]}`,
                    mentions: [targetJid]
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { text: `❌ Could not retrieve profile picture for @${targetJid.split('@')[0]} (User might have hidden it or set privacy to contacts).`, mentions: [targetJid] }, { quoted: message });
            }
        } catch (err) {
            await sock.sendMessage(chatId, { text: `❌ Profile picture not found or private for @${targetJid.split('@')[0]}.`, mentions: [targetJid] }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in getppCommand:', error);
        await sock.sendMessage(chatId, { text: '❌ Error fetching profile picture: ' + error.message }, { quoted: message });
    }
}

module.exports = getppCommand;
