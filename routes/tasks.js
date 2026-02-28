// routes/tasks.js — Power Tasks CRUD endpoints + slot reordering
// 3 priority tasks per day, streak tracking, slot-swap support
const express = require('express');
const router = express.Router();
const { db, toRows, toRow } = require('../db/connection');
const { isValidDate, withinMaxLen, todayStr } = require('../utils/validate');

// GET /api/tasks?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    if (req.query.date && !isValidDate(req.query.date)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD format' });
    }
    const taskDate = req.query.date || todayStr();
    const result = await db.execute({
      sql: 'SELECT id, task_date, title, slot, is_done, created_at FROM power_tasks WHERE task_date = ? ORDER BY slot ASC',
      args: [taskDate],
    });
    res.json(toRows(result));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/tasks error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/streak — consecutive days with all 3 tasks completed
router.get('/streak', async (req, res) => {
  try {
    const result = await db.execute(
      'SELECT task_date, COUNT(*) AS total, SUM(is_done) AS done FROM power_tasks GROUP BY task_date ORDER BY task_date DESC'
    );
    let streak = 0;
    for (const row of result.rows) {
      if (Number(row[1]) === 3 && Number(row[2]) === 3) {
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

// POST /api/tasks — create a task: { title, slot, task_date? }
router.post('/', async (req, res) => {
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
    const ins = await db.execute({
      sql: 'INSERT INTO power_tasks (title, slot, task_date) VALUES (?, ?, ?)',
      args: [title, slot, dateVal],
    });
    const created = await db.execute({
      sql: 'SELECT * FROM power_tasks WHERE id = ?',
      args: [Number(ins.lastInsertRowid)],
    });
    res.status(201).json(toRow(created));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/tasks error:`, err.message);
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: `Slot ${req.body.slot} already taken for that date` });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id — toggle is_done (0 ↔ 1)
router.patch('/:id', async (req, res) => {
  try {
    const getResult = await db.execute({
      sql: 'SELECT * FROM power_tasks WHERE id = ?',
      args: [req.params.id],
    });
    const task = toRow(getResult);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const newDone = Number(task.is_done) ? 0 : 1;
    await db.execute({ sql: 'UPDATE power_tasks SET is_done = ? WHERE id = ?', args: [newDone, req.params.id] });
    const updated = await db.execute({ sql: 'SELECT * FROM power_tasks WHERE id = ?', args: [req.params.id] });
    res.json(toRow(updated));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PATCH /api/tasks/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id/slot — swap priority slots atomically
router.patch('/:id/slot', async (req, res) => {
  try {
    const newSlot = parseInt(req.body.slot);
    if (!Number.isInteger(newSlot) || newSlot < 1 || newSlot > 3) {
      return res.status(400).json({ error: 'slot must be 1, 2, or 3' });
    }
    const getResult = await db.execute({ sql: 'SELECT * FROM power_tasks WHERE id = ?', args: [req.params.id] });
    const task = toRow(getResult);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (Number(task.slot) === newSlot) {
      return res.json(task);
    }

    // Find the task currently at the target slot for the same date
    const conflictResult = await db.execute({
      sql: 'SELECT * FROM power_tasks WHERE task_date = ? AND slot = ?',
      args: [task.task_date, newSlot],
    });
    const conflict = toRow(conflictResult);

    if (conflict) {
      // Use slot 0 as temp to avoid UNIQUE collision during swap
      await db.batch([
        { sql: 'UPDATE power_tasks SET slot = 0 WHERE id = ?', args: [conflict.id] },
        { sql: 'UPDATE power_tasks SET slot = ? WHERE id = ?', args: [newSlot, task.id] },
        { sql: 'UPDATE power_tasks SET slot = ? WHERE id = ?', args: [task.slot, conflict.id] },
      ], 'write');
    } else {
      await db.execute({ sql: 'UPDATE power_tasks SET slot = ? WHERE id = ?', args: [newSlot, req.params.id] });
    }

    const updated = await db.execute({ sql: 'SELECT * FROM power_tasks WHERE id = ?', args: [req.params.id] });
    res.json(toRow(updated));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PATCH /api/tasks/:id/slot error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id — update title and/or is_done
router.put('/:id', async (req, res) => {
  try {
    const getResult = await db.execute({ sql: 'SELECT * FROM power_tasks WHERE id = ?', args: [req.params.id] });
    const task = toRow(getResult);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const title = req.body.title !== undefined ? req.body.title : task.title;
    const isDone = req.body.is_done !== undefined ? req.body.is_done : task.is_done;

    if (typeof title === 'string' && !withinMaxLen(title, 200)) {
      return res.status(400).json({ error: 'title must be 200 characters or less' });
    }
    await db.execute({ sql: 'UPDATE power_tasks SET title = ?, is_done = ? WHERE id = ?', args: [title, isDone, req.params.id] });
    const updated = await db.execute({ sql: 'SELECT * FROM power_tasks WHERE id = ?', args: [req.params.id] });
    res.json(toRow(updated));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PUT /api/tasks/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM power_tasks WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DELETE /api/tasks/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
