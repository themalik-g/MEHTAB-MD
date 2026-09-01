const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363409689492071@newsletter',
            newsletterName: 'MEHTAB-MD',
            serverMessageId: -1
        }
    }
};

// Path to store auto status configuration
const configPath = path.join(__dirname, '../data/autoStatus.json');

function readConfig() {
    try {
        if (!fs.existsSync(configPath)) {
            const defaultConfig = { enabled: false, reactOn: false, emoji: '💚' };
            fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!config.emoji) config.emoji = '💚';
        return config;
    } catch (e) {
        return { enabled: false, reactOn: false, emoji: '💚' };
    }
}

function saveConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command can only be used by the owner!',
                ...channelInfo
            });
            return;
        }

        let config = readConfig();

        // If no arguments, show current status
        if (!args || args.length === 0) {
            const status = config.enabled ? 'enabled' : 'disabled';
            const reactStatus = config.reactOn ? 'enabled' : 'disabled';
            const currentEmoji = config.emoji || '💚';
            await sock.sendMessage(chatId, { 
                text: `🔄 *Auto Status Settings*\n\n` +
                      `📱 *Auto Status View:* ${status}\n` +
                      `💫 *Status Reactions:* ${reactStatus}\n` +
                      `🎭 *Reaction Emoji:* ${currentEmoji}\n\n` +
                      `*Commands:*\n` +
                      `• .autostatus on - Enable auto status view\n` +
                      `• .autostatus off - Disable auto status view\n` +
                      `• .autostatus react on - Enable status reactions\n` +
                      `• .autostatus react off - Disable status reactions\n` +
                      `• .autostatus emoji <emoji> - Set custom reaction emoji`,
                ...channelInfo
            });
            return;
        }

        const command = args[0].toLowerCase();
        
        if (command === 'on') {
            config.enabled = true;
            saveConfig(config);
            await sock.sendMessage(chatId, { 
                text: '✅ Auto status view has been enabled!\nBot will now automatically view all contact statuses.',
                ...channelInfo
            });
        } else if (command === 'off') {
            config.enabled = false;
            saveConfig(config);
            await sock.sendMessage(chatId, { 
                text: '❌ Auto status view has been disabled!\nBot will no longer automatically view statuses.',
                ...channelInfo
            });
        } else if (command === 'emoji' || command === 'reactemoji') {
            const newEmoji = args[1]?.trim();
            if (!newEmoji) {
                await sock.sendMessage(chatId, {
                    text: '❌ Please specify an emoji!\nExample: `.autostatus emoji ❤️`',
                    ...channelInfo
                });
                return;
            }
            config.emoji = newEmoji;
            saveConfig(config);
            await sock.sendMessage(chatId, {
                text: `✅ Auto status reaction emoji set to: ${newEmoji}`,
                ...channelInfo
            });
        } else if (command === 'react') {
            if (!args[1]) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Please specify on/off for reactions!\nUse: .autostatus react on/off',
                    ...channelInfo
                });
                return;
            }
            
            const reactCommand = args[1].toLowerCase();
            if (reactCommand === 'on') {
                config.reactOn = true;
                saveConfig(config);
                await sock.sendMessage(chatId, { 
                    text: `💫 Status reactions have been enabled!\nBot will now react to status updates with ${config.emoji || '💚'}.`,
                    ...channelInfo
                });
            } else if (reactCommand === 'off') {
                config.reactOn = false;
                saveConfig(config);
                await sock.sendMessage(chatId, { 
                    text: '❌ Status reactions have been disabled!\nBot will no longer react to status updates.',
                    ...channelInfo
                });
            } else {
                await sock.sendMessage(chatId, { 
                    text: '❌ Invalid reaction command! Use: .autostatus react on/off',
                    ...channelInfo
                });
            }
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ Invalid command! Use:\n.autostatus on/off - Enable/disable auto status view\n.autostatus react on/off - Enable/disable status reactions\n.autostatus emoji <emoji> - Change reaction emoji',
                ...channelInfo
            });
        }

    } catch (error) {
        console.error('Error in autostatus command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error occurred while managing auto status!\n' + error.message,
            ...channelInfo
        });
    }
}

function isAutoStatusEnabled() {
    return readConfig().enabled;
}

function isStatusReactionEnabled() {
    return readConfig().reactOn;
}

function getStatusReactionEmoji() {
    return readConfig().emoji || '💚';
}

// Reacts regardless of the auto-reaction toggle, used by manual commands
async function sendStatusReaction(sock, statusKey, emoji) {
    try {
        const reactionEmoji = emoji || getStatusReactionEmoji();

        await sock.relayMessage(
            'status@broadcast',
            {
                reactionMessage: {
                    key: {
                        remoteJid: 'status@broadcast',
                        id: statusKey.id,
                        participant: statusKey.participant || statusKey.remoteJid,
                        fromMe: false
                    },
                    text: reactionEmoji
                }
            },
            {
                messageId: statusKey.id,
                statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
            }
        );
    } catch (error) {
        console.error('❌ Error reacting to status:', error.message);
    }
}

async function reactToStatus(sock, statusKey) {
    if (!isStatusReactionEnabled()) return;
    await sendStatusReaction(sock, statusKey);
}

// Function to handle status updates
async function handleStatusUpdate(sock, status) {
    try {
        if (!isAutoStatusEnabled()) return;

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Handle status from messages.upsert / status events
        let statusKey = null;

        if (status.messages && status.messages.length > 0) {
            const msg = status.messages[0];
            if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                statusKey = msg.key;
            }
        } else if (status.key && status.key.remoteJid === 'status@broadcast') {
            statusKey = status.key;
        } else if (status.reaction && status.reaction.key.remoteJid === 'status@broadcast') {
            statusKey = status.reaction.key;
        }

        if (statusKey) {
            try {
                await sock.readMessages([statusKey]);
                await reactToStatus(sock, statusKey);
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([statusKey]);
                } else {
                    throw err;
                }
            }
        }
    } catch (error) {
        console.error('❌ Error in auto status view:', error.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate,
    sendStatusReaction,
    getStatusReactionEmoji
};
