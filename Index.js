const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const sock = makeWASocket({ auth: state, printQRInTerminal: true });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        if (text === '.menu') {
            const menu = `*RABBIT XMD MINI (NDX)*\n\n` +
                         `*AI*: .gemini, .gpt\n` +
                         `*ANIME*: .waifu, .neko\n` +
                         `*DOWNLOAD*: .fb, .insta`;
            await sock.sendMessage(from, { text: menu });
        }
    });
}
startBot();
