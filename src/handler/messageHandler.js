const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

const fs = require("fs");
const path = require("path");

const { createReadStream } = require('fs');
const { Readable } = require('stream');

const { UserSchema, TopicSchema } = require("../models/Users");
const loadTable = require("./loadTable");

const lastMessageTime = {};

const cooldownDelay = 3000;

let cookies = {
    '_ga_KQRCJL2214': 'cookie',
    'xf_session': 'cookie',
    'xf_user': 'cookie',
    '_ga': 'cookie',
    'cookie': 'cookie',
    'R3ACTLAB-ARZ1': 'cookie',
    'xf_csrf': 'cookie',
    'xf_tfa_trust': 'cookie',
    '_gid': 'cookie',
};

const cookies_logs = {
    'XSRF-TOKEN': 'cookie',
    'arizonarp_session': 'cookie',
};

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
    "[17] Show Low",
    "[18] Casa-Grande",
    "[19] Page",
    "[20] Sun-City",
    "[21] Queen-Creek",
    "[22] Sedona",
    "[23] Holiday",
    "[24] Wednesday",
    "[25] Yava",
    "[26] Faraway",
    "[27] Bumble Bee",
    "[28] Christmas",
    "[101] Mobile 1",
    "[102] Mobile 2",
    "[103] Mobile 3",
];

const serversLink = [
    "https://forum.arizona-rp.com/forums/1865/",
    "https://forum.arizona-rp.com/forums/1866/",
    "https://forum.arizona-rp.com/forums/1867/",
    "https://forum.arizona-rp.com/forums/1195/",
    "https://forum.arizona-rp.com/forums/1196/",
    "https://forum.arizona-rp.com/forums/1198/",
    "https://forum.arizona-rp.com/forums/1189/",
    "https://forum.arizona-rp.com/forums/1199/",
    "https://forum.arizona-rp.com/forums/1200/",
    "https://forum.arizona-rp.com/forums/1108/",
    "https://forum.arizona-rp.com/forums/1166/",
    "https://forum.arizona-rp.com/forums/1282/",
    "https://forum.arizona-rp.com/forums/1292/",
    "https://forum.arizona-rp.com/forums/1408/",
    "https://forum.arizona-rp.com/forums/1526/",
    "https://forum.arizona-rp.com/forums/1584/",
    "https://forum.arizona-rp.com/forums/1686/",
    "https://forum.arizona-rp.com/forums/1852/",
    "https://forum.arizona-rp.com/forums/1964/",
    "https://forum.arizona-rp.com/forums/2043/",
    "https://forum.arizona-rp.com/forums/2199/",
    "https://forum.arizona-rp.com/forums/2353/",
    "https://forum.arizona-rp.com/forums/2465/",
    "https://forum.arizona-rp.com/forums/2623/",
    "https://forum.arizona-rp.com/forums/2791/",
    "https://forum.arizona-rp.com/forums/2976/",
    "https://forum.arizona-rp.com/forums/3075/",
    "https://forum.arizona-rp.com/forums/3168/",
    "https://forum.arizona-rp.com/forums/2115/",
    "https://forum.arizona-rp.com/forums/2267/",
    "https://forum.arizona-rp.com/forums/2446/"
];

