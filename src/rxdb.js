const { createRxDatabase } = require('rxdb');
const { getRxStoragePouch, addPouchPlugin } = require('rxdb/plugins/pouchdb');
const leveldown = require('leveldown');

addPouchPlugin(require('pouchdb-adapter-leveldb')); // leveldown adapters need the leveldb plugin to work

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const USERS_SCHEMA = {
    title: "users schema",
    version: 2,
    description: "users",
    primaryKey: "id",
    type: "object",
    properties: {
        id: { type: "string" },
        userId: { type: "number" },
        state: "string",
        lastMeasurementIndex: { type: "number" },
    },
    required: [ "id", "userId", ],
};

const MEASUREMENTS_SCHEMA = {
    title: "MEASUREMENTS_SCHEMA schema",
    version: 3,
    description: "measurements",
    primaryKey: "id",
    type: "object",
    properties: {
        id: { type: "string" },
        index: { type: "number" },
        userId: { type: "number" },
        pressureUp: { type: "number" },
        pressureLow: { type: "number" },
        pulse: { type: "number" },
        messageId: { type: "number" },
        date: { type: "string" }
    },
    required: [ "id", "userId", 'pressureUp', 'pressureLow' ],
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

let db = null;

const initialize = async () => {
    db = await createRxDatabase({
        name: './data/rxdb',
        storage: getRxStoragePouch(leveldown) // the full leveldown-module
    });

    await db.addCollections({
        users: {
            schema: USERS_SCHEMA,
            migrationStrategies: {
                1: v => v, // silly
                2: v => v, // silly
            },
        },

        measurements: {
            schema: MEASUREMENTS_SCHEMA,
            migrationStrategies: {
                1: v => v, // silly
                2: v => v, // silly
                3: v => v, // silly
            },
        }
    });
};

const getDb = () => db;

module.exports = {
    initialize,
    getDb,
};
