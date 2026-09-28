const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'accounting.db');
const db = new DatabaseSync(dbPath);

// Enforce strict accounting-grade PRAGMAs
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA synchronous = FULL');
db.exec('PRAGMA busy_timeout = 5000');
db.exec('PRAGMA temp_store = MEMORY');

module.exports = db;
