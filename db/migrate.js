// db/migrate.js — Creates all tables for Roman Command Center
// Called automatically on server startup (idempotent via IF NOT EXISTS)
const { db } = require('./connection');

async function migrate() {
  console.log('[migrate] Creating tables...');

  // Power Tasks: 3 priority slots per day
  await db.execute(`CREATE TABLE IF NOT EXISTS power_tasks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    task_date     TEXT    NOT NULL DEFAULT (date('now', 'localtime')),
    title         TEXT    NOT NULL,
    slot          INTEGER NOT NULL,
    is_done       INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(task_date, slot)
  )`);

  // Tomorrow's Plan: up to 6 items with "done when" criteria
  await db.execute(`CREATE TABLE IF NOT EXISTS tomorrow_plan (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_date     TEXT    NOT NULL DEFAULT (date('now', 'localtime', '+1 day')),
    slot          INTEGER NOT NULL,
    title         TEXT    NOT NULL,
    done_when     TEXT    NOT NULL DEFAULT '',
    is_done       INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(plan_date, slot)
  )`);

  // SQL Practice: daily study sessions
  await db.execute(`CREATE TABLE IF NOT EXISTS sql_practice (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    practice_date   TEXT    NOT NULL DEFAULT (date('now', 'localtime')),
    topic           TEXT    NOT NULL,
    minutes         INTEGER NOT NULL DEFAULT 0,
    notes           TEXT    NOT NULL DEFAULT '',
    created_at      TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  )`);

  // Job Applications: pipeline tracker
  await db.execute(`CREATE TABLE IF NOT EXISTS job_applications (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    company       TEXT    NOT NULL,
    role          TEXT    NOT NULL,
    date_applied  TEXT    NOT NULL DEFAULT (date('now', 'localtime')),
    status        TEXT    NOT NULL DEFAULT 'applied'
                  CHECK(status IN ('applied','screening','interviewing','offer','rejected','accepted')),
    notes         TEXT    NOT NULL DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  )`);

  // Gym Log: workout tracking
  await db.execute(`CREATE TABLE IF NOT EXISTS gym_log (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    log_date          TEXT    NOT NULL DEFAULT (date('now', 'localtime')),
    workout_type      TEXT    NOT NULL,
    duration_minutes  INTEGER NOT NULL DEFAULT 0,
    notes             TEXT    NOT NULL DEFAULT '',
    created_at        TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  )`);

  // Relationship Check-ins: morning + evening, authored by Roman or Jessica
  await db.execute(`CREATE TABLE IF NOT EXISTS relationship_checkins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    checkin_date  TEXT    NOT NULL DEFAULT (date('now', 'localtime')),
    time_of_day   TEXT    NOT NULL DEFAULT 'morning'
                  CHECK(time_of_day IN ('morning','evening')),
    author        TEXT    NOT NULL DEFAULT 'Roman'
                  CHECK(author IN ('Roman','Jessica')),
    notes         TEXT    NOT NULL DEFAULT '',
    gratitude     TEXT    NOT NULL DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(checkin_date, time_of_day, author)
  )`);

  // Developer Tasks: project-based task tracker for side projects
  await db.execute(`CREATE TABLE IF NOT EXISTS dev_tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project     TEXT    NOT NULL DEFAULT 'General',
    title       TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'todo'
                CHECK(status IN ('todo','in_progress','done')),
    priority    INTEGER NOT NULL DEFAULT 2
                CHECK(priority BETWEEN 1 AND 3),
    notes       TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  )`);

  console.log('[migrate] All 7 tables created successfully.');
}

module.exports = migrate;
