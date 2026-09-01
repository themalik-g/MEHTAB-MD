const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const configPath = path.join(__dirname, '..', 'data', 'alwaysonline.json');

function initConfig() {
    if (!fs.existsSync(configPath)) {
        const dataDir = path.dirname(configPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify({ enabled: true }, null, 2));
    }
    try {
        return JSON.parse(fs.readFileSync(configPath));
    } catch {
        return { enabled: true };
    }
}

async function alwaysOnlineCommand(sock, chatId, message, args) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { text: '❌ This command is only available for the owner or sudo!' }, { quoted: message });
            return;
        }

        const config = initConfig();

        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (action === 'on' || action === 'enable') {
                config.enabled = true;
            } else if (action === 'off' || action === 'disable') {
                config.enabled = false;
            } else {
                await sock.sendMessage(chatId, { text: '❌ Invalid option! Use: .alwaysonline on/off' }, { quoted: message });
                return;
            }
        } else {
            config.enabled = !config.enabled;
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        if (sock.user) {
            try {
                if (config.enabled) {
                    await sock.sendPresenceUpdate('available');
                } else {
                    await sock.sendPresenceUpdate('unavailable');
                }
            } catch (e) {
                console.error('Error updating presence:', e);
            }
        }

        await sock.sendMessage(chatId, {
            text: `✅ Always Online has been ${config.enabled ? 'enabled' : 'disabled'}!`
        }, { quoted: message });

    } catch (error) {
        console.error('Error in alwaysonline command:', error);
        await sock.sendMessage(chatId, { text: '❌ Error processing command!' }, { quoted: message });
    }
}

function isAlwaysOnlineEnabled() {
    try {
        const config = initConfig();
        return config.enabled;
    } catch (error) {
        console.error('Error checking alwaysonline status:', error);
        return true;
    }
}

module.exports = {
    alwaysOnlineCommand,
    isAlwaysOnlineEnabled
};
