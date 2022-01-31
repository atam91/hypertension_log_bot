const { helpers: tgh } = require('./base/telegramBot');
const rxdb = require('./rxdb');

rxdb.initialize() /// fixme? not pretty
    .then(() => { console.log('rxdb initialized'); })
    .catch(err => { console.log('Error during rxdb initialization', err); });

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const DELIMITER = '::';
const genStateLine = function() {
    return [].join.call(arguments, DELIMITER);
};
const parseStateLine = function(line) {
    return line.split(DELIMITER);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getParameterFromContainingUpdate = update => tgh.getTextFromUpdate(update).split('_')[1];

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const STATE_HANDLERS = {
    echo: (telegramBot) => async ({ update }) => {
        await telegramBot.sendMessage(
            tgh.getChatIdFromUpdate(update),
            tgh.getTextFromUpdate(update) + ' ' + tgh.getTextFromUpdate(update)
        );
    },

    default: (telegramBot) => async ({ update, user, db }) => {
        const message = tgh.getTextFromUpdate(update);

        if (message.startsWith('/drop_')) {  ///FIXME
            const id = getParameterFromContainingUpdate(update);

            const measurementDoc = await db.measurements.findOne({
                selector: { id }
            }).exec();
            await measurementDoc.remove();

            await telegramBot.sendMessage(
                tgh.getChatIdFromUpdate(update),
                'Удалил'
            );

            return;
        }



        const numberParts = message.split(/[ \-_\\\/]/).map(v => parseInt(v)).filter(v => v);
        console.log('numberParts', numberParts);
        if (numberParts.length === 2 || numberParts.length === 3) {
            await db.measurements.insert({
                id: update.update_id.toString(),
                userId: tgh.getChatIdFromUpdate(update),

                pressureUp: numberParts[0],
                pressureLow: numberParts[1],
                pulse: numberParts[2],
                messageId: update.message.message_id,
                date: (new Date).toISOString(),
            });

            await telegramBot.sendMessage(
                tgh.getChatIdFromUpdate(update),
                'Записал'
            );
        } else {
            await telegramBot.sendMessage(
                tgh.getChatIdFromUpdate(update),
                'Давление это важно!\nПонятненько?! ::::)))\nПрисылай, будем вести журнал!\n\ngoogle Hypertension\n/get\\_measurements'
            );
        }
    },

    get_measurements: (telegramBot) => async ({ update, user, db }) => {
        const measurements = await db.measurements.find({
            selector: {
                userId: tgh.getChatIdFromUpdate(update)
            }
        }).exec();

        await telegramBot.sendMessage(
            tgh.getChatIdFromUpdate(update),
            'Ваши измерения::\n' + measurements.map(m => `${m.pressureUp}\/${m.pressureLow} *${m.pulse}*   /drop\\_${m.id}`).join('\n')
        );

        await user.update({
            $set: {
                state: 'default',
            }
        });
    },
};

const handler = (telegramBot) => async (update) => {
    const db = rxdb.getDb();

    console.log('UPDATE', JSON.stringify(update, null, 4));

    const user = await db.users.findOne({
        selector: {
            userId: tgh.getChatIdFromUpdate(update)
        }
    }).exec();
    if (!user) {
        await db.users.insert({
            id: tgh.getChatIdFromUpdate(update).toString(),
            userId: tgh.getChatIdFromUpdate(update),
            state: 'default',
        })
    }

    if (update.message.entities && update.message.entities[0].type === 'bot_command') {
        const botCmdEntity = update.message.entities[0];
        const cmd = update.message.text.substr(botCmdEntity.offset + 1, botCmdEntity.length);

        console.log('CMD', cmd);

        if (STATE_HANDLERS[cmd]) {
            await user.update({
                $set: {
                    'state': cmd,
                }
            });
        }
    }

    const userStateLine = user.get('state');
    console.log('userStateLine', userStateLine);

    const [ state, ...userStateArgs ] = parseStateLine(userStateLine);

    const handler = STATE_HANDLERS[state] || STATE_HANDLERS.default;
    if (handler) {
        await handler(telegramBot)({ user, update, db }, ...userStateArgs);
    } else {
        await telegramBot.sendMessage(
            tgh.getChatIdFromUpdate(update),
            '⚠️ some state error ⚠️'
        );
    }
};


module.exports = {
    handler,
};