# Roman Command Center

A local, single-user personal productivity dashboard built with Node.js, Express, and SQLite. Tracks daily execution across 6 modules with a Tron-inspired UI.

## Quick Start

```bash
npm install
npm run db:reset   # Create schema + seed 14 days of sample data
npm start           # Start server at http://localhost:3000
```

## npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `node server.js` | Start the Express server |
| `npm run db:migrate` | `node db/migrate.js` | Create tables (idempotent) |
| `npm run db:seed` | `node db/seed.js` | Insert sample data |
| `npm run db:reset` | `node db/reset.js` | Delete DB, recreate schema, seed |

## Architecture

```
roman-command-center/
├── server.js              # Express entry point
├── db/
│   ├── connection.js      # SQLite connection (WAL mode, foreign keys)
│   ├── migrate.js         # Schema creation (6 tables)
│   ├── seed.js            # 14 days of realistic sample data
│   └── reset.js           # Drop + recreate + seed
├── routes/
│   ├── tasks.js           # Power Tasks endpoints
│   ├── plan.js            # Tomorrow's Plan endpoints
│   ├── sql_practice.js    # SQL Practice log endpoints
│   ├── applications.js    # Job Applications endpoints
│   ├── gym.js             # Gym Log endpoints
│   └── relationships.js   # Relationship Check-in endpoints
├── utils/
│   └── validate.js        # Shared validation helpers
├── public/
│   ├── index.html         # SPA shell
│   ├── style.css          # Tron theme styles
│   └── app.js             # Frontend logic
├── db.sqlite              # SQLite database (auto-created)
└── CLAUDE.md              # AI operating rules
```

## Stack

| Layer    | Technology                    |
|----------|-------------------------------|
| Server   | Node.js + Express             |
| Database | SQLite via better-sqlite3     |
| Frontend | Vanilla HTML/CSS/JS           |
| Charts   | Chart.js (CDN)                |

No TypeScript. No React. No ORM. Raw SQL only.

## Features

### 1. Power Tasks
- 3 priority tasks per day (slots 1-3)
- PATCH toggle for marking done/undone
- Streak counter (consecutive days with all 3 complete)

### 2. Tomorrow's Plan
- 6 slots for next-day planning
- "Done When" definition for each item
- Bulk replace all items for a date

### 3. SQL Practice
- Log topic, duration, and notes per session
- Stats endpoint with totals and per-topic breakdown

### 4. Job Applications
- Track company, role, date, status, notes
- Status filter: `applied`, `screening`, `interviewing`, `offer`, `rejected`, `accepted`
- Stats endpoint with counts by status

### 5. Gym Log
- Workout type, duration, notes
- Stats endpoint with breakdown by workout type

### 6. Relationship Check-ins
- Morning and evening entries per day (enforced unique)
- Notes + gratitude fields
- Today view for quick access

---

## API Reference

Base URL: `http://localhost:3000/api`

All endpoints return JSON. Errors return `{ "error": "message" }` with appropriate HTTP status codes.

### Validation

All POST/PUT/PATCH endpoints validate:
- **Required fields** — returns `400` if missing
- **Max lengths** — titles: 200 chars, notes: 1000 chars, gratitude: 500 chars, done_when: 500 chars, workout_type: 100 chars
- **Date format** — must be `YYYY-MM-DD`
- **Enum values** — status, time_of_day, slot ranges
- **Numeric fields** — must be non-negative integers

---

### Power Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks?date=YYYY-MM-DD` | Get tasks for date (default: today) |
| GET | `/api/tasks/streak` | Get current completion streak |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/:id` | Toggle is_done (0 ↔ 1) |
| PUT | `/api/tasks/:id` | Update task fields |
| DELETE | `/api/tasks/:id` | Delete a task |

**POST body:**
```json
{ "title": "string (required, max 200)", "slot": "integer 1-3 (required)", "task_date": "YYYY-MM-DD (optional, default: today)" }
```

**PUT body:**
```json
{ "title": "string (optional)", "is_done": "0 or 1 (optional)" }
```

**PATCH** — no body needed. Toggles `is_done` between 0 and 1.

---

### Tomorrow's Plan

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/plan?date=YYYY-MM-DD` | Get plan items for date (default: tomorrow) |
| POST | `/api/plan` | Create a single plan item |
| POST | `/api/plan/bulk` | Replace all items for a date |
| PATCH | `/api/plan/:id` | Partial update a plan item |
| PUT | `/api/plan/:id` | Update a plan item |
| DELETE | `/api/plan/:id` | Delete a plan item |

**POST body (single):**
```json
{ "title": "string (required, max 200)", "slot": "integer 1-6 (required)", "done_when": "string (optional, max 500)", "plan_date": "YYYY-MM-DD (optional, default: tomorrow)" }
```

**POST /bulk body:**
```json
{ "plan_date": "YYYY-MM-DD (optional, default: tomorrow)", "items": [ { "slot": 1, "title": "Item 1", "done_when": "Criteria" }, { "slot": 2, "title": "Item 2" } ] }
```
Deletes existing items for that date, then inserts the new items. Max 6 items.

**PATCH/PUT body:**
```json
{ "title": "string (optional)", "done_when": "string (optional)", "is_done": "0 or 1 (optional)" }
```

---

