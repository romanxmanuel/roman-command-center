// routes/plan.js — Tomorrow's Plan CRUD endpoints + slot reordering
// 6 planned items per day with "done when" criteria
const express = require('express');
const router = express.Router();
const { db, toRows, toRow } = require('../db/connection');
const { isValidDate, withinMaxLen, tomorrowStr } = require('../utils/validate');

// GET /api/plan?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    if (req.query.date && !isValidDate(req.query.date)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD format' });
    }
    const planDate = req.query.date || tomorrowStr();
    const result = await db.execute({
      sql: 'SELECT id, plan_date, slot, title, done_when, is_done, created_at FROM tomorrow_plan WHERE plan_date = ? ORDER BY slot ASC',
      args: [planDate],
    });
    res.json(toRows(result));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/plan error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plan — create a single item: { title, slot, done_when?, plan_date? }
router.post('/', async (req, res) => {
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
    const ins = await db.execute({
      sql: 'INSERT INTO tomorrow_plan (title, slot, done_when, plan_date) VALUES (?, ?, ?, ?)',
      args: [title, slot, doneWhenVal, dateVal],
    });
    const created = await db.execute({
      sql: 'SELECT * FROM tomorrow_plan WHERE id = ?',
      args: [Number(ins.lastInsertRowid)],
    });
    res.status(201).json(toRow(created));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/plan error:`, err.message);
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: `Slot ${req.body.slot} already taken for that date` });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plan/bulk — replace all items for a date atomically
router.post('/bulk', async (req, res) => {
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
    const statements = [
      { sql: 'DELETE FROM tomorrow_plan WHERE plan_date = ?', args: [dateVal] },
      ...items.map(item => ({
        sql: 'INSERT INTO tomorrow_plan (title, slot, done_when, plan_date) VALUES (?, ?, ?, ?)',
        args: [item.title, item.slot, item.done_when || '', dateVal],
      })),
    ];
    await db.batch(statements, 'write');

    const rows = await db.execute({
      sql: 'SELECT * FROM tomorrow_plan WHERE plan_date = ? ORDER BY slot ASC',
      args: [dateVal],
    });
    res.status(201).json(toRows(rows));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/plan/bulk error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/plan/:id/slot — swap slots atomically
router.patch('/:id/slot', async (req, res) => {
  try {
    const newSlot = parseInt(req.body.slot);
    if (!Number.isInteger(newSlot) || newSlot < 1 || newSlot > 6) {
      return res.status(400).json({ error: 'slot must be between 1 and 6' });
    }
    const getResult = await db.execute({ sql: 'SELECT * FROM tomorrow_plan WHERE id = ?', args: [req.params.id] });
    const item = toRow(getResult);
    if (!item) return res.status(404).json({ error: 'Plan item not found' });
    if (Number(item.slot) === newSlot) return res.json(item);

    const conflictResult = await db.execute({
      sql: 'SELECT * FROM tomorrow_plan WHERE plan_date = ? AND slot = ?',
      args: [item.plan_date, newSlot],
    });
    const conflict = toRow(conflictResult);

    if (conflict) {
      await db.batch([
        { sql: 'UPDATE tomorrow_plan SET slot = 0 WHERE id = ?', args: [conflict.id] },
        { sql: 'UPDATE tomorrow_plan SET slot = ? WHERE id = ?', args: [newSlot, item.id] },
        { sql: 'UPDATE tomorrow_plan SET slot = ? WHERE id = ?', args: [item.slot, conflict.id] },
      ], 'write');
    } else {
      await db.execute({ sql: 'UPDATE tomorrow_plan SET slot = ? WHERE id = ?', args: [newSlot, req.params.id] });
    }

    const updated = await db.execute({ sql: 'SELECT * FROM tomorrow_plan WHERE id = ?', args: [req.params.id] });
    res.json(toRow(updated));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PATCH /api/plan/:id/slot error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/plan/:id — partial update: { title?, done_when?, is_done? }
router.patch('/:id', async (req, res) => {
  try {
    const getResult = await db.execute({ sql: 'SELECT * FROM tomorrow_plan WHERE id = ?', args: [req.params.id] });
    const item = toRow(getResult);
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
    await db.execute({
      sql: 'UPDATE tomorrow_plan SET title = ?, done_when = ?, is_done = ? WHERE id = ?',
      args: [title, doneWhen, isDone, req.params.id],
    });
    const updated = await db.execute({ sql: 'SELECT * FROM tomorrow_plan WHERE id = ?', args: [req.params.id] });
    res.json(toRow(updated));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PATCH /api/plan/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/plan/:id — full update (alias for PATCH)
router.put('/:id', async (req, res) => {
  try {
    const getResult = await db.execute({ sql: 'SELECT * FROM tomorrow_plan WHERE id = ?', args: [req.params.id] });
    const item = toRow(getResult);
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
    await db.execute({
      sql: 'UPDATE tomorrow_plan SET title = ?, done_when = ?, is_done = ? WHERE id = ?',
      args: [title, doneWhen, isDone, req.params.id],
    });
    const updated = await db.execute({ sql: 'SELECT * FROM tomorrow_plan WHERE id = ?', args: [req.params.id] });
    res.json(toRow(updated));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PUT /api/plan/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/plan/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM tomorrow_plan WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Plan item not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DELETE /api/plan/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
