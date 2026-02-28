// db/migrate.js — Creates all tables for Roman Command Center
// Run standalone: node db/migrate.js
// All raw SQL, no ORM. Schema is readable and modifiable.
const db = require('./connection');

console.log('[migrate] Creating tables...');

db.exec(`
  -- Power Tasks: 3 priority items per day
  CREATE TABLE IF NOT EXISTS power_tasks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    task_date     TEXT    NOT NULL DEFAULT (date('now', 'localtime')),
    title         TEXT    NOT NULL,
    slot          INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 3),
    is_done       INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(task_date, slot)
  );

  -- Tomorrow's Plan: 6 planned items for the next day
  CREATE TABLE IF NOT EXISTS tomorrow_plan (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_date     TEXT    NOT NULL DEFAULT (date('now', 'localtime', '+1 day')),
    slot          INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 6),
    title         TEXT    NOT NULL,
    done_when     TEXT    NOT NULL DEFAULT '',
    is_done       INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(plan_date, slot)
  );

  -- SQL Practice: daily study log
  CREATE TABLE IF NOT EXISTS sql_practice (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    practice_date   TEXT    NOT NULL DEFAULT (date('now', 'localtime')),
    topic           TEXT    NOT NULL,
    minutes         INTEGER NOT NULL DEFAULT 0,
    notes           TEXT    NOT NULL DEFAULT '',
    created_at      TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  -- Job Applications: pipeline tracker
  CREATE TABLE IF NOT EXISTS job_applications (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    company       TEXT    NOT NULL,
    role          TEXT    NOT NULL,
    date_applied  TEXT    NOT NULL DEFAULT (date('now', 'localtime')),
    status        TEXT    NOT NULL DEFAULT 'applied'
                  CHECK(status IN ('applied','screening','interviewing','offer','rejected','accepted')),
    notes         TEXT    NOT NULL DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  -- Gym Log: workout tracking
  CREATE TABLE IF NOT EXISTS gym_log (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    log_date          TEXT    NOT NULL DEFAULT (date('now', 'localtime')),
    workout_type      TEXT    NOT NULL,
    duration_minutes  INTEGER NOT NULL DEFAULT 0,
    notes             TEXT    NOT NULL DEFAULT '',
    created_at        TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  -- Relationship Check-ins: morning + evening with gratitude
  CREATE TABLE IF NOT EXISTS relationship_checkins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    checkin_date  TEXT    NOT NULL DEFAULT (date('now', 'localtime')),
    time_of_day   TEXT    NOT NULL DEFAULT 'morning'
                  CHECK(time_of_day IN ('morning','evening')),
    notes         TEXT    NOT NULL DEFAULT '',
    gratitude     TEXT    NOT NULL DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(checkin_date, time_of_day)
  );
`);

console.log('[migrate] All 6 tables created successfully.');
