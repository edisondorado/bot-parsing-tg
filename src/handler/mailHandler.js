const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");

const bot = require("../bot");
const { UserSchema } = require("../models/Users");

const credentials = require("./credentials.json");
const TOKEN_PATH = "token.json";

const servers = [
    "[01] Phoenix",
    "[02] Tucson",
    "[03] Scottdale",
    "[04] Chandler",
    "[05] Brainburg",
    "[06] Saint Rose",
    "[07] Mesa",
    "[08] Red-Rock",
    "[09] Yuma",
    "[10] Surprise",
    "[11] Prescott",
    "[12] Glendale",
    "[13] Kingman",
    "[14] Winslow",
    "[15] Payson",
    "[16] Gilbert",
    "[17] Show-Low",
    "[18] Casa-Grande",
    "[19] Page",
    "[20] Sun-City",
    "[21] Queen Creek",
    "[22] Sedona",
    "[23] Holiday",
    "[24] Wednesday",
    "[25] Yava",
    "[26] Faraway",
    "[27] Bumble Bee",
    "[28] Christmas",
];

const SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
];

async function authorize() {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new OAuth2Client(
        client_id,
        client_secret,
        redirect_uris[0]
    );

    try {
        const token = fs.readFileSync(TOKEN_PATH);
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    } catch (err) {
        return await getNewToken(oAuth2Client);
    }
}

async function getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
    });

    console.log("Авторизуйтесь, следуя этой ссылке:", authUrl);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve, reject) => {
        rl.question("Введите код сюда: ", async (code) => {
            rl.close();
            try {
                const { tokens } = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokens);
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
                resolve(oAuth2Client);
            } catch (err) {
                reject(err);
            }
        });
    });
}

async function listMessages(auth) {
    const gmail = google.gmail({ version: "v1", auth });
    const response = await gmail.users.messages.list({
        userId: "me",
    });

    const messages = response.data.messages;

    if (messages.length === 0) {
        return;
    } else {
        for (const message of messages) {
            const msg = await gmail.users.messages.get({
                userId: "me",
                id: message.id,
                format: "full",
            });

            if (!msg.data.labelIds.includes("UNREAD")) {
                continue;
            }

            const title = msg.data.snippet;

            const regex =
                /На обработке - ([\w\s-]+)(?:\s*|.+?)(?: от (.+?)(?: Тип проблемы(?:.*?))?)?$/;

            const matches = title.match(regex);

            if (matches && matches.length > 1) {
                const extractedText = matches[1].trim();
                const index = servers.findIndex((server) =>
                    server.toLowerCase().includes(extractedText.toLowerCase())
                );
                if (index !== -1) {
                    const users = await UserSchema.find({
                        server: String(index + 1),
                        active: true,
                    });
                    if (users && users.length > 0) {
                        users.map((item) => {
                            if(item.notification){
                                if(item.accessAdmins && item.isMajor || !item.accessAdmins ){
                                    bot.sendMessage(
                                        item.id,
                                        "[❗️| Оповещения] Была написана новая жалоба в тех.раздел вашего сервера."
                                    );
                                }
                            }
                        });
                    }
                }
            }

            await gmail.users.messages.modify({
                userId: "me",
                id: msg.data.id,
                resource: {
                    removeLabelIds: ["UNREAD"],
                },
            });
        }
    }
}

async function checkForNewMessages(auth) {
    console.log("Проверка новых писем...");
    await listMessages(auth);
}

async function main() {
    try {
        const auth = await authorize();
        setInterval(() => checkForNewMessages(auth), 60000);
    } catch (err) {
        console.error("Ошибка:", err.message);
    }
}

module.exports = main;
