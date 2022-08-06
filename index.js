// необходимые сущности
const { Telegraf, Markup } = require("telegraf");
const { createListOfAllProducts, createListOfMissingProducts } = require("./listsFormation");
const { setUpConnection } = require("./service");

// импорт для подключения токена
require("dotenv").config();

// импорт файла с командами и их описанием
const commands = require("./commands");

// функция запускающая функционал бота
const runTelegramBot = () => {
    try {
        // инициализация бота
        const bot = new Telegraf(process.env.BOT_TOKEN);

        // создание объекта стора
        const dataStore = [];

        // функция обновляющая соединение к базе данных
        function refreshConnection() {
            // сбрасвание предыдущего подключения и установка нового
            connection.end();
            console.log("Database connection lost");
            connection = setUpConnection();
        }

        // функция обновляющая dataStore
        function updateDataStore() {
            // очистка dataStore
            dataStore.length = 0;

            // запрос на получение продуктов из базы данных
            connection.query("SELECT * from main", (error, result, fields) => {
                if (error) {
                    throw error;
                }

                // первичное наполнение стора из таблицы main
                result.forEach((resultItem) => {
                    dataStore.push({
                        vendorCode: resultItem.vendor_code,
                        name: resultItem.name,
                        sizeType: resultItem.size_type,
                        price: resultItem.price,
                        sizeData: [],
                    });
                });
            });

            // дополнения стора данным с помощью джоина таблиц main & additional
            connection.query(
                "SELECT vendor_code, size, max_speed_in_14d, left_in_wb_stock, enough_for_days FROM main INNER JOIN additional ON main.id = additional.prod_id;",
                (error, result, fields) => {
                    dataStore.forEach((dataStoreItem) => {
                        result.forEach((resultItem) => {
                            if (dataStoreItem.vendorCode == resultItem.vendor_code) {
                                dataStoreItem.sizeData.push({
                                    size: resultItem.size,
                                    maxSpeedIn14d: resultItem.max_speed_in_14d,
                                    leftInWbStock: resultItem.left_in_wb_stock,
                                    enoughForDays: resultItem.enough_for_days,
                                });
                            }
                        });
                    });
                }
            );
        }

        // создание первичного подлючения к базе данных и первичное наполнение dataStore
        let connection = setUpConnection();
        updateDataStore();

        // вложенный таймер сбрасывающий старое подключение к базе данных и устанавливающий новое (10сек)
        let connectionId = setTimeout(function updateConnection() {
            // сбрасвание предыдущего подключения и установка нового
            refreshConnection();

            // обновление dataStore
            updateDataStore();

            connectionId = setTimeout(updateConnection, 10000);
        }, 10000);

        // приветствие + наполнение объекта dataStore
        bot.start((ctx) => {
            try {
                const firstName = ctx.message.from.first_name,
                    lastName = ctx.message.from.last_name;

                // обновление подключения к базе данных
                refreshConnection();

                // обновление dataStore
                updateDataStore();

                ctx.reply(
                    `🤖Привет ${firstName ? firstName : "Незнакомец"} ${
                        lastName ? lastName : ""
                    }, ProductTrackingBot включён. \nВ Menu находятся все необходимые команды. \nЕсли бот включён давно воспользуйтесь командой \n/start для обновления базы данных.`
                );
            } catch (error) {
                console.log(error);
            }
        });

        // обработка команды help
        bot.help((ctx) => ctx.reply(commands.commands));

        // обработка команды info
        bot.command("info", async (ctx) => {
            try {
                // таким образом можно отправлять текст вместе с HTML форматированием, а не просто в виде обычного текста как при помощи reply, вторым же аргументом можно передать клавиатуру, которая будет появляться под этим сообщением
                await ctx.replyWithHTML(
                    "<b>Получить информацию о товарах 🎁</b>",

                    // добавление кнопок в интерфейс
                    Markup.inlineKeyboard([
                        [Markup.button.callback("Все позиции 📦", "btn_all_products")],
                        [Markup.button.callback("Недостающие позиции 📉", "btn_missing_products")],
                    ])
                );
            } catch (error) {
                console.error(error);
            }
        });

        // специальный флаг с которым работает команда alert
        let alertFlag = false;

        // специальный id для таймера в команде alert
        let alertId;

        // обработка команды alert - сигнализация о недостающих продуктах
        bot.command("alert", async (ctx) => {
            alertFlag = !alertFlag;

            if (alertFlag) {
                try {
                    alertId = setTimeout(async function missingProductsAlert() {
                        await ctx.reply(createListOfMissingProducts(dataStore));

                        alertId = setTimeout(missingProductsAlert, 10000);
                    });
                } catch (error) {
                    console.error(error);
                }
            } else {
                clearTimeout(alertId);
                await ctx.reply("🤖 Автоматические уведомленя отключены.");
            }
        });

        // обработка кнопки btn_all_products
        bot.action("btn_all_products", async (ctx) => {
            try {
                //сбрасываем загрузку с кнопки при её обработке
                await ctx.answerCbQuery();

                // сообщение с данными о товаре
                await ctx.replyWithHTML(`${createListOfAllProducts(dataStore)}`);
            } catch (error) {
                console.error(error);
            }
        });

        // обработка кнопки btn_missing_products
        bot.action("btn_missing_products", async (ctx) => {
            try {
                //сбрасываем загрузку с кнопки при её обработке
                await ctx.answerCbQuery();

                // сообщение с данными о товаре
                await ctx.replyWithHTML(`${createListOfMissingProducts(dataStore)}`);
            } catch (error) {
                console.error(error);
            }
        });

        // обработка неизвестной команды
        bot.on("text", async (ctx) => {
            try {
                const userText = ctx.message.text;
                await ctx.replyWithHTML(
                    `🤖 У меня нет команды ${userText}.\nВ Menu находятся все необходимые команды.`
                );
            } catch (error) {
                await ctx.replyWithHTML(
                    `🤖 Непредвиденная ошибка: ${userText}.\nПерезапустите бота для корректной работы.`
                );
            }
        });

        // запуск бота
        bot.launch();

        // включить изящную остановку
        process.once("SIGINT", () => bot.stop("SIGINT"));
        process.once("SIGTERM", () => bot.stop("SIGTERM"));
    } catch (error) {
        console.log(error);
    }
};

// непосредственный запуск функции телеграм бота
runTelegramBot();
