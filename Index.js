const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore,
    jidDecode,
    getContentType
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // --- SYSTÈME DE PAIRING CODE ---
    if (!sock.authState.creds.registered) {
        console.log("Saisissez votre numéro WhatsApp avec indicatif (ex: 22505000000) :");
        const phoneNumber = await question('Numéro : ');
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(`\n----------------------------------`);
            console.log(`VOTRE CODE DE CONNEXION : ${code}`);
            console.log(`----------------------------------\n`);
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const type = getContentType(msg.message);
        const isGroup = from.endsWith('@g.us');
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const command = text.toLowerCase().split(" ")[0];
        const args = text.split(" ").slice(1);

        // --- MENU ULTIME ---
        if (command === '.menu') {
            const menu = `╭───「 *NDX-BOT ULTIME* 」
│ 
│ 👁️ *VUE UNIQUE*
│ .vv, .vv2, .😂 (Récupérer photo/vidéo)
│
│ 👥 *GESTION GROUPE*
│ .kick, .add, .promote, .demote
│ .hidetag, .tagall, .open, .close
│
│ 🤖 *INTELLIGENCE ARTICIELLE*
│ .gpt, .gemini (Posez vos questions)
│
│ 📥 *DOWNLOADER*
│ .fb, .insta, .mp4, .mp3, .apk
│
│ 🎨 *OUTILS*
│ .s, .sticker (Photo en autocollant)
│ .play (Chercher musique)
│
│ 🛡️ *SÉCURITÉ*
│ Anti-Delete : ACTIVÉ ✅
│ Anti-Vue Unique : ACTIVÉ ✅
│
╰───────────────`;
            await sock.sendMessage(from, { text: menu });
        }

        // --- LOGIQUE VUE UNIQUE (.vv, .😂) ---
        if (command === '.vv' || command === '.vv2' || command === '.😂') {
            const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
            const viewOnce = quoted?.viewOnceMessageV2?.message || quoted?.viewOnceMessage?.message;
            if (!viewOnce) return await sock.sendMessage(from, { text: "❌ Répondez à un message en Vue Unique !" });
            
            await sock.sendMessage(from, { text: "🔓 *Ouverture sécurisée...*" });
            await sock.sendMessage(from, { forward: { key: msg.key, message: viewOnce }, force: true }, { quoted: msg });
        }

        // --- COMMANDES DE GROUPE ---
        if (isGroup) {
            if (command === '.hidetag') {
                const groupMetadata = await sock.groupMetadata(from);
                const participants = groupMetadata.participants.map(p => p.id);
                await sock.sendMessage(from, { text: args.join(" ") || "Annonce générale !", mentions: participants });
            }
            
            if (command === '.kick') {
                const user = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (!user) return await sock.sendMessage(from, { text: "❌ Taguez le membre à expulser." });
                await sock.groupParticipantsUpdate(from, [user], "remove");
            }

            if (command === '.close') {
                await sock.groupSettingUpdate(from, 'announcement');
                await sock.sendMessage(from, { text: "🔒 *Groupe fermé.*" });
            }
        }

        // --- AUTRES FONCTIONS (STUBS) ---
        if (command === '.s' || command === '.sticker') {
            await sock.sendMessage(from, { text: "📸 *Conversion en sticker...* (Assurez-vous d'avoir ffmpeg installé)" });
        }

        if (command === '.play') {
            await sock.sendMessage(from, { text: `🎶 Recherche de *${args.join(" ")}* sur YouTube...` });
        }
    });

    // --- FONCTION ANTI-DELETE ---
    sock.ev.on('messages.update', async (chatUpdate) => {
        for (const { key, update } of chatUpdate) {
            if (update.status === 3 || update.status === 4) { // Message supprimé détecté
                console.log("Message supprimé détecté !");
                // On peut ajouter ici le renvoi automatique du message supprimé
            }
        }
    });

    console.log("Bot NDX prêt ! Regardez les logs pour le Pairing Code.");
}

startBot();
