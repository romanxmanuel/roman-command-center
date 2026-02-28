// db/reset.js — Deletes the database file, recreates schema, seeds data
// Run standalone: node db/reset.js
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'db.sqlite');
const WAL_FILE = DB_FILE + '-wal';
const SHM_FILE = DB_FILE + '-shm';

// Step 1: Delete existing database files
console.log('[reset] Removing old database files...');
[DB_FILE, WAL_FILE, SHM_FILE].forEach(f => {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    console.log(`[reset]   Deleted ${path.basename(f)}`);
  }
});

// Step 2: Run migration (creates fresh db + tables)
console.log('[reset] Running migration...');
require('./migrate');

// Step 3: Seed data
console.log('[reset] Running seed...');
require('./seed');

console.log('[reset] Database reset complete.');
