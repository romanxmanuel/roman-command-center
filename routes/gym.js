// routes/gym.js — Gym log CRUD endpoints
// Workout tracking with type, duration, and notes
const express = require('express');
const router = express.Router();
const { db, toRows, toRow } = require('../db/connection');
const { isValidDate, isPositiveInt, withinMaxLen, todayStr } = require('../utils/validate');

// GET /api/gym?limit=30
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const result = await db.execute({
      sql: 'SELECT id, log_date, workout_type, duration_minutes, notes, created_at FROM gym_log ORDER BY log_date DESC, id DESC LIMIT ?',
      args: [limit],
    });
    res.json(toRows(result));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/gym error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gym/stats
router.get('/stats', async (req, res) => {
  try {
    const totalsResult = await db.execute(
      'SELECT COUNT(*) AS total_workouts, COALESCE(SUM(duration_minutes), 0) AS total_minutes FROM gym_log'
    );
    const byTypeResult = await db.execute(
      'SELECT workout_type, COUNT(*) AS sessions, SUM(duration_minutes) AS total_minutes FROM gym_log GROUP BY workout_type ORDER BY sessions DESC'
    );
    res.json({ ...toRow(totalsResult), by_type: toRows(byTypeResult) });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/gym/stats error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gym
router.post('/', async (req, res) => {
  try {
    const { workout_type, duration_minutes, notes, log_date } = req.body;
    if (!workout_type || duration_minutes === undefined) {
      return res.status(400).json({ error: 'workout_type and duration_minutes are required' });
    }
    if (!withinMaxLen(workout_type, 100)) {
      return res.status(400).json({ error: 'workout_type must be 100 characters or less' });
    }
    if (!isPositiveInt(duration_minutes)) {
      return res.status(400).json({ error: 'duration_minutes must be a non-negative integer' });
    }
    if (notes && !withinMaxLen(notes, 1000)) {
      return res.status(400).json({ error: 'notes must be 1000 characters or less' });
    }
    if (log_date && !isValidDate(log_date)) {
      return res.status(400).json({ error: 'log_date must be YYYY-MM-DD format' });
    }
    const dateVal = log_date || todayStr();
    const notesVal = notes || '';
    const ins = await db.execute({
      sql: 'INSERT INTO gym_log (workout_type, duration_minutes, notes, log_date) VALUES (?, ?, ?, ?)',
      args: [workout_type, duration_minutes, notesVal, dateVal],
    });
    const created = await db.execute({ sql: 'SELECT * FROM gym_log WHERE id = ?', args: [Number(ins.lastInsertRowid)] });
    res.status(201).json(toRow(created));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/gym error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/gym/:id
router.put('/:id', async (req, res) => {
  try {
    const getResult = await db.execute({ sql: 'SELECT * FROM gym_log WHERE id = ?', args: [req.params.id] });
    const item = toRow(getResult);
    if (!item) return res.status(404).json({ error: 'Gym entry not found' });

    const workoutType = req.body.workout_type !== undefined ? req.body.workout_type : item.workout_type;
    const durationMinutes = req.body.duration_minutes !== undefined ? req.body.duration_minutes : item.duration_minutes;
    const notes = req.body.notes !== undefined ? req.body.notes : item.notes;

    if (typeof workoutType === 'string' && !withinMaxLen(workoutType, 100)) {
      return res.status(400).json({ error: 'workout_type must be 100 characters or less' });
    }
    if (req.body.duration_minutes !== undefined && !isPositiveInt(durationMinutes)) {
      return res.status(400).json({ error: 'duration_minutes must be a non-negative integer' });
    }
    if (typeof notes === 'string' && !withinMaxLen(notes, 1000)) {
      return res.status(400).json({ error: 'notes must be 1000 characters or less' });
    }
    await db.execute({
      sql: 'UPDATE gym_log SET workout_type = ?, duration_minutes = ?, notes = ? WHERE id = ?',
      args: [workoutType, durationMinutes, notes, req.params.id],
    });
    const updated = await db.execute({ sql: 'SELECT * FROM gym_log WHERE id = ?', args: [req.params.id] });
    res.json(toRow(updated));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PUT /api/gym/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/gym/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM gym_log WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Gym entry not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DELETE /api/gym/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