function init(bot) {
    bot.on("callback_query", async function onCallbackQuery(callbackQuery) {
        const data = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;
        const user = await UserSchema.findOne({ id: chatId });

        if (lastMessageTime[chatId]) {
          const currentTime = new Date().getTime();
          const elapsedTime = currentTime - lastMessageTime[chatId];

          if (elapsedTime < cooldownDelay) {
            bot.sendMessage(chatId, "*[❌ | Ошибка]* Не флуди!", {parse_mode: "Markdown"})
            console.log(
                `Игнорируем сообщение от пользователя ${chatId} из-за задержки`
            );
            return;
          }
        }

        lastMessageTime[chatId] = new Date().getTime();

        const serverArray = data.match(/\d+/g);
        const server = serverArray ? serverArray.map(Number) : null;
        if(data === "menu"){
            const messageOptions = {
                reply_markup: {
                    keyboard: [],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            };

            if (user.isTech && user.isMajor) {
                messageOptions.reply_markup.keyboard.push([{ text: "👤 Статистика" }, { text: "🛠️ Жалобы" }, { text: "📌 Выдача" }]);
            } else {
                messageOptions.reply_markup.keyboard.push([{ text: "👤 Статистика" }, { text: "🛠️ Жалобы" }]);
            }
            
            messageOptions.reply_markup.keyboard.push([{ text: "📞 Поддержка" }]);

            return bot.sendMessage(chatId, "Выберите опцию из меню: ", messageOptions); 
        }
        if (server && server[0]) {
            if (data.startsWith("pinned")) {
                const browser = await puppeteer.launch({
                    args: ["--no-sandbox"]
                });

                const page = await browser.newPage();
    
                await page.setCookie(...Object.keys(cookies).map(name => ({
                    name,
                    value: cookies[name],
                    domain: 'forum.arizona-rp.com',
                })));
                
                await page.goto(parseInt(server[0]) === 101 || parseInt(server[0]) === 102 || parseInt(server[0]) === 103 ? serversLink[parseInt(server[0]) - 73] : serversLink[parseInt(server[0]) - 1]);
                await page.waitForSelector(".p-footer-inner");

                const $ = cheerio.load(await page.content());

                const extractedData = [];

                const divsWithDynamicAuthorInStickyContainer = $(
                    'div.structItemContainer.sticky div[class^="structItem structItem--thread"][data-author]'
                );

                divsWithDynamicAuthorInStickyContainer.each(
                    (index, element) => {
                        const hasLockedStatus =
                            $(element).find(
                                "i.structItem-status.structItem-status--locked"
                            ).length > 0;

                        const linkElement = $(element).find(
                            'a[data-tp-primary="on"]'
                        );
                        const linkHref = linkElement.attr("href");
                        const linkText = linkElement.text();

                        const createdAtElement = $(element).find("time.u-dt");
                        const createdAt = createdAtElement.attr("data-time");

                        const lastUpdateElement = $(element).find(
                            "time.structItem-latestDate.u-dt"
                        );
                        const lastUpdate = lastUpdateElement.attr("data-time");

                        if (!hasLockedStatus) {
                            const dataObject = {
                                link: {
                                    href: linkHref,
                                    text: linkText,
                                },
                                createdAt,
                                lastUpdate,
                            };
                            extractedData.push(dataObject);
                        }
                    }
                );

                await page.close();

                await browser.close();

                const messageOptions = {
                    reply_markup: {
                        inline_keyboard: extractedData.map((item) => [
                            {
                                text: `${item.link.text} | ${Math.round(
                                    (new Date() -
                                        new Date(item.createdAt * 1000)) /
                                        (1000 * 60 * 60)
                                )} часов`,
                                callback_data: item.link.href,
                            },
                        ]),
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                    parse_mode: "Markdown",
                };
                bot.sendMessage(
                    chatId,
                    `Всего:  \`${extractedData.length} жалоб\`\nВыберите жалобу:`,
                    messageOptions
                );
            } else if (data.startsWith("unpinned")) {
                const extractDataFromPage = async (page) => {
                    await page.waitForSelector(".p-footer-inner");

                    const $ = cheerio.load(await page.content());

                    const divsWithoutStatusIcons = $(
                        "div.structItem.structItem--thread:not(:has(i.structItem-status.structItem-status--sticky, i.structItem-status.structItem-status--locked))"
                    );

                    const extractedData = [];

                    divsWithoutStatusIcons.each((index, element) => {
                        const linkElement = $(element).find(
                            'a[data-tp-primary="on"]'
                        );
                        const linkHref = linkElement.attr("href");
                        const linkText = linkElement.text();

                        const timeElement = $(element).find("time.u-dt");
                        const dataTime = timeElement.attr("data-time");

                        extractedData.push({
                            href: linkHref,
                            text: linkText,
                            dataTime: dataTime,
                        });
                    });

                    return extractedData;
                };

                const processPages = async () => {
                    const browser = await puppeteer.launch({
                        args: ["--no-sandbox"]
                    });

                    const page = await browser.newPage();
        
                    await page.setCookie(...Object.keys(cookies).map(name => ({
                        name,
                        value: cookies[name],
                        domain: 'forum.arizona-rp.com',
                    })));

                    const allExtractedData = [];

                    for (let i = 1; i <= 5; i++) {
                        const currentPageLink = `${
                            parseInt(server[0]) === 101 || parseInt(server[0]) === 102 || parseInt(server[0]) === 103 ? serversLink[parseInt(server[0]) - 73] : serversLink[parseInt(server[0]) - 1]
                        }page-${i}`;
                        console.log(currentPageLink);
                        await page.goto(currentPageLink);
                        const extractedData = await extractDataFromPage(page);
                        allExtractedData.push(...extractedData);
                        console.log(`Data from page ${i}:`, extractedData);
                    }

                    console.log("All extracted data:", allExtractedData);

                    const messageOptions = {
                        reply_markup: {
                            inline_keyboard: allExtractedData.map((item) => [
                                {
                                    text: `${item.text} | ${Math.round(
                                        (new Date() -
                                            new Date(item.dataTime * 1000)) /
                                            (1000 * 60 * 60)
                                    )} часов`,
                                    callback_data: item.href,
                                },
                            ]),
                            resize_keyboard: true,
                            one_time_keyboard: true,
                        },
                        parse_mode: "Markdown",
                    };

                    bot.sendMessage(
                        chatId,
                        `Всего:  \`${allExtractedData.length} жалоб\`\nВыберите жалобу:`,
                        messageOptions
                    );

                    await browser.close();
                };

                processPages();
            } else if (data.startsWith("old")) {
                const extractDataFromPage = async (page) => {
                    await page.waitForSelector(".p-footer-inner");

                    const $ = cheerio.load(await page.content());

                    const threads = await page.$$(".structItem--thread");
                    const olderThan24HoursThreads = [];

                    for (const thread of threads) {
                        const timeElement = await thread.$("time[data-time]");
                        const dataTime = await timeElement.evaluate((el) =>
                            el.getAttribute("data-time")
                        );

                        const currentTime = new Date().getTime();
                        const threadTime = parseInt(dataTime) * 1000;
                        const isLocked = await thread.$(
                            "li > i.structItem-status--locked"
                        );

                        if (!isLocked) {
                            if (
                                currentTime - threadTime >
                                24 * 60 * 60 * 1000
                            ) {
                                const linkElement = await thread.$(
                                    'a[data-tp-primary="on"]'
                                );
                                const threadLink = await linkElement.evaluate(
                                    (el) => el.getAttribute("href")
                                );
                                const threadText = await linkElement.evaluate(
                                    (el) => el.innerText
                                );

                                olderThan24HoursThreads.push({
                                    text: threadText,
                                    href: threadLink,
                                    time: dataTime,
                                });
                            }
                        }
                    }

                    return olderThan24HoursThreads;
                };

                const processPages = async () => {
                    const browser = await puppeteer.launch({
                        args: ["--no-sandbox"]
                    });

                    const page = await browser.newPage();

                    await page.setCookie(...Object.keys(cookies).map(name => ({
                        name,
                        value: cookies[name],
                        domain: 'forum.arizona-rp.com',
                    })));

                    const allExtractedData = [];

                    for (let i = 1; i <= 5; i++) {
                        const currentPageLink = `${
                            parseInt(server[0]) === 101 || parseInt(server[0]) === 102 || parseInt(server[0]) === 103 ? serversLink[parseInt(server[0]) - 73] : serversLink[parseInt(server[0]) - 1]
                        }page-${i}`;
                        console.log(currentPageLink);
                        await page.goto(currentPageLink);
                        const extractedData = await extractDataFromPage(page);
                        allExtractedData.push(...extractedData);
                        console.log(`Data from page ${i}:`, extractedData);
                    }

                    console.log("All extracted data:", allExtractedData);

                    const messageOptions = {
                        reply_markup: {
                            inline_keyboard: allExtractedData.map((item) => [
                                {
                                    text: `${item.text} | ${Math.round(
                                        (new Date() -
                                            new Date(item.time * 1000)) /
                                            (1000 * 60 * 60)
                                    )} часов`,
                                    callback_data: item.href,
                                },
                            ]),
                            resize_keyboard: true,
                            one_time_keyboard: true,
                        },
                        parse_mode: "Markdown",
                    };

                    bot.sendMessage(
                        chatId,
                        `Всего:  \`${allExtractedData.length} жалоб\`\nВыберите жалобу:`,
                        messageOptions
                    );
                    await browser.close();
                };

                processPages();
            } else if (data.startsWith("stats")) {
                const extractAverageClosingTime = async (page) => {
                    await page.waitForSelector(".p-footer-inner");
                  
                    const $ = cheerio.load(await page.content());
                  
                    const closingTimes = [];
                    
                    // Выбираем все элементы с закрытыми темами
                    const closedThreads = $("div.structItem.structItem--thread.is-locked");
                  
                    closedThreads.each((index, element) => {
                      // Находим время открытия темы
                      const openTimeElement = $(element).find("time.u-dt");
                      const openTime = parseInt(openTimeElement.attr("data-time"), 10);
                  
                      // Находим время закрытия темы
                      const closeTimeElement = $(element).find("time.structItem-latestDate.u-dt");
                      const closeTime = parseInt(closeTimeElement.attr("data-time"), 10);
                  
                      // Проверяем, что оба времени найдены
                      if (!isNaN(openTime) && !isNaN(closeTime)) {
                        // Рассчитываем разницу во времени в секундах и добавляем в массив
                        const timeDifference = closeTime - openTime;
                        closingTimes.push(timeDifference);
                      }
                    });
                  
                    // Рассчитываем среднее арифметическое времени закрытия тем
                    const averageClosingTime = closingTimes.length > 0
                      ? closingTimes.reduce((acc, time) => acc + time, 0) / closingTimes.length
                      : 0;
                  
                    return averageClosingTime;
                };
                  
                const extractDataFromPage = async (page) => {
                    await page.waitForSelector(".p-footer-inner");

                    const $ = cheerio.load(await page.content());

                    const currentTime = Math.floor(Date.now() / 1000);
                    const maxAllowedTime = currentTime - 7 * 24 * 60 * 60;
                    const counter = {};

                    const divsWithLockedStatus = $(
                        "div.structItem.structItem--thread.is-locked:not(:has(i.structItem-status.structItem-status--sticky))"
                    );

                    divsWithLockedStatus.each((index, element) => {
                        const timeElement = $(element).find(
                            "time.structItem-latestDate.u-dt"
                        );
                        const dataTime = parseInt(
                            timeElement.attr("data-time"),
                            10
                        );

                        if (dataTime >= maxAllowedTime) {
                            const authorElement = $(element).find(
                                "span.username--style76"
                            );
                            const authorUsername = authorElement.text();

                            if (authorUsername) {
                                counter[authorUsername] =
                                    (counter[authorUsername] || 0) + 1;
                            }
                        }
                    });

                    return counter;
                };

                const processPages = async () => {
                    const browser = await puppeteer.launch({
                        args: ["--no-sandbox"]
                    });
        
                    const page = await browser.newPage();
        
                    await page.setCookie(...Object.keys(cookies).map(name => ({
                        name,
                        value: cookies[name],
                        domain: 'forum.arizona-rp.com',
                    })));

                    let allExtractedData = [];
                    let extractedClosingTime = [];

                    for (let i = 1; i <= 30; i++) {
                        const currentPageLink = `${
                            parseInt(server[0]) === 101 || parseInt(server[0]) === 102 || parseInt(server[0]) === 103 ? serversLink[parseInt(server[0]) - 73] : serversLink[parseInt(server[0]) - 1]
                        }page-${i}`;
                        await page.goto(currentPageLink);

                        const averageClosingTime = await extractAverageClosingTime(page)
                        const extractedData = await extractDataFromPage(page);

                        extractedClosingTime.push(averageClosingTime);
                        allExtractedData.push(extractedData);
                    }

                    const averageTimeInMilliseconds = extractedClosingTime.reduce((acc, time) => acc + time, 0) / extractedClosingTime.length;
                    const averageTimeInHours = averageTimeInMilliseconds / (60 * 60);

                    const flatExtractedData = allExtractedData.flat();

                    const sumObject = {};

                    flatExtractedData.forEach((obj) => {
                        Object.entries(obj).forEach(([key, value]) => {
                            sumObject[key] = (sumObject[key] || 0) + value;
                        });
                    });

                    let totalSum = 0;

                    flatExtractedData.forEach((obj) => {
                        Object.values(obj).forEach((value) => {
                            totalSum += value;
                        });
                    });

                    const statString = Object.entries(sumObject)
                        .map(([key, value]) => {
                            const percent = (value / totalSum) * 100;
                            return `\`${key}: ${value} жалоб (${percent.toFixed(2)}%)\``;
                        })
                        .join("\n");

                    bot.sendMessage(
                        chatId,
                        `👤 *Статистика:*\n\n${statString}\n\n*Среднее время на одну жалобу:*  \`${Math.floor(averageTimeInHours)} часов\`\n*Всего жалоб:* \`${totalSum}\``,
                        { parse_mode: "Markdown" }
                    );
                    await browser.close();
                };

                processPages();
            } else if (data.startsWith("change_active")){
              bot.deleteMessage(chatId, callbackQuery.message.message_id)
              const user = await UserSchema.findOne({ id: server })
              if(user){
                console.log(user)
                user.active = !user.active;
                user.save();
                profileUser(bot, chatId, user);
              } else {
                bot.sendMessage(chatId, "Произошла ошибка при изменении профиля")
              }
            } else if (data.startsWith("change_admin")){
              bot.deleteMessage(chatId, callbackQuery.message.message_id)
              const user = await UserSchema.findOne({ id: server })
              if(user){
                console.log(user)
                user.admin = !user.admin;
                user.save();
                profileUser(bot, chatId, user);
              } else {
                bot.sendMessage(chatId, "Произошла ошибка при изменении профиля")
              }
            } else if (data.startsWith("change_major")){
              bot.deleteMessage(chatId, callbackQuery.message.message_id)
              const user = await UserSchema.findOne({ id: server })
              if(user){
                console.log(user)
                user.isMajor = !user.isMajor;
                user.save();
                profileUser(bot, chatId, user);
              } else {
                bot.sendMessage(chatId, "Произошла ошибка при изменении профиля")
              }
            } else if (data.startsWith("delete_profile")){
              bot.deleteMessage(chatId, callbackQuery.message.message_id)
              const user = await UserSchema.deleteOne({ id: server })
                .then((result) => {
                  bot.sendMessage(chatId, "Профиль успешно удален!")
                })
                .catch((error) => {
                  console.log(error)
                  bot.sendMessage(chatId, "Произошла ошибка при удалении профиля!")
                })
            } else if (data.startsWith("change_server")){
              bot.sendMessage(chatId, "Введите новый сервер:")
              bot.once('message', async (response) => {
                const newServer = response.text || '0';
    
                const user = await UserSchema.findOne({
                    id: server
                });

                user.server = newServer;
                user.save()

                bot.deleteMessage(chatId, callbackQuery.message.message_id)
    
                profileUser(bot, chatId, user);
              });
            } else if (data.startsWith("change_nickname")){
              bot.sendMessage(chatId, "Введите новый никнейм:")
              bot.once('message', async (response) => {
                const newNick = response.text || '0';
    
                const user = await UserSchema.findOne({
                    id: server
                });

                user.nick = newNick;
                user.save()

                bot.deleteMessage(chatId, callbackQuery.message.message_id)
    
                profileUser(bot, chatId, user);
              });
            } else if (data.startsWith("offerAnswer")){
              const topic = await TopicSchema.findOne({ id: server })
              bot.sendMessage(chatId, "Введите предложенный ответ:")
              bot.once('message', async (response) => {
                const newAnswer = response.text || '0';

                topic.answers.push({answer: newAnswer, author: user.nick});
                topic.save()
                
                bot.sendMessage(chatId, "Ответ успешно записан.")
              });
            } else if (data.startsWith("answers")){
              const topic = await TopicSchema.findOne({ id: server })
              
              topic.answers.map((item) => {
                const messageOptions = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "✅ Одобрить",
                                    callback_data: `acceptOffer/${server}/${item.author}`,
                                },
                                {
                                    text: "❌ Отказать",
                                    callback_data: `declineOffer/${server}/${item.author}`,
                                },
                            ],
                        ],
                    },
                    parse_mode: "Markdown",
                };
                bot.sendMessage(chatId, `Автор: \`${item.author}\`\n\nОтвет:\n\`\`\`\n${item.answer}\`\`\``, messageOptions)
              })
            } else if (data.startsWith("request")){
                const [idle, active] = await loadTable()

                const serverIndex = server[0]-1;
                console.log(serverIndex);
                
                bot.sendMessage(
                    chatId,
                    `📌* Выдача:*\n\n*Всего заявок на выдаче:*  \`${idle[serverIndex] + active[serverIndex]}\`\n\n*На рассмотрении:*  \`${idle[serverIndex]}\`\n*Ожидают выдачи:*  \`${active[serverIndex]}\``,
                    {parse_mode: "Markdown"}
                );
            } else if (data.startsWith("screen") && user.active && user.isMajor){
                const link = parseInt(server[0]) === 101 || parseInt(server[0]) === 102 || parseInt(server[0]) === 103 ? serversLink[parseInt(server[0]) - 73] : serversLink[parseInt(server[0]) - 1]
                console.log(parseInt(server[0]) === 101)
                const browser = await puppeteer.launch({
                    args: ["--no-sandbox"]
                });
    
                const page = await browser.newPage();
    
                await page.setCookie(...Object.keys(cookies).map(name => ({
                    name,
                    value: cookies[name],
                    domain: 'forum.arizona-rp.com',
                })));
                
                await page.goto(link);
                await page.waitForNavigation();
    
                const screenshotBuffer = await page.screenshot({ fullPage: true });
    
                const fileName = `screenshot_${Date.now()}.png`;
    
                fs.writeFileSync(fileName, screenshotBuffer);
    
                const screenshotStream = fs.createReadStream(fileName);
    
                bot.sendPhoto(chatId, screenshotStream, { caption: 'Скриншот раздела:' })
                    .then(() => {
                        fs.unlinkSync(fileName);
                    })
                    .catch((error) => {
                        console.error('Error sending photo:', error);
                    });
    
                await page.close();
    
                await browser.close();
            } else if (data.startsWith("pin_thread") && user.active && user.isMajor){
                const link = `https://forum.arizona-rp.com/threads/${server}`;

                const browser = await puppeteer.launch({
                    args: ["--no-sandbox"]
                });

                const page = await browser.newPage();

                await page.setCookie(...Object.keys(cookies).map(name => ({
                    name,
                    value: cookies[name],
                    domain: 'forum.arizona-rp.com',
                })));

                await page.goto(link);

                await page.waitForNavigation();

                const possibleButtonTexts = ['Закрепить тему', 'Открепить тему'];

                const clickedButtonText = await page.evaluate((possibleButtonTexts) => {
                    const buttons = [...document.querySelectorAll('.menu-linkRow')];
                
                    for (const buttonText of possibleButtonTexts) {
                      const button = buttons.find(el => el.textContent.trim() === buttonText);
                
                      if (button) {
                        button.click();
                        return buttonText;
                      }
                    }
                
                    return null;
                }, possibleButtonTexts);
                
                if (clickedButtonText) {
                    console.log(`Clicked button text: ${clickedButtonText}`);
                } else {
                    console.log('No matching button found.');
                }

                bot.sendMessage(chatId, `[✅] Вы успешно ${clickedButtonText === "Открепить тему" ? "открепили" : "закрепили"} тему.`)

                await page.close();

                await browser.close();
            } else if (data.startsWith("get_ip") && user.active && user.isMajor){
                const browser = await puppeteer.launch({
                    args: ["--no-sandbox"]
                });

                const page = await browser.newPage();
    
                await page.setCookie(...Object.keys(cookies).map(name => ({
                    name,
                    value: cookies[name],
                    domain: 'forum.arizona-rp.com',
                })));

                await page.goto(`https://forum.arizona-rp.com/members/${server}/user-ips`);
                await page.waitForSelector(".p-footer-inner");

                const $ = cheerio.load(await page.content());

                const ipData = await page.evaluate(() => {
                    const ipRows = document.querySelectorAll('.dataList-row:not(.dataList-row--header)');
                
                    const ipDataArray = [];
                
                    ipRows.forEach(ipRow => {
                        const ipElement = ipRow.querySelector('.dataList-cell--link a');
                        const ip = ipElement.textContent.trim();
                
                        const totalAccess = parseInt(ipRow.querySelector('.dataList-cell:nth-child(2)').textContent.trim(), 10);
                
                        ipDataArray.push({
                            ip,
                            totalAccess
                        });
                    });
                
                    return ipDataArray;
                });

                const ipDataWithLocation = await enrichIpDataWithLocation(ipData);

                bot.sendMessage(chatId, `Все авторизации на форумный аккаунт:\n\n${ipDataWithLocation.map(item => `IP: ${item.ip} | Заходов: ${item.totalAccess} | ${item.location.country} - ${item.location.city}`).join('\n')}`);

                await page.close();

                await browser.close();
            } else if (data.startsWith("change_accessAdmins")){
                bot.deleteMessage(chatId, callbackQuery.message.message_id)
                const user = await UserSchema.findOne({ id: server })
                if(user){
                    user.accessAdmins = !user.accessAdmins;
                    user.save();
                    profileUser(bot, chatId, user);
                } else {
                    bot.sendMessage(chatId, "Произошла ошибка при изменении профиля")
                }
            } else if (data.startsWith("tech")){
                for (let i = 0; i < servers.length; i++) {
                    const serverInt = i + 1
                    if (serverInt === server[0] && user.admin) {
                        const messageOptions = {
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        {
                                            text: "Жалобы в закрепе",
                                            callback_data: "pinned/" + serverInt,
                                        },
                                        {
                                            text: "Жалобы ниже закрепа",
                                            callback_data: "unpinned/" + serverInt,
                                        },
                                    ],
                                    [
                                        {
                                            text: "Старые жалобы (1+ день)",
                                            callback_data: "old/" + serverInt,
                                        },
                                        {
                                            text: "Статистика (7 дней)",
                                            callback_data: "stats/" + serverInt,
                                        },
                                    ],
                                    [
                                        {
                                            text: "Скриншот раздела",
                                            callback_data: "screen/" + serverInt,
                                        }
                                    ],
                                ],
                                resize_keyboard: true,
                                one_time_keyboard: true,
                            },
                        };
                        bot.sendMessage(
                            chatId,
                            "Выберите раздел жалоб:",
                            messageOptions
                        );
                    }
                }
            } else if (data.startsWith("admins")){
                for (let i = 0; i < servers.length; i++) {
                    const serverInt = i + 1
                    if (serverInt === server[0] && user.admin) {
                        const messageOptions = {
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        {
                                            text: "Жалобы в закрепе",
                                            callback_data: "pinned/" + serverInt,
                                        },
                                        {
                                            text: "Жалобы ниже закрепа",
                                            callback_data: "unpinned/" + serverInt,
                                        },
                                    ],
                                    [
                                        {
                                            text: "Старые жалобы (1+ день)",
                                            callback_data: "old/" + serverInt,
                                        },
                                        {
                                            text: "Статистика (7 дней)",
                                            callback_data: "stats/" + serverInt,
                                        },
                                    ],
                                    [
                                        {
                                            text: "Скриншот раздела",
                                            callback_data: "screen/" + serverInt,
                                        }
                                    ],
                                ],
                                resize_keyboard: true,
                                one_time_keyboard: true,
                            },
                        };
                        bot.sendMessage(
                            chatId,
                            "Выберите раздел жалоб:",
                            messageOptions
                        );
                    }
                }
            } else if (data.startsWith("change_isTech")){
                bot.deleteMessage(chatId, callbackQuery.message.message_id)
                const user = await UserSchema.findOne({ id: server })
                if(user){
                    user.isTech = !user.isTech;
                    user.save();
                    profileUser(bot, chatId, user);
                } else {
                    bot.sendMessage(chatId, "Произошла ошибка при изменении профиля")
                }
            }
        }
        if (data.startsWith("/threads")) {
            console.time("ScriptExecutionTime");
            const link = `https://forum.arizona-rp.com${data}`;

            const browser = await puppeteer.launch({
                args: ["--no-sandbox"]
            });

            const page = await browser.newPage();

            await page.setCookie(...Object.keys(cookies).map(name => ({
                name,
                value: cookies[name],
                domain: 'forum.arizona-rp.com',
            })));

            await page.goto(link);
            await page.waitForNavigation();

            const $ = cheerio.load(await page.content());

            const posts = $("article.message.message--post").first();

            const extractedData = [];

            posts.each((index, element) => {
                const messageMainElement = $(element).find(
                    "div.message-main.js-quickEditTarget"
                );

                const messageProfileElement = $(element).find("div.message-cell.message-cell--user");

                const userIdElement = messageProfileElement.find("h4.message-name a");
                const userIdMatch = userIdElement.attr("data-user-id");
            
                const messageMainText = messageMainElement.text();
            
                const typeOfProblemMatch = messageMainText.match(
                    /Тип проблемы:\s*([^\n]+)/
                );
                const nicknameMatch = messageMainText.match(/Игровой ник:\s*([^\n]+)/);
                const dateTimeMatch = messageMainText.match(/Дата:\s*([^\n]+)/);
                const situationMatch = messageMainText.match(
                    /Описание ситуации:\s*([^\n]+)/
                );
                const proofsMatch = messageMainText.match(/Доказательства:\s*([^\n]+)/);
            
                const createdAtElement = messageMainElement.find("time.u-dt");
                const createdAtUnixTimestamp = createdAtElement.attr("data-time");
            
                const lastPostElement = $("article.message--post").last();
            
                const timeElement = lastPostElement.find("time.u-dt");
                const dataTime = timeElement.attr("data-time");
            
                const dataObject = {
                    userId: userIdMatch ? userIdMatch.trim() : null,
                    typeOfProblem: typeOfProblemMatch
                        ? typeOfProblemMatch[1].trim()
                        : null,
                    nickname: nicknameMatch ? nicknameMatch[1].trim() : null,
                    dateTime: dateTimeMatch ? dateTimeMatch[1].trim() : null,
                    situation: situationMatch ? situationMatch[1].trim() : null,
                    proofs: proofsMatch ? proofsMatch[1].trim() : null,
                    createdAt: createdAtUnixTimestamp,
                    lastUpdate: dataTime,
                };
            
                extractedData.push(dataObject);
            });

            await page.evaluate(() => {
                const noticeDiv = document.querySelector("div.u-bottomFixer");
                if (noticeDiv) {
                    noticeDiv.style.display = "none";
                }
                const canvasElement = document.querySelector(
                    "canvas.js-thHolidaysSnowstormCanvas"
                );
                if (canvasElement) {
                    canvasElement.style.display = "none";
                }
            });

            const threadIdMatch = link.match(/threads\/(\d+)/);

            const threadId = threadIdMatch ? threadIdMatch[1] : "unknown";

            const screenshotPath = `/root/bots/TechArizona/screens/${threadId}.png`;

            // await page.setViewport({ width: 1920, height: 1080 });
            await page.screenshot({ path: screenshotPath, fullPage: true });
            const messageOptions = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "📷 Посмотреть скриншот",
                                callback_data: `/screens/${threadId}.png`,
                            },
                        ],
                    ],
                },
                parse_mode: "Markdown",
            };
            if(user.server === "19"){
                if(!user.isMajor){
                  const regex = /\/threads\/(\d+)\/$/;
    
                  const match = data.match(regex);
    
                  if (match && match[1]) {
                      const extractedNumber = match[1];
                      console.log(extractedNumber);
                      const topic = await TopicSchema.findOne({ id: extractedNumber })
                      if(!topic){
                        const newTopic = await TopicSchema.create({
                          id: extractedNumber,
                        });
            
                        const savedTopic = await newTopic.save();
                        messageOptions.reply_markup.inline_keyboard.push([{text: "🛠️ Предложить ответ на жалобу", callback_data: `offerAnswer/${extractedNumber}`}]);
                      } else {
                        messageOptions.reply_markup.inline_keyboard.push([{text: "🛠️ Предложить ответ на жалобу", callback_data: `offerAnswer/${extractedNumber}`}]);
                      }
                  }
                } else{
                  const regex = /\/threads\/(\d+)\/$/;
    
                  const match = data.match(regex);
    
                  if (match && match[1]) {
                      const extractedNumber = match[1];
                      console.log(extractedNumber);
                      const topic = await TopicSchema.findOne({ id: extractedNumber })
                      if(!topic){
                        const newTopic = await TopicSchema.create({
                          id: extractedNumber,
                        });
            
                        const savedTopic = await newTopic.save();
                      }
                      if (topic && topic.answers && topic.answers.length > 0) messageOptions.reply_markup.inline_keyboard.push([{text: "🛠️ Посмотреть предложенные ответы", callback_data: `answers/${extractedNumber}`}]);
                  }
                }
            }
            console.log(extractedData[0])
            if(user.isMajor){
                messageOptions.reply_markup.inline_keyboard.push([{text: "📌 Закрепить/Открепить жалобу", callback_data: `pin_thread/${threadId}`}, { text: "🔐 Узнать IP автора", callback_data: `get_ip/${extractedData[0].userId}` }]);
            }

            function escapeMarkdown(text) {
                if (typeof text !== "string") {
                    return text;
                }
                return text.replace(/[_*[\]()~`>#+-=|{}.!]/g, "\\$&");
            }

            bot.sendMessage(
                chatId,
                `📌 *Жалоба*:\n\n*Тип проблемы:*  \`${extractedData[0].typeOfProblem ? extractedData[0].typeOfProblem : ""}\`\n*Игровой ник:*  \`${extractedData[0].nickname ? extractedData[0].nickname : ""}\`\n*Дата:*  \`${extractedData[0].dateTime} - ${extractedData[0].createdAt ? Math.round((new Date() - new Date(extractedData[0].createdAt * 1000)) / (1000 * 60 * 60)) : ""} часов\`\n*Описание ситуации:*  \`${extractedData[0].situation ? extractedData[0].situation : ""}\`\n*Доказательства:* \`${extractedData[0].proofs ? extractedData[0].proofs : ""}\`\n\n*Ссылка:* ${link ? link : ""}\n*Последнее сообщение:* \`${escapeMarkdown(extractedData[0].lastUpdate ? Math.round((new Date() - new Date(extractedData[0].lastUpdate * 1000)) / (1000 * 60 * 60)) : "")} часов назад\``,
                messageOptions
            );
            console.timeEnd("ScriptExecutionTime");

            await page.close();

            await browser.close();
        }
        const linkMatch = data.match(/\/screens\/(.+)/);
        if (linkMatch && linkMatch[1]) {
            const link = linkMatch[1];
            const filePath = path.join(
                "/",
                "root",
                "bots",
                "TechArizona",
                "screens",
                link
            );

            if (fs.existsSync(filePath)) {
                const photoStream = fs.createReadStream(filePath);
                await bot.sendPhoto(chatId, photoStream, {
                    caption: "Ваш скриншот",
                    parse_mode: "Markdown",
                });

                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error("Ошибка при удалении файла:", err);
                    } else {
                        console.log("Файл успешно удален:", filePath);
                    }
                });
            } else {
                console.error("Файл не существует:", filePath);
            }
        }
        if (data.startsWith("help_change")){
            bot.sendMessage(chatId, "*Описание статусов пользователя:*\n\nID - используется как UID для редактирования профиля, также возможен поиск по нему через /findUser\nСервер - определяет к какому серверу будет доступ для получения жалоб на форуме\nАктивен - стоит ли пользователь на своей должности\nТех.Администратор - определяет будет ли доступ к разделу Выдачи и Жалоб в тех.разделе\nАдмин - доступ ко всем серверам и разделам, редактирование профилей и их удаление\nОтветственный - доступ к просмотру IP автора жалобы/закрепление тем/онлайна с Vice-City(/vc)\nДоступ к жалобам на администрацию - выдается всем кураторам и выше, для доступа к разделе жалоб на администрацию", {parse_mode: "Markdown"})
        }
        if(data.startsWith("techSection") || data.startsWith("adminsSection")){
            if(!user.active && !user.admin){
                return bot.sendMessage(chatId, "У вас нет доступа к данному разделу!")
            }

            const groupedServers = servers.reduce((acc, curr, index) => {
                const groupIndex = Math.floor(index / 4);

                if (!acc[groupIndex]) {
                    acc[groupIndex] = [];
                }

                acc[groupIndex].push({ text: curr, callback_data: data.startsWith("techSection") ? `tech/${index+1}` : `admins/${index+1}` });

                return acc;
            }, []);

            groupedServers.push([{ text: "Меню", callback_data: "menu" }]);

            const messageOptions = {
                reply_markup: {
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            };

            messageOptions.reply_markup.inline_keyboard = groupedServers;

            bot.sendMessage(chatId, "Выберите сервер:", messageOptions)
        }
        const regex = /\/([^\/]+)\/(.+)/;

        const match = data.match(regex);

        if (match && match.length === 3 && user.isMajor && user.active && user.server === "19") {
            const topic = match[1];
            const author = match[2];
            const userTopic = await UserSchema.findOne({ nick: author })
            if(data.startsWith("acceptOffer")){
                if(!userTopic){
                    return bot.sendMessage(chatId, "Произошла ошибка!\nПользователь не найден.")
                }
                userTopic.acceptedOffers = userTopic.acceptedOffers + 1;
                userTopic.save()
                bot.sendMessage(userTopic.id, `[✅] *Ваш ответ на жалобу *\`forum.arizona-rp.com/threads/${topic}\`* был одобрен.*`, {parse_mode: "Markdown"})
                bot.sendMessage(chatId, "[✅] Предложенный ответ успешно одобрен!")
            } else if(data.startsWith("declineOffer")){
                if(!userTopic){
                    return bot.sendMessage(chatId, "Произошла ошибка!\nПользователь не найден.")
                }
                bot.sendMessage(chatId, "Введите причину отказа:")
                bot.once('message', async (response) => {
                    const reasonDecline = response.text || 'Error Response';
                    userTopic.declinedOffers = userTopic.declinedOffers + 1;
                    userTopic.save()
                    bot.sendMessage(userTopic.id, `[❌] *Ваш ответ на жалобу *\`forum.arizona-rp.com/threads/${topic}\`* был отклонен.*\n*Причина:*\n\`\`\`\n${reasonDecline}\`\`\``, {parse_mode: "Markdown"})
                    bot.sendMessage(chatId, "[❌] Предложенный ответ успешно отклонен!")
                });
            }
        }
    });

    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const user = await UserSchema.findOne({ id: chatId });
        
        if (!user) {
          bot.sendMessage(chatId, 'Привет! Для начала работы, укажите ваш никнейм:');
          
          bot.once('message', async (response) => {
              const username = response.text || 'Not Available';
  
              const newUser = await UserSchema.create({
                  id: chatId,
                  server: "0",
                  nick: username,
                  active: false,
                  admin: false,
                  isMajor: false,
                  acceptedOffers: 0,
                  declinedOffers: 0,
                  notification: true,
                  accessAdmins: false,
                  isTech: false,
              });
  
              const savedUser = await newUser.save();
  
              if (!savedUser) {
                  return bot.sendMessage(chatId, 'Произошла ошибка при создании профиля!');
              }
  
              bot.sendMessage(
                  chatId,
                  `Привет, ${username}!\nЯ бот Tech-Arizona.\nДавай начнем с использования команды /menu`
              );
          });
      } else {
          bot.sendMessage(
              chatId,
              `Привет, ${user.nick}!\nЯ бот Tech-Arizona.\nДавай начнем с использования команды /menu`
          );
      }
    });

    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const messageText = msg.text.toLowerCase();
        const user = await UserSchema.findOne({ id: chatId });

        for (let i = 0; i < servers.length; i++) {
            const element = servers[i];
            const server = messageText.match(/\[(\d+)\]/)
                ? parseInt(messageText.match(/\[(\d+)\]/)[1], 10)
                : null;
            if (messageText === element.toLocaleLowerCase() && user.admin) {
                const messageOptions = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "Жалобы в закрепе",
                                    callback_data: "pinned/" + server,
                                },
                                {
                                    text: "Жалобы ниже закрепа",
                                    callback_data: "unpinned/" + server,
                                },
                            ],
                            [
                                {
                                    text: "Старые жалобы (1+ день)",
                                    callback_data: "old/" + server,
                                },
                                {
                                    text: "Статистика (7 дней)",
                                    callback_data: "stats/" + server,
                                },
                            ],
                            [
                                {
                                    text: "Скриншот раздела",
                                    callback_data: "screen/" + server,
                                }
                            ],
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                };
                bot.sendMessage(
                    chatId,
                    "Выберите раздел жалоб:",
                    messageOptions
                );
            }
        }

        if (msg.text.startsWith('/findUser') && user.admin) {
            const queryNicknameOrId = msg.text.split(' ').slice(1).join(' ');
        
            if (!queryNicknameOrId) {
                return bot.sendMessage(chatId, '*Используйте:* /findUser (никнейм или ID)', {parse_mode: "Markdown"});
            }
        
            const foundUser = await UserSchema.findOne({
                $or: [
                    { nick: new RegExp(queryNicknameOrId, 'i') },
                    { id: queryNicknameOrId }
                ]
            });
        
            if (foundUser) {
                profileUser(bot, chatId, foundUser);
            } else {
                bot.sendMessage(chatId, 'Пользователь с указанным никнеймом или ID не найден.');
            }
        }        

        if (msg.text.startsWith('/users') && user.admin) {
            const users = await UserSchema.find();
            // for(const user of users){
            //     user.isTech = true;
            //     await user.save()
            // }
            bot.sendMessage(chatId, `Количество профилей: \`${users.length}\``, {parse_mode: "Markdown"});
        }

        const formatRegExp = /^\/vc \[?(\d+)\]?(.+?) (\d{4}-\d{2}-\d{2}) (\d{4}-\d{2}-\d{2})$/;

        const match = msg.text.match(formatRegExp);

        if (match) {
            const nickname = `[${match[1]}]${match[2].trim()}`;
            const fromDate = match[3].trim();
            const toDate = match[4].trim();

            if((user.isMajor || user.accessAdmins) && user.active){
                const extractDataFromPage = async (page, retries = 3) => {
                    try {
                        await page.waitForSelector("div.app-sidebar");
                
                        const $ = cheerio.load(await page.content());
                
                        let totalSessionTimeInSeconds = 0;
                        let reportCount = 0;
                
                        // Находим все <td> второго столбца внутри <tbody>
                        $('tbody tr td:nth-child(2)').each((index, element) => {
                            const text = $(element).text().trim();
                
                            // Проверяем, содержит ли текст фразу "ответил на репорт"
                            if (text.includes('ответил на репорт')) {
                                reportCount++;
                            } else {
                                // Извлекаем время сессии и суммируем его в секундах
                                const sessionTimeMatch = text.match(/время сессии: (\d+:\d+:\d+)/);
                                if (sessionTimeMatch) {
                                    const [hours, minutes, seconds] = sessionTimeMatch[1].split(':').map(Number);
                                    totalSessionTimeInSeconds += hours * 3600 + minutes * 60 + seconds;
                                }
                            }
                        });
                
                        return [totalSessionTimeInSeconds, reportCount];
                    } catch (error) {
                        console.error('Error during data extraction:', error.message);
                        
                        // Retry if there are remaining retries
                        if (retries > 0) {
                            console.log(`Retrying (${retries} retries left)`);
                            return extractDataFromPage(page, retries - 1);
                        } else {
                            console.error('Max retries reached. Terminating extraction.');
                            // Handle the error or return some default values
                            return [0, 0];
                        }
                    }
                };                

                const processPages = async () => {
                    const browser = await puppeteer.launch({
                        args: ["--no-sandbox"]
                    });

                    const page = await browser.newPage();

                    await page.setCookie(...Object.keys(cookies_logs).map(name => ({
                        name,
                        value: cookies_logs[name],
                        domain: 'arizonarp.logsparser.info',
                    })));

                    let report = 0;
                    let sessionTimeInSeconds = 0;

                    for (let i = 1; i <= 10; i++) {
                        const currentPageLink = `https://arizonarp.logsparser.info/?min_period=${fromDate}+00%3A00%3A00&max_period=${toDate}+23%3A59%3A59&type%5B%5D=report_answer&type%5B%5D=disconnect&sort=desc&player=${nickname}&limit=1000&page=${i}`;
                        console.log(currentPageLink);
                        await page.goto(currentPageLink);

                        const [online, answer] = await extractDataFromPage(page);
                        sessionTimeInSeconds += online;
                        report += answer;
                        await new Promise(resolve => setTimeout(resolve, 10000));
                    }

                    console.log("All extracted data:", report, sessionTimeInSeconds);
                    const totalSessionTimeFormatted = new Date(sessionTimeInSeconds * 1000)
                        .toISOString()
                        .substr(11, 8);

                    const endDateFormat = new Date(toDate).getTime();
                    const startDateFormat = new Date(fromDate).getTime();
                    const oneDay = 24 * 60 * 60 * 1000;

                    const numberOfDays = Math.floor((endDateFormat - startDateFormat) / oneDay) + 1;

                    bot.sendMessage(chatId, `*Онлайн за ${numberOfDays} дней:*\n\n*Никнейм:*  \`${nickname}\`\n*Онлайн:*  \`${totalSessionTimeFormatted}\`\n*Репорт:*  \`${report}\``, {parse_mode: "Markdown"})
                    await browser.close();
                };

                console.log("process")
                processPages();
            }
        }


        if (messageText === "/menu" || messageText === "меню") {
            const messageOptions = {
                reply_markup: {
                    keyboard: [],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            };

            if (user.isTech && user.isMajor) {
                messageOptions.reply_markup.keyboard.push([{ text: "👤 Статистика" }, { text: "🛠️ Жалобы" }, { text: "📌 Выдача" }]);
            } else {
                messageOptions.reply_markup.keyboard.push([{ text: "👤 Статистика" }, { text: "🛠️ Жалобы" }]);
            }
            
            messageOptions.reply_markup.keyboard.push([{ text: "📞 Поддержка" }]);

            bot.sendMessage(chatId, "Выберите опцию из меню: ", messageOptions);
        } else if (messageText === "👤 статистика") {
            bot.deleteMessage(chatId, msg.message_id);
            const messageText = `👤 *Статистика:*\n\nID:  \`${user.id}\`\nНикнейм:  \`${
                user.nick
            }\`\nСервер:  \`${user.server}\`${
                user.admin ? "\nАдминистратор: `Да`" : ""
            }\nОдобренных ответов:  \`${user.acceptedOffers}\`\nОтказанных ответов:  \`${user.declinedOffers}\`\n\nУведомление о новых жалобах: \`${user.notification ? "Включено" : "Отключено"}\``;
            const messageOptions = {
                reply_markup: {
                    keyboard: [[{ text: "🔔 Уведомления" }], [{ text: "Меню" }]],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
                parse_mode: "Markdown",
            };
            bot.sendMessage(chatId, messageText, messageOptions);
        } else if (messageText === "🛠️ жалобы") {
            if (!user || !user.active) {
                return bot.sendMessage(
                    chatId,
                    "Вы не являетесь активным ответственным за тех.раздел или у вас нет доступа!"
                );
            }

            const groupedSevers = servers.reduce((acc, curr, index) => {
                const groupIndex = Math.floor(index / 4);

                if (!acc[groupIndex]) {
                    acc[groupIndex] = [];
                }

                acc[groupIndex].push({ text: curr });

                return acc;
            }, []);

            groupedSevers.push([{ text: "Меню" }]);

            const messageOptions = {
                reply_markup: {
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            };
            if (user.admin) {
                messageOptions.reply_markup.inline_keyboard = [
                    [
                        {
                            text: "Технический Раздел",
                            callback_data: "techSection",
                        },
                        {
                            text: "Жалобы на администрацию",
                            callback_data: "adminsSection",
                        },
                    ]
                ];
            } else if (user.isTech && user.accessAdmins){
                messageOptions.reply_markup.inline_keyboard = [
                    [
                        {
                            text: "Технический Раздел",
                            callback_data: `tech/${user.server}`,
                        },
                        {
                            text: "Жалобы на администрацию",
                            callback_data: `admins/${user.server}`,
                        },
                    ]
                ];
            } else if(user.isTech && !user.accessAdmins){
                messageOptions.reply_markup.inline_keyboard = [
                    [
                        {
                            text: "Жалобы в закрепе",
                            callback_data: "pinned/" + user.server,
                        },
                        {
                            text: "Жалобы ниже закрепа",
                            callback_data: "unpinned/" + user.server,
                        },
                    ],
                    [
                        {
                            text: "Старые жалобы (1+ день)",
                            callback_data: "old/" + user.server,
                        },
                        {
                            text: "Статистика (7 дней)",
                            callback_data: "stats/" + user.server,
                        },
                    ],
                    [
                        {
                            text: "Скриншот раздела",
                            callback_data: "screen/" + user.server,
                        }
                    ],
                ];
            } else if (user.accessAdmins && !user.isTech){
                messageOptions.reply_markup.inline_keyboard = [
                    [
                        {
                            text: "Жалобы в закрепе",
                            callback_data: "pinned_admins/" + user.server,
                        },
                        {
                            text: "Жалобы ниже закрепа",
                            callback_data: "unpinned_admins/" + user.server,
                        },
                    ],
                    [
                        {
                            text: "Старые жалобы (1+ день)",
                            callback_data: "old_admins/" + user.server,
                        },
                        {
                            text: "Статистика (7 дней)",
                            callback_data: "stats_admins/" + user.server,
                        },
                    ],
                    [
                        {
                            text: "Скриншот раздела",
                            callback_data: "screen_admins/" + user.server,
                        }
                    ],
                ];
            }

            bot.sendMessage(
                chatId,
                `Выберите раздел:`,
                messageOptions
            );
        } else if (messageText === "📞 поддержка") {
        } else if (messageText === "📌 выдача"){
            if (!user || !user.active || !user.isMajor) {
                return bot.sendMessage(
                    chatId,
                    "Вы не являетесь активным ответственным за тех.раздел или у вас нет доступа!"
                );
            }
            if (user.admin){
                const groupedSevers = servers.reduce((acc, curr, index) => {
                    const groupIndex = Math.floor(index / 4);
    
                    if (!acc[groupIndex]) {
                        acc[groupIndex] = [];
                    }
    
                    acc[groupIndex].push({ text: curr, callback_data: `request/${index+1}` });
                    return acc;
                }, []);
    
                groupedSevers.push([{ text: "Меню", callback_data: "menu" }]);
    
                const messageOptions = {
                    reply_markup: {
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                };
    
                messageOptions.reply_markup.inline_keyboard = groupedSevers;
    
                bot.sendMessage(
                    chatId,
                    `Выберите сервер:`,
                    messageOptions
                );
            } else {
                const [idle, active] = await loadTable()
                
                const serverIndex = parseInt(user.server) === 101 || parseInt(user.server) === 102 || parseInt(user.server) === 103 ? parseInt(user.server) - 73 : parseInt(user.server) - 1;

                bot.sendMessage(
                    chatId,
                    `📌* Выдача:*\n\n*Всего заявок на выдаче:*  \`${idle[serverIndex] + active[serverIndex]}\`\n\n*На рассмотрении:*  \`${idle[serverIndex]}\`\n*Ожидают выдачи:*  \`${active[serverIndex]}\``,
                    {parse_mode: "Markdown"}
                );
            }
        } else if (messageText === "🔔 уведомления"){
            user.notification = !user.notification
            user.save()
            bot.sendMessage(chatId, `Уведомления успешно ${user.notification ? "включены" : "отключены"}`)
            const messageText = `👤 *Статистика:*\n\nНикнейм:  \`${
                user.nick
            }\`\nСервер:  \`${user.server}\`${
                user.admin ? "\nАдминистратор: `Да`" : ""
            }\nОдобренных ответов:  \`${user.acceptedOffers}\`\nОтказанных ответов:  \`${user.declinedOffers}\`\n\nУведомление о новых жалобах: \`${user.notification ? "Включено" : "Отключено"}\``;
            
            const messageOptions = {
                reply_markup: {
                    keyboard: [[{ text: "🔔 Уведомления" }], [{ text: "Меню" }]],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
                parse_mode: "Markdown",
            };

            bot.sendMessage(chatId, messageText, messageOptions);
        }
    });
}

async function fetchLocation(ip) {
    try {
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(`http://ip-api.com/json/${ip}`);
      const data = await response.json();
      return {
        country: data.country,
        city: data.city
      };
    } catch (error) {
      console.error(`Error fetching location for IP ${ip}:`, error.message);
      return null;
    }
  }
  
async function enrichIpDataWithLocation(ipData) {
    const enrichedIpData = [];

    for (const entry of ipData) {
        const location = await fetchLocation(entry.ip);
        if (location) {
            enrichedIpData.push({
                ...entry,
                location
            });
        }
    }

    return enrichedIpData;
}

function profileUser(bot, chatId, user){
  const userInfo = `👤 *Статистика:*\n\nID пользователя: \`${user.id}\`\nНикнейм: \`${user.nick}\`\nСервер: \`${user.server}\`\nАктивен: \`${user.active ? 'Да' : 'Нет'}\`\nТех.Администратор:  \`${user.isTech ? "Да" : "Нет"}\`\nАдмин: \`${user.admin ? 'Да' : 'Нет'}\`\nОтветственный: \`${user.isMajor ? 'Да' : 'Нет'}\`\nДоступ к жалобам на администрацию:  \`${user.accessAdmins ? "Да" : "Нет"}\``;
              
  const messageOptions = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "Изменить значение \"Активен\"", callback_data: `change_active/${user.id}` }, { text: "Изменить значение \"Админ\"", callback_data: `change_admin/${user.id}` }],
            [{ text: "Изменить значение \"Ответственный\"", callback_data: `change_major/${user.id}` }, { text: "Изменить значение \"Сервер\"", callback_data: `change_server/${user.id}` }],
            [{ text: "Изменить значение \"Никнейм\"", callback_data: `change_nickname/${user.id}` }, { text: "Изменить значение \"Доступ к жб адм\"", callback_data: `change_accessAdmins/${user.id}` } ],
            [{ text: "Изменить значение \"Тех.Администратор\" ", callback_data: `change_isTech/${user.id}` }, { text: "Удалить профиль", callback_data: `delete_profile/${user.id}` }],
            [{ text: "🛠️ Помощь", callback_data: "help_change" }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
    },
    parse_mode: "Markdown"
  };

  bot.sendMessage(chatId, userInfo, messageOptions);
}

module.exports = { init };
