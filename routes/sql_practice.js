// routes/sql_practice.js — SQL Practice log CRUD endpoints
// Track daily SQL study sessions with topic, duration, and notes
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { isValidDate, isPositiveInt, withinMaxLen, todayStr } = require('../utils/validate');

// GET /api/sql-practice?limit=30
// Returns recent practice sessions
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const rows = db.prepare(`
      SELECT id, practice_date, topic, minutes, notes, created_at
      FROM sql_practice
      ORDER BY practice_date DESC, id DESC
      LIMIT ?
    `).all(limit);
    res.json(rows);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/sql-practice error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sql-practice/stats
// Returns total sessions, total minutes, and minutes per topic
router.get('/stats', (req, res) => {
  try {
    const totals = db.prepare(`
      SELECT COUNT(*) AS total_sessions,
             COALESCE(SUM(minutes), 0) AS total_minutes
      FROM sql_practice
    `).get();

    const byTopic = db.prepare(`
      SELECT topic,
             COUNT(*) AS sessions,
             SUM(minutes) AS total_minutes
      FROM sql_practice
      GROUP BY topic
      ORDER BY total_minutes DESC
    `).all();

    res.json({ ...totals, by_topic: byTopic });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/sql-practice/stats error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sql-practice
// Create a practice entry: { topic, minutes, notes?, practice_date? }
router.post('/', (req, res) => {
  try {
    const { topic, minutes, notes, practice_date } = req.body;
    if (!topic || minutes === undefined) {
      return res.status(400).json({ error: 'topic and minutes are required' });
    }
    if (!withinMaxLen(topic, 200)) {
      return res.status(400).json({ error: 'topic must be 200 characters or less' });
    }
    if (!isPositiveInt(minutes)) {
      return res.status(400).json({ error: 'minutes must be a non-negative integer' });
    }
    if (notes && !withinMaxLen(notes, 1000)) {
      return res.status(400).json({ error: 'notes must be 1000 characters or less' });
    }
    if (practice_date && !isValidDate(practice_date)) {
      return res.status(400).json({ error: 'practice_date must be YYYY-MM-DD format' });
    }
    const dateVal = practice_date || todayStr();
    const notesVal = notes || '';

    const result = db.prepare(`
      INSERT INTO sql_practice (topic, minutes, notes, practice_date)
      VALUES (?, ?, ?, ?)
    `).run(topic, minutes, notesVal, dateVal);
    const created = db.prepare('SELECT * FROM sql_practice WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/sql-practice error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sql-practice/:id
// Update a session: { topic?, minutes?, notes? }
router.put('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM sql_practice WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Practice entry not found' });

    const topic = req.body.topic !== undefined ? req.body.topic : item.topic;
    const minutes = req.body.minutes !== undefined ? req.body.minutes : item.minutes;
    const notes = req.body.notes !== undefined ? req.body.notes : item.notes;

    if (typeof topic === 'string' && !withinMaxLen(topic, 200)) {
      return res.status(400).json({ error: 'topic must be 200 characters or less' });
    }
    if (req.body.minutes !== undefined && !isPositiveInt(minutes)) {
      return res.status(400).json({ error: 'minutes must be a non-negative integer' });
    }
    if (typeof notes === 'string' && !withinMaxLen(notes, 1000)) {
      return res.status(400).json({ error: 'notes must be 1000 characters or less' });
    }
    db.prepare('UPDATE sql_practice SET topic = ?, minutes = ?, notes = ? WHERE id = ?')
      .run(topic, minutes, notes, req.params.id);
    const updated = db.prepare('SELECT * FROM sql_practice WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PUT /api/sql-practice/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sql-practice/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM sql_practice WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Practice entry not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DELETE /api/sql-practice/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
