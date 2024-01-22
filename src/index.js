const bot = require('./bot');
const main = require("./handler/mailHandler");

bot.startPolling();

main()