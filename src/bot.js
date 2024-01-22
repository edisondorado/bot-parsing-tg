require("dotenv").config()
const TelegramBot = require("node-telegram-bot-api");
const ready = require("./handler/ready");
const messageHandler = require("./handler/messageHandler");
const db = require('./database/db');
db.then(() => console.log("[tech-arizona] Connected to MongoDB.")).catch((err) =>
  console.log("[tech-arizona]", err)
);

// const token = process.env.TOKEN;

const bot = new TelegramBot("token or by dotenv");

ready.init(bot);
messageHandler.init(bot);

module.exports = bot;