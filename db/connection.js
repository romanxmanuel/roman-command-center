// db/connection.js — libSQL (Turso-compatible) database client
// Local dev: url defaults to file:./db.sqlite (no env vars needed)
// Production (Vercel + Turso): set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./db.sqlite',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Convert a libsql ResultSet to an array of plain JS objects.
// libsql Row objects have both numeric indices AND string column keys,
// so we build plain objects from result.columns to guarantee clean JSON.
function toRows(result) {
  return result.rows.map(row => {
    const obj = {};
    result.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function toRow(result, index = 0) {
  if (!result.rows[index]) return null;
  const obj = {};
  result.columns.forEach((col, i) => { obj[col] = result.rows[index][i]; });
  return obj;
}

module.exports = { db, toRows, toRow };
