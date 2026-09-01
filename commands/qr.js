const Jimp = require('jimp');
const QRReader = require('qrcode-reader');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function qrCommand(sock, chatId, message, args) {
    try {
        const text = args.join(' ').trim();
        if (text) {
            const qrImageUrl = `https://levanter.onrender.com/gqr?text=${encodeURIComponent(text)}`;
            await sock.sendMessage(chatId, { image: { url: qrImageUrl } }, { quoted: message });
            return;
        }

        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMsg = quoted?.imageMessage || message.message?.imageMessage;

        if (!imageMsg) {
            await sock.sendMessage(chatId, { text: '❌ Usage: Send `.qr <text>` or reply to an image containing a QR code.' }, { quoted: message });
            return;
        }

        const stream = await downloadContentFromMessage(imageMsg, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const imageBuffer = Buffer.concat(chunks);

        const jimpImage = await Jimp.read(imageBuffer);
        const qr = new QRReader();

        qr.callback = async (err, value) => {
            if (err || !value?.result) {
                await sock.sendMessage(chatId, { text: '❌ Could not decode QR code from the image.' }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { text: value.result }, { quoted: message });
            }
        };

        qr.decode(jimpImage.bitmap);

    } catch (error) {
        console.error('Error in qr command:', error);
        await sock.sendMessage(chatId, { text: '❌ Error processing QR code command.' }, { quoted: message });
    }
}

module.exports = qrCommand;
