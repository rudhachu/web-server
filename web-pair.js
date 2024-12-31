const express = require("express");
const fs = require("fs");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
} = require("@whiskeysockets/baileys");
const { upload } = require("./mega");
const { makeid } = require("./id");

const router = express.Router();

// List of available browser configurations
const browserOptions = [
        Browsers.macOS("Safari"),
        Browsers.macOS("Desktop"),
        Browsers.macOS("Chrome"),
        Browsers.macOS("Firefox"),
        Browsers.macOS("Opera"),
];

// Function to pick a random browser
function getRandomBrowser() {
        return browserOptions[Math.floor(Math.random() * browserOptions.length)];
}
// Utility functions
function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { recursive: true, force: true });
  }
}

function generateRandomText() {
  const prefix = "3EB";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomText = prefix;
  for (let i = prefix.length; i < 22; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomText += characters.charAt(randomIndex);
  }
  return randomText;
}

// Route handler
router.get("/", async (req, res) => {
  const id = makeid();
  let num = req.query.number;

  if (!num) {
    return res.status(400).send({ error: "Number is required" });
  }

  async function getPair() {
    const { state, saveCreds } = await useMultiFileAuthState(`./temp/${id}`);
    try {
      const session = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        printQRInTerminal: false,
        generateHighQualityLinkPreview: true,
        logger: pino({ level: "fatal" }),
        syncFullHistory: false,
        browser: getRandomBrowser(), // Assign a random browser
             });

      if (!session.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, "");
        const code = await session.requestPairingCode(num);
        if (!res.headersSent) {
          res.send({ code });
        }
      }

      session.ev.on("creds.update", saveCreds);
      session.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;

        if (connection === "open") {
          const credsPath = `./temp/${id}/creds.json`;
          const randomText = generateRandomText();

          try {
            const megaUrl = await upload(fs.createReadStream(credsPath), `${session.user.id}.json`);
            const stringSession = megaUrl.replace("https://mega.nz/file/", "");
            const sessionMessage = `Rudhra~${stringSession}`;

            const codeMessage = await session.sendMessage(session.user.id, { text: sessionMessage });
            const textMsg = `\n*ᴅᴇᴀʀ ᴜsᴇʀ ᴛʜɪs ɪs ʏᴏᴜʀ sᴇssɪᴏɴ ɪᴅ*\n\n◕ ⚠️ *ᴘʟᴇᴀsᴇ ᴅᴏ ɴᴏᴛ sʜᴀʀᴇ ᴛʜɪs ᴄᴏᴅᴇ ᴡɪᴛʜ ᴀɴʏᴏɴᴇ ᴀs ɪᴛ ᴄᴏɴᴛᴀɪɴs ʀᴇǫᴜɪʀᴇᴅ ᴅᴀᴛᴀ ᴛᴏ ɢᴇᴛ ʏᴏᴜʀ ᴄᴏɴᴛᴀᴄᴛ ᴅᴇᴛᴀɪʟs ᴀɴᴅ ᴀᴄᴄᴇss ʏᴏᴜʀ ᴡʜᴀᴛsᴀᴘᴘ*`;

            await session.sendMessage(
              session.user.id,
              {
                text: textMsg,
                       contextInfo: {
                       externalAdReply: {
                       title: "𝗥𝗨𝗗𝗛𝗥𝗔 𝗦𝗘𝗦𝗦𝗜𝗢𝗡 𝗜𝗗",
                       body: "ʀᴜᴅʜʀᴀ ʙᴏᴛ",
                       thumbnailUrl: "https://i.imgur.com/Zim2VKH.jpeg",
                       sourceUrl: "https://github.com/princerudh/rudhra-bot",
                       mediaUrl: "https://github.com",
                       mediaType: 1,
                       renderLargerThumbnail: false,
                       showAdAttribution: true
                  },
                },
              },
              { quoted: codeMessage }
            );
          } finally {
            await session.ws.close();
            removeFile(`./temp/${id}`);
            console.log(`${session.user.id} connected. Restarting process...`);
            process.exit();
          }
        } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
          await delay(10);
          getPair();
        }
      });
    } catch (err) {
      console.error("Service restarted due to error:", err);
      removeFile(`./temp/${id}`);
      if (!res.headersSent) {
        res.send({ code: "Service Unavailable" });
      }
    }
  }

  await getPair();
});

// Auto-restart process every 30 minutes
setInterval(() => {
  console.log("Restarting process...");
  process.exit();
}, 1800000); // 30 minutes

module.exports = router;