### SQL Practice

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sql-practice?limit=30` | List recent sessions |
| GET | `/api/sql-practice/stats` | Get totals + per-topic breakdown |
| POST | `/api/sql-practice` | Log a practice session |
| PUT | `/api/sql-practice/:id` | Update a session |
| DELETE | `/api/sql-practice/:id` | Delete a session |

**POST body:**
```json
{ "topic": "string (required, max 200)", "minutes": "integer >= 0 (required)", "notes": "string (optional, max 1000)", "practice_date": "YYYY-MM-DD (optional, default: today)" }
```

**PUT body:**
```json
{ "topic": "string (optional)", "minutes": "integer (optional)", "notes": "string (optional)" }
```

**Stats response:**
```json
{ "total_sessions": 14, "total_minutes": 535, "by_topic": [ { "topic": "Window Functions", "sessions": 1, "total_minutes": 50 } ] }
```

---

### Job Applications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications?status=applied` | List apps, optional status filter |
| GET | `/api/applications/stats` | Get total + counts by status |
| POST | `/api/applications` | Add an application |
| PUT | `/api/applications/:id` | Update an application |
| DELETE | `/api/applications/:id` | Delete an application |

**Valid statuses:** `applied`, `screening`, `interviewing`, `offer`, `rejected`, `accepted`

**POST body:**
```json
{ "company": "string (required, max 200)", "role": "string (required, max 200)", "date_applied": "YYYY-MM-DD (optional, default: today)", "status": "string (optional, default: applied)", "notes": "string (optional, max 1000)" }
```

**PUT body:**
```json
{ "company": "string (optional)", "role": "string (optional)", "status": "string (optional)", "notes": "string (optional)" }
```

**Stats response:**
```json
{ "total": 12, "by_status": [ { "status": "applied", "count": 5 }, { "status": "screening", "count": 3 } ] }
```

---

### Gym Log

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gym?limit=30` | List recent workouts |
| GET | `/api/gym/stats` | Get totals + breakdown by type |
| POST | `/api/gym` | Log a workout |
| PUT | `/api/gym/:id` | Update a workout |
| DELETE | `/api/gym/:id` | Delete a workout |

**POST body:**
```json
{ "workout_type": "string (required, max 100)", "duration_minutes": "integer >= 0 (required)", "notes": "string (optional, max 1000)", "log_date": "YYYY-MM-DD (optional, default: today)" }
```

**PUT body:**
```json
{ "workout_type": "string (optional)", "duration_minutes": "integer (optional)", "notes": "string (optional)" }
```

---

### Relationship Check-ins

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/relationships?limit=30` | List recent check-ins |
| GET | `/api/relationships/today` | Get today's check-ins |
| POST | `/api/relationships` | Create a check-in |
| PUT | `/api/relationships/:id` | Update a check-in |
| DELETE | `/api/relationships/:id` | Delete a check-in |

**POST body:**
```json
{ "time_of_day": "morning or evening (required)", "notes": "string (required, max 1000)", "gratitude": "string (optional, max 500)", "checkin_date": "YYYY-MM-DD (optional, default: today)" }
```

**PUT body:**
```json
{ "notes": "string (optional)", "gratitude": "string (optional)" }
```

One morning + one evening per date (enforced by UNIQUE constraint). Duplicates return `409`.

---

## Database Schema

**power_tasks**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| task_date | TEXT | NOT NULL, default today |
| title | TEXT | NOT NULL |
| slot | INTEGER | NOT NULL, CHECK 1-3 |
| is_done | INTEGER | NOT NULL, default 0 |
| created_at | TEXT | NOT NULL, default now |
| | | UNIQUE(task_date, slot) |

**tomorrow_plan**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| plan_date | TEXT | NOT NULL, default tomorrow |
| slot | INTEGER | NOT NULL, CHECK 1-6 |
| title | TEXT | NOT NULL |
| done_when | TEXT | NOT NULL, default '' |
| is_done | INTEGER | NOT NULL, default 0 |
| created_at | TEXT | NOT NULL, default now |
| | | UNIQUE(plan_date, slot) |

**sql_practice**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| practice_date | TEXT | NOT NULL, default today |
| topic | TEXT | NOT NULL |
| minutes | INTEGER | NOT NULL, default 0 |
| notes | TEXT | NOT NULL, default '' |
| created_at | TEXT | NOT NULL, default now |

**job_applications**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| company | TEXT | NOT NULL |
| role | TEXT | NOT NULL |
| date_applied | TEXT | NOT NULL, default today |
| status | TEXT | NOT NULL, CHECK enum, default 'applied' |
| notes | TEXT | NOT NULL, default '' |
| created_at | TEXT | NOT NULL, default now |

**gym_log**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| log_date | TEXT | NOT NULL, default today |
| workout_type | TEXT | NOT NULL |
| duration_minutes | INTEGER | NOT NULL, default 0 |
| notes | TEXT | NOT NULL, default '' |
| created_at | TEXT | NOT NULL, default now |

**relationship_checkins**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| checkin_date | TEXT | NOT NULL, default today |
| time_of_day | TEXT | NOT NULL, CHECK morning/evening |
| notes | TEXT | NOT NULL, default '' |
| gratitude | TEXT | NOT NULL, default '' |
| created_at | TEXT | NOT NULL, default now |
| | | UNIQUE(checkin_date, time_of_day) |

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PUT, PATCH, DELETE) |
| 201 | Created (POST) |
| 400 | Validation error (missing/invalid fields) |
| 404 | Resource not found |
| 409 | Conflict (duplicate slot/date) |
| 500 | Server error |

## Future Improvements

- Authentication for multi-device access
- PostgreSQL migration for production readiness
- Data export (CSV/JSON)
- Weekly/monthly analytics views
- Dark/light theme toggle
- Cloud deployment
