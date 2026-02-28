# Roman Command Center

A personal productivity and analytics dashboard built with Node.js, Express, SQLite, and vanilla JavaScript. Tracks daily tasks, SQL study, job applications, gym sessions, and relationship check-ins — all in one Tron-inspired UI.

Built as a portfolio piece to demonstrate SQL competence, RESTful API design, and clean full-stack architecture.

---

## Features

- **Power Tasks** — 3-slot daily task system with completion tracking and 14-day streak calendar
- **Tomorrow's Plan** — Structured next-day planning with "Done when" success criteria
- **SQL Practice Log** — Log topics and minutes; 14-day bar chart on dashboard
- **Job Tracker** — Application pipeline with status management (applied → offer/rejected)
- **Gym Log** — Workout sessions with duration; 14-day history chart
- **Relationship Check-ins** — Morning/evening check-ins with gratitude journaling
- **Mission Control Dashboard** — Aggregated stats, 4 Chart.js visualizations, weekly summary widget
- **Keyboard Shortcuts** — Two-key navigation (`g d`, `g p`, `g t`, `g s`, `g j`, `g g`, `g r`)
- **Live DB Reset** — Admin endpoint with confirmation modal for demo resets
- **Mobile Responsive** — Slide-in drawer nav, touch-friendly tap targets
- **Health Endpoint** — `/health` for uptime and deployment monitoring

---

## Tech Stack

| Layer    | Technology                     |
|----------|--------------------------------|
| Runtime  | Node.js (LTS)                  |
| Server   | Express 4                      |
| Database | SQLite via `better-sqlite3`    |
| Charts   | Chart.js 4                     |
| Frontend | Vanilla HTML / CSS / JS        |
| Hosting  | Vercel (serverless-compatible) |

**No ORM, no React, no TypeScript.** Raw SQL only — intentional for learning and transparency.

---

## Project Structure

```
roman-command-center/
├── server.js           # Express entry point, middleware, routes
├── package.json
├── .gitignore
│
├── db/
│   ├── migrate.js      # CREATE TABLE IF NOT EXISTS (runs on startup)
│   ├── seed.js         # 14 days of sample data
│   ├── reset.js        # CLI reset (drops + recreates DB file)
│   └── database.js     # better-sqlite3 connection singleton
│
├── routes/
│   ├── tasks.js        # /api/tasks — CRUD + date filter + streak
│   ├── plan.js         # /api/plan — CRUD + date filter
│   ├── sql_practice.js # /api/sql-practice — CRUD + stats
│   ├── applications.js # /api/applications — CRUD + status filter
│   ├── gym.js          # /api/gym — CRUD + history
│   ├── relationships.js# /api/relationships — CRUD + date filter
│   └── admin.js        # /api/admin/reset — live DB reset
│
└── public/
    ├── index.html      # SPA shell
    ├── style.css       # Tron dark theme, glassmorphism, responsive
    └── app.js          # Router, 7 modules, charts, keyboard shortcuts
```

---

## Setup

**Requirements:** Node.js 18+

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/roman-command-center.git
cd roman-command-center

# Install dependencies
npm install

