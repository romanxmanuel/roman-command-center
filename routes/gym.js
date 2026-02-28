// routes/gym.js — Gym log CRUD endpoints
// Workout tracking with type, duration, and notes
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { isValidDate, isPositiveInt, withinMaxLen, todayStr } = require('../utils/validate');

// GET /api/gym?limit=30
// Returns recent gym entries
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const rows = db.prepare(`
      SELECT id, log_date, workout_type, duration_minutes, notes, created_at
      FROM gym_log
      ORDER BY log_date DESC, id DESC
      LIMIT ?
    `).all(limit);
    res.json(rows);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/gym error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gym/stats
// Returns total workouts, total minutes, and breakdown by workout type
router.get('/stats', (req, res) => {
  try {
    const totals = db.prepare(`
      SELECT COUNT(*) AS total_workouts,
             COALESCE(SUM(duration_minutes), 0) AS total_minutes
      FROM gym_log
    `).get();

    const byType = db.prepare(`
      SELECT workout_type,
             COUNT(*) AS sessions,
             SUM(duration_minutes) AS total_minutes
      FROM gym_log
      GROUP BY workout_type
      ORDER BY sessions DESC
    `).all();

    res.json({ ...totals, by_type: byType });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/gym/stats error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gym
// Create a gym entry: { workout_type, duration_minutes, notes?, log_date? }
router.post('/', (req, res) => {
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

    const result = db.prepare(`
      INSERT INTO gym_log (workout_type, duration_minutes, notes, log_date)
      VALUES (?, ?, ?, ?)
    `).run(workout_type, duration_minutes, notesVal, dateVal);
    const created = db.prepare('SELECT * FROM gym_log WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/gym error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/gym/:id
// Update: { workout_type?, duration_minutes?, notes? }
router.put('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM gym_log WHERE id = ?').get(req.params.id);
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
    db.prepare('UPDATE gym_log SET workout_type = ?, duration_minutes = ?, notes = ? WHERE id = ?')
      .run(workoutType, durationMinutes, notes, req.params.id);
    const updated = db.prepare('SELECT * FROM gym_log WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PUT /api/gym/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/gym/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM gym_log WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Gym entry not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DELETE /api/gym/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
