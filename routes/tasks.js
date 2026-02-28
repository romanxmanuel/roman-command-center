// routes/tasks.js — Power Tasks CRUD endpoints
// 3 priority tasks per day, with streak tracking
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { isValidDate, withinMaxLen, todayStr } = require('../utils/validate');

// GET /api/tasks?date=YYYY-MM-DD
// Returns tasks for a given date (defaults to today)
router.get('/', (req, res) => {
  try {
    if (req.query.date && !isValidDate(req.query.date)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD format' });
    }
    const taskDate = req.query.date || todayStr();
    const rows = db.prepare(`
      SELECT id, task_date, title, slot, is_done, created_at
      FROM power_tasks
      WHERE task_date = ?
      ORDER BY slot ASC
    `).all(taskDate);
    res.json(rows);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/tasks error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/streak
// Returns the current streak of days where all 3 tasks were completed
router.get('/streak', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT task_date,
             COUNT(*) AS total,
             SUM(is_done) AS done
      FROM power_tasks
      GROUP BY task_date
      ORDER BY task_date DESC
    `).all();

    let streak = 0;
    for (const row of rows) {
      if (row.total === 3 && row.done === 3) {
        streak++;
      } else {
        break;
      }
    }
    res.json({ streak });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/tasks/streak error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks
// Create a new power task: { title, slot, task_date? }
router.post('/', (req, res) => {
  try {
    const { title, slot, task_date } = req.body;
    if (!title || slot === undefined) {
      return res.status(400).json({ error: 'title and slot are required' });
    }
    if (!withinMaxLen(title, 200)) {
      return res.status(400).json({ error: 'title must be 200 characters or less' });
    }
    if (!Number.isInteger(slot) || slot < 1 || slot > 3) {
      return res.status(400).json({ error: 'slot must be 1, 2, or 3' });
    }
    if (task_date && !isValidDate(task_date)) {
      return res.status(400).json({ error: 'task_date must be YYYY-MM-DD format' });
    }
    const dateVal = task_date || todayStr();
    const result = db.prepare(`
      INSERT INTO power_tasks (title, slot, task_date)
      VALUES (?, ?, ?)
    `).run(title, slot, dateVal);
    const created = db.prepare('SELECT * FROM power_tasks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/tasks error:`, err.message);
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: `Slot ${req.body.slot} already taken for that date` });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id — toggle is_done (0 ↔ 1)
router.patch('/:id', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM power_tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const newDone = task.is_done ? 0 : 1;
    db.prepare('UPDATE power_tasks SET is_done = ? WHERE id = ?').run(newDone, req.params.id);
    const updated = db.prepare('SELECT * FROM power_tasks WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PATCH /api/tasks/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id — full update: { title?, is_done? }
router.put('/:id', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM power_tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const title = req.body.title !== undefined ? req.body.title : task.title;
    const isDone = req.body.is_done !== undefined ? req.body.is_done : task.is_done;

    if (typeof title === 'string' && !withinMaxLen(title, 200)) {
      return res.status(400).json({ error: 'title must be 200 characters or less' });
    }
    db.prepare('UPDATE power_tasks SET title = ?, is_done = ? WHERE id = ?')
      .run(title, isDone, req.params.id);
    const updated = db.prepare('SELECT * FROM power_tasks WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PUT /api/tasks/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM power_tasks WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DELETE /api/tasks/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
