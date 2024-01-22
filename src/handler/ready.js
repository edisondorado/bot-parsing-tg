let botInstance;

function init(bot){
    botInstance = bot;

    console.log("[tech-arizona] Bot is ready!");

    botInstance.on('polling_error', (error) => {
        console.error(`[tech-arizona] Ошибка при опросе: ${error.message}`);
    });
}

module.exports = { init };