# Start server (auto-migrates on first run)
npm start
```

Open [http://localhost:3000](http://localhost:3000)

**Optional — seed with 14 days of sample data:**
```bash
npm run db:seed
```

**Reset database to clean state:**
```bash
npm run db:reset
```

---

## API Reference

All endpoints return JSON. Errors return `{ error: "message" }`.

### Power Tasks — `/api/tasks`

| Method | Endpoint                     | Description                         |
|--------|------------------------------|-------------------------------------|
| GET    | `/api/tasks?date=YYYY-MM-DD` | List tasks for a date               |
| POST   | `/api/tasks`                 | Create task `{ slot, title, date }` |
| PATCH  | `/api/tasks/:id/toggle`      | Toggle completed status             |
| PUT    | `/api/tasks/:id`             | Update task fields                  |
| DELETE | `/api/tasks/:id`             | Delete task                         |
| GET    | `/api/tasks/streak`          | Current consecutive day streak      |

### Tomorrow's Plan — `/api/plan`

| Method | Endpoint               | Description                                    |
|--------|------------------------|------------------------------------------------|
| GET    | `/api/plan?date=...`   | List plan items for a date                     |
| POST   | `/api/plan`            | Create item `{ slot, title, done_when, date }` |
| PATCH  | `/api/plan/:id/toggle` | Toggle completed                               |
| PUT    | `/api/plan/:id`        | Update item                                    |
| DELETE | `/api/plan/:id`        | Delete item                                    |

### SQL Practice — `/api/sql-practice`

| Method | Endpoint                  | Description                                   |
|--------|---------------------------|-----------------------------------------------|
| GET    | `/api/sql-practice`       | List sessions (supports `?limit=`)            |
| GET    | `/api/sql-practice/stats` | Total minutes + 14-day daily breakdown        |
| POST   | `/api/sql-practice`       | Log session `{ topic, minutes, notes, date }` |
| PUT    | `/api/sql-practice/:id`   | Update session                                |
| DELETE | `/api/sql-practice/:id`   | Delete session                                |

### Job Applications — `/api/applications`

| Method | Endpoint                  | Description                                        |
|--------|---------------------------|----------------------------------------------------|
| GET    | `/api/applications`       | List all (supports `?status=`)                     |
| GET    | `/api/applications/stats` | Count by status                                    |
| POST   | `/api/applications`       | Add application `{ company, role, status, notes }` |
| PUT    | `/api/applications/:id`   | Update application                                 |
| DELETE | `/api/applications/:id`   | Delete application                                 |

### Gym Log — `/api/gym`

| Method | Endpoint       | Description                                             |
|--------|----------------|---------------------------------------------------------|
| GET    | `/api/gym`     | Recent sessions (supports `?limit=`, `?days=`)          |
| POST   | `/api/gym`     | Log session `{ workout_type, duration_minutes, notes }` |
| PUT    | `/api/gym/:id` | Update session                                          |
| DELETE | `/api/gym/:id` | Delete session                                          |

### Relationship Check-ins — `/api/relationships`

| Method | Endpoint                 | Description                                              |
|--------|--------------------------|----------------------------------------------------------|
| GET    | `/api/relationships`     | Recent check-ins (supports `?limit=`)                    |
| POST   | `/api/relationships`     | Save check-in `{ time_of_day, notes, gratitude, date }` |
| PUT    | `/api/relationships/:id` | Update check-in                                          |
| DELETE | `/api/relationships/:id` | Delete check-in                                          |

### Admin & Health

| Method | Endpoint           | Headers Required   | Description               |
|--------|--------------------|--------------------|---------------------------|
| POST   | `/api/admin/reset` | `X-Confirm: RESET` | Delete all rows + re-seed |
| GET    | `/health`          | —                  | Status, uptime, version   |

---

## Database Schema

```sql
-- Daily 3-slot task system
CREATE TABLE power_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_date TEXT NOT NULL,         -- YYYY-MM-DD
  slot INTEGER NOT NULL,           -- 1, 2, or 3
  title TEXT NOT NULL,
  completed INTEGER DEFAULT 0,     -- 0 | 1
  created_at TEXT DEFAULT (datetime('now'))
);

-- Next-day structured planning
CREATE TABLE tomorrow_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_date TEXT NOT NULL,
  slot INTEGER NOT NULL,
  title TEXT NOT NULL,
  done_when TEXT,                  -- success criteria
  completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- SQL study session log
CREATE TABLE sql_practice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  practice_date TEXT NOT NULL,
  topic TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Job application pipeline
CREATE TABLE job_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'applied',   -- applied|screening|interviewing|offer|rejected|accepted
  notes TEXT,
  applied_date TEXT DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Gym session tracker
CREATE TABLE gym_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_date TEXT DEFAULT (date('now')),
  workout_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Relationship check-ins
CREATE TABLE relationship_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkin_date TEXT DEFAULT (date('now')),
  time_of_day TEXT DEFAULT 'morning',  -- morning | evening
  notes TEXT NOT NULL,
  gratitude TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## Screenshots

> _Dashboard — Mission Control with live stats and 14-day charts_

![Dashboard](./screenshots/dashboard.png)

> _Power Tasks — Daily slots with streak calendar_

![Power Tasks](./screenshots/tasks.png)

> _Mobile — Slide-in nav drawer on small screens_

![Mobile](./screenshots/mobile.png)

---

## Future Improvements

- [ ] **PostgreSQL migration** — swap SQLite for production-grade database
- [ ] **Authentication** — simple token or session-based login
- [ ] **Export to CSV** — download logs for external analysis
- [ ] **Notifications** — daily planning reminders via push or email
- [ ] **Dark/light theme toggle** — extend the CSS variable system
- [ ] **Data import** — bulk-import past workout/study logs
- [ ] **Weekly review view** — dedicated reflection section

---

## Author

Roman — [github.com/YOUR_USERNAME](https://github.com/YOUR_USERNAME)

Built to reinforce SQL, REST API design, and full-stack fundamentals while maintaining a deployable portfolio piece.
