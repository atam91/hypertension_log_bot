const rxdb = require('./rxdb');
const { helpers: tgh } = require('./base/telegramBot');
const { getAverage, getLast } = require('./base/utils');

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

const parseDateFromUpdate = update => getParameterFromContainingUpdate(update).replace(/o/g, '-').replace(/u/g, ':').replace('x', '.');

const serializeDate = date => date.replace(/-/g, 'o').replace(/:/g, 'u').replace('.', 'x');

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const measurementString = m => `${m.pressureUp}\/${m.pressureLow} *${m.pulse || '_'}*`;

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
            const date = parseDateFromUpdate(update);

            const measurementDoc = await db.measurements.findOne({
                selector: {
                    date,
                    userId: tgh.getChatIdFromUpdate(update)
                }
            }).exec();
            await measurementDoc.remove();

            await telegramBot.sendMessage(
                tgh.getChatIdFromUpdate(update),
                'Удалил'
            );

            return;
        }
        if (message.startsWith('/show_')) {  ///FIXME
            const date = parseDateFromUpdate(update);

            const measurement = await db.measurements.findOne({
                selector: {
                    date,
                    userId: tgh.getChatIdFromUpdate(update)
                }
            }).exec();
            const m = measurement;

            await telegramBot.sendMessage(
                tgh.getChatIdFromUpdate(update),
                {
                    text: [
                        measurementString(m),
                        '',
                        `__${m.date}__`,
                        '',
                        `/drop\\_${serializeDate(m.date)}`,
                    ].join('\n'),
                    replyToMessageId: m.messageId,
                }
            );

            return;
        }

        //// FIXME TODO DROP
        const measurements = await db.measurements.find({
            selector: {
                userId: tgh.getChatIdFromUpdate(update)
            }
        }).exec();

        await Promise.all(
            measurements.map((md, index) => md.update({ $set: { index } }))
        );

        const lm = getLast(measurements);
        if (lm) {
            await user.update({ $set: { lastMeasurementIndex: lm.index } });
        }

        //////console.log('___MEASUREMNTS', measurements.map(d => d.toJSON()));

        ///////////////////////////////////////////////////////////////////////////////////////////////////

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
                [
                    'Давление это важно, Понятненько?!)',
                    'Береги себя, раз уж ты здесь. Полезно немного последить за своим давлением, что бы знать свою норму.',
                    'Присылай значения через пробел (`120 80 60`),\nбудем вести журнал!',
                    '',
                    'Измерения: /get\\_measurements',
                    'Статистика: /get\\_statistics',
                    'Информация: /get\\_information',
                ].join('\n')
            );
        }
    },

    get_measurements: (telegramBot) => async ({ update, user, db }) => {
        const measurements = await db.measurements.find({
            selector: {
                userId: tgh.getChatIdFromUpdate(update)
            }
        }).exec();

        /////console.log('___MEASUREMNTS', measurements.map(d => d.toJSON()));

        await telegramBot.sendMessage(
            tgh.getChatIdFromUpdate(update),
            'Ваши измерения::\n' + measurements
                .map(m => `${measurementString(m)}   /show\\_${serializeDate(m.date)}`)
                .join('\n')
        );

        await user.update({
            $set: {
                state: 'default',
            }
        });
    },

    get_statistics: (telegramBot) => async ({ update, user, db }) => {
        const measurements = await db.measurements.find({
            selector: {
                userId: tgh.getChatIdFromUpdate(update)
            }
        }).exec();

        const averageMeasurement = {
            pressureUp: getAverage( measurements.map(m => m.pressureUp) ),
            pressureLow: getAverage( measurements.map(m => m.pressureLow) ),
            pulse: getAverage( measurements.map(m => m.pulse).filter(v => v) ),
        };

        const measurementsExtremum = {
            pressureUpMax: Math.max( ...measurements.map(m => m.pressureUp) ),
            pressureLowMax: Math.max( ...measurements.map(m => m.pressureLow) ),
            pressureLowMin: Math.min( ...measurements.map(m => m.pressureLow) ),
            pressureUpMin: Math.min( ...measurements.map(m => m.pressureUp) ),
            pulseMax: Math.max( ...measurements.map(m => m.pulse).filter(v => v) ),
            pulseMin: Math.min( ...measurements.map(m => m.pulse).filter(v => v) ),
        };

        const measurementStringWithDate = m => m && (measurementString(m) + `   \`${m.date}\``) || '~';

        await telegramBot.sendMessage(
            tgh.getChatIdFromUpdate(update),
            [
                'Статистика:',
                `Замеров - ${measurements.length}`,
                `Среднее значение - ${measurementString(averageMeasurement)}`,
                '',
                'Экстремизм:',
                'upMax - ' + measurementStringWithDate( measurements.find(m => m.pressureUp === measurementsExtremum.pressureUpMax) ),
                'lowMax - ' + measurementStringWithDate( measurements.find(m => m.pressureLow === measurementsExtremum.pressureLowMax) ),
                'lowMin - ' + measurementStringWithDate( measurements.find(m => m.pressureLow === measurementsExtremum.pressureLowMin) ),
                'upMin - ' + measurementStringWithDate( measurements.find(m => m.pressureUp === measurementsExtremum.pressureUpMin) ),
                '',
                'pulseMax - ' + measurementStringWithDate( measurements.find(m => m.pulse === measurementsExtremum.pulseMax) ),
                'pulseMin - ' + measurementStringWithDate( measurements.find(m => m.pulse === measurementsExtremum.pulseMin) ),

            ].join('\n')
        );

        await user.update({
            $set: {
                state: 'default',
            }
        });
    },

    get_information: (telegramBot) => async ({ update, user, db }) => {
        await telegramBot.sendMessage(
            tgh.getChatIdFromUpdate(update),
            {
                parseMode: 'HTML',
                text: [
                    'wiki:',
                    'https://ru.wikipedia.org/wiki/Артериальная_гипертензия',
                ].join('\n')
            },
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

    let user = await db.users.findOne({
        selector: {
            userId: tgh.getChatIdFromUpdate(update)
        }
    }).exec();
    if (!user) {
        user = await db.users.insert({
            id: tgh.getChatIdFromUpdate(update).toString(),
            userId: tgh.getChatIdFromUpdate(update),
            state: 'default',
        })
    }

    console.log('__User', user.toJSON());

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
