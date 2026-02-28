// routes/plan.js — Tomorrow's Plan CRUD endpoints
// 6 planned items per day with "done when" criteria
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { isValidDate, withinMaxLen, tomorrowStr } = require('../utils/validate');

// GET /api/plan?date=YYYY-MM-DD
// Returns plan items for a given date (defaults to tomorrow)
router.get('/', (req, res) => {
  try {
    if (req.query.date && !isValidDate(req.query.date)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD format' });
    }
    const planDate = req.query.date || tomorrowStr();
    const rows = db.prepare(`
      SELECT id, plan_date, slot, title, done_when, is_done, created_at
      FROM tomorrow_plan
      WHERE plan_date = ?
      ORDER BY slot ASC
    `).all(planDate);
    res.json(rows);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/plan error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plan
// Create a single plan item: { title, slot, done_when?, plan_date? }
router.post('/', (req, res) => {
  try {
    const { title, slot, done_when, plan_date } = req.body;
    if (!title || slot === undefined) {
      return res.status(400).json({ error: 'title and slot are required' });
    }
    if (!withinMaxLen(title, 200)) {
      return res.status(400).json({ error: 'title must be 200 characters or less' });
    }
    if (done_when && !withinMaxLen(done_when, 500)) {
      return res.status(400).json({ error: 'done_when must be 500 characters or less' });
    }
    if (!Number.isInteger(slot) || slot < 1 || slot > 6) {
      return res.status(400).json({ error: 'slot must be between 1 and 6' });
    }
    if (plan_date && !isValidDate(plan_date)) {
      return res.status(400).json({ error: 'plan_date must be YYYY-MM-DD format' });
    }
    const dateVal = plan_date || tomorrowStr();
    const doneWhenVal = done_when || '';
    const result = db.prepare(`
      INSERT INTO tomorrow_plan (title, slot, done_when, plan_date)
      VALUES (?, ?, ?, ?)
    `).run(title, slot, doneWhenVal, dateVal);
    const created = db.prepare('SELECT * FROM tomorrow_plan WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/plan error:`, err.message);
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: `Slot ${req.body.slot} already taken for that date` });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plan/bulk
// Replace all plan items for a date. Deletes existing items, inserts new ones.
// Body: { plan_date?, items: [{ slot, title, done_when? }, ...] }
router.post('/bulk', (req, res) => {
  try {
    const { plan_date, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required and must not be empty' });
    }
    if (items.length > 6) {
      return res.status(400).json({ error: 'Maximum 6 items allowed' });
    }
    if (plan_date && !isValidDate(plan_date)) {
      return res.status(400).json({ error: 'plan_date must be YYYY-MM-DD format' });
    }
    for (const item of items) {
      if (!item.title || item.slot === undefined) {
        return res.status(400).json({ error: 'Each item requires title and slot' });
      }
      if (!withinMaxLen(item.title, 200)) {
        return res.status(400).json({ error: 'title must be 200 characters or less' });
      }
      if (item.done_when && !withinMaxLen(item.done_when, 500)) {
        return res.status(400).json({ error: 'done_when must be 500 characters or less' });
      }
      if (!Number.isInteger(item.slot) || item.slot < 1 || item.slot > 6) {
        return res.status(400).json({ error: 'slot must be between 1 and 6' });
      }
    }

    const dateVal = plan_date || tomorrowStr();
    const bulkReplace = db.transaction(() => {
      db.prepare('DELETE FROM tomorrow_plan WHERE plan_date = ?').run(dateVal);
      const insert = db.prepare(`
        INSERT INTO tomorrow_plan (title, slot, done_when, plan_date)
        VALUES (?, ?, ?, ?)
      `);
      for (const item of items) {
        insert.run(item.title, item.slot, item.done_when || '', dateVal);
      }
    });
    bulkReplace();

    const rows = db.prepare(`
      SELECT * FROM tomorrow_plan WHERE plan_date = ? ORDER BY slot ASC
    `).all(dateVal);
    res.status(201).json(rows);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/plan/bulk error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/plan/:id — partial update: { title?, done_when?, is_done? }
router.patch('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM tomorrow_plan WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Plan item not found' });

    const title = req.body.title !== undefined ? req.body.title : item.title;
    const doneWhen = req.body.done_when !== undefined ? req.body.done_when : item.done_when;
    const isDone = req.body.is_done !== undefined ? req.body.is_done : item.is_done;

    if (typeof title === 'string' && !withinMaxLen(title, 200)) {
      return res.status(400).json({ error: 'title must be 200 characters or less' });
    }
    if (typeof doneWhen === 'string' && !withinMaxLen(doneWhen, 500)) {
      return res.status(400).json({ error: 'done_when must be 500 characters or less' });
    }
    db.prepare('UPDATE tomorrow_plan SET title = ?, done_when = ?, is_done = ? WHERE id = ?')
      .run(title, doneWhen, isDone, req.params.id);
    const updated = db.prepare('SELECT * FROM tomorrow_plan WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PATCH /api/plan/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/plan/:id — update (same as PATCH, kept for flexibility)
router.put('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM tomorrow_plan WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Plan item not found' });

    const title = req.body.title !== undefined ? req.body.title : item.title;
    const doneWhen = req.body.done_when !== undefined ? req.body.done_when : item.done_when;
    const isDone = req.body.is_done !== undefined ? req.body.is_done : item.is_done;

    if (typeof title === 'string' && !withinMaxLen(title, 200)) {
      return res.status(400).json({ error: 'title must be 200 characters or less' });
    }
    if (typeof doneWhen === 'string' && !withinMaxLen(doneWhen, 500)) {
      return res.status(400).json({ error: 'done_when must be 500 characters or less' });
    }
    db.prepare('UPDATE tomorrow_plan SET title = ?, done_when = ?, is_done = ? WHERE id = ?')
      .run(title, doneWhen, isDone, req.params.id);
    const updated = db.prepare('SELECT * FROM tomorrow_plan WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PUT /api/plan/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/plan/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM tomorrow_plan WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Plan item not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DELETE /api/plan/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
