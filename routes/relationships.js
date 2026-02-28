// routes/relationships.js — Relationship check-in CRUD endpoints
// Morning and evening entries with notes and gratitude
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { isValidDate, withinMaxLen, todayStr } = require('../utils/validate');

const VALID_TIMES = ['morning', 'evening'];

// GET /api/relationships?limit=30
// Returns recent check-ins
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const rows = db.prepare(`
      SELECT id, checkin_date, time_of_day, notes, gratitude, created_at
      FROM relationship_checkins
      ORDER BY checkin_date DESC, time_of_day DESC, id DESC
      LIMIT ?
    `).all(limit);
    res.json(rows);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/relationships error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/relationships/today
// Returns today's morning and evening check-ins
router.get('/today', (req, res) => {
  try {
    const today = todayStr();
    const rows = db.prepare(`
      SELECT id, checkin_date, time_of_day, notes, gratitude, created_at
      FROM relationship_checkins
      WHERE checkin_date = ?
      ORDER BY time_of_day ASC
    `).all(today);
    res.json(rows);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/relationships/today error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/relationships
// Create a check-in: { time_of_day, notes, gratitude?, checkin_date? }
router.post('/', (req, res) => {
  try {
    const { time_of_day, notes, gratitude, checkin_date } = req.body;
    if (!time_of_day || !notes) {
      return res.status(400).json({ error: 'time_of_day and notes are required' });
    }
    if (!VALID_TIMES.includes(time_of_day)) {
      return res.status(400).json({ error: 'time_of_day must be morning or evening' });
    }
    if (!withinMaxLen(notes, 1000)) {
      return res.status(400).json({ error: 'notes must be 1000 characters or less' });
    }
    if (gratitude && !withinMaxLen(gratitude, 500)) {
      return res.status(400).json({ error: 'gratitude must be 500 characters or less' });
    }
    if (checkin_date && !isValidDate(checkin_date)) {
      return res.status(400).json({ error: 'checkin_date must be YYYY-MM-DD format' });
    }
    const dateVal = checkin_date || todayStr();
    const gratitudeVal = gratitude || '';

    const result = db.prepare(`
      INSERT INTO relationship_checkins (time_of_day, notes, gratitude, checkin_date)
      VALUES (?, ?, ?, ?)
    `).run(time_of_day, notes, gratitudeVal, dateVal);
    const created = db.prepare('SELECT * FROM relationship_checkins WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/relationships error:`, err.message);
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: `${req.body.time_of_day} check-in already exists for that date` });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/relationships/:id
// Update: { notes?, gratitude? }
router.put('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM relationship_checkins WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Check-in not found' });

    const notes = req.body.notes !== undefined ? req.body.notes : item.notes;
    const gratitude = req.body.gratitude !== undefined ? req.body.gratitude : item.gratitude;

    if (typeof notes === 'string' && !withinMaxLen(notes, 1000)) {
      return res.status(400).json({ error: 'notes must be 1000 characters or less' });
    }
    if (typeof gratitude === 'string' && !withinMaxLen(gratitude, 500)) {
      return res.status(400).json({ error: 'gratitude must be 500 characters or less' });
    }
    db.prepare('UPDATE relationship_checkins SET notes = ?, gratitude = ? WHERE id = ?')
      .run(notes, gratitude, req.params.id);
    const updated = db.prepare('SELECT * FROM relationship_checkins WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PUT /api/relationships/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/relationships/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM relationship_checkins WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Check-in not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DELETE /api/relationships/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
