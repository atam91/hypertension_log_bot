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
            tgh.getTextFromUpdate(update)
        );
    },
};

const handler = (telegramBot) => async (update) => {
    ///const db = rxdb.getDb();

    console.log('UPDATE', JSON.stringify(update, null, 4));

    /* const user = await db.users.findOne({
        selector: {
            userId: tgh.getChatIdFromUpdate(update)
        }
    }).exec();
    if (!user) {
        await db.users.insert({
            id: tgh.getChatIdFromUpdate(update).toString(),
            userId: tgh.getChatIdFromUpdate(update),
            state: 'search',
        })
    }

    if (!user.get('state')) {                                               //// todo drop later
        await user.update({
            $set: {
                'state': 'search',
            }
        });
    } */

    /* if (update.message.entities && update.message.entities[0].type === 'bot_command') {
        const botCmdEntity = update.message.entities[0];
        const cmd = update.message.text.substr(botCmdEntity.offset + 1, botCmdEntity.length);

        console.log('CMD', cmd);

        if (false && STATE_HANDLERS[cmd]) {
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

    const handler = STATE_HANDLERS[state];
    if (handler) {
        await handler(telegramBot)({ user, update }, ...userStateArgs);
    } else {
        await telegramBot.sendMessage(
            tgh.getChatIdFromUpdate(update),
            '⚠️ some state error ⚠️'
        );
    }*/

    await STATE_HANDLERS.echo(telegramBot)({ update });
};


module.exports = {
    handler,
};