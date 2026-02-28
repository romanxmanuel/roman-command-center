// db/connection.js — SQLite database connection (no schema, just the handle)
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db.sqlite');
const db = new Database(DB_PATH);

// WAL mode for better read performance under concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
