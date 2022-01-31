const { TELEGRAM_BOT_TOKEN } = require('./config');
const { TelegramBot } = require('./base/telegramBot');
const { handler: tgHandler } = require('./tgHandler');

if (!TELEGRAM_BOT_TOKEN) throw new Error('Needs TELEGRAM_BOT_TOKEN');


console.log('hypertension_log_bot initializing...');

(async () => {
    const telegramBot = TelegramBot({ TELEGRAM_BOT_TOKEN, });

    telegramBot.initialize(async (update) => {
        try {
            await tgHandler(telegramBot)(update);
        } catch (err) {
            console.log('tgBotHandler error', err);
            throw err;  // fixme?? NOT!!!
        }
    });
    console.log('hypertension_log_bot listenning');
})();  // todo catch?
