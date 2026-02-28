// routes/sql_practice.js — SQL Practice log CRUD endpoints
// Track daily study sessions with topic, duration, and notes
const express = require('express');
const router = express.Router();
const { db, toRows, toRow } = require('../db/connection');
const { isValidDate, isPositiveInt, withinMaxLen, todayStr } = require('../utils/validate');

// GET /api/sql-practice?limit=30
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const result = await db.execute({
      sql: 'SELECT id, practice_date, topic, minutes, notes, created_at FROM sql_practice ORDER BY practice_date DESC, id DESC LIMIT ?',
      args: [limit],
    });
    res.json(toRows(result));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/sql-practice error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sql-practice/stats
router.get('/stats', async (req, res) => {
  try {
    const totalsResult = await db.execute(
      'SELECT COUNT(*) AS total_sessions, COALESCE(SUM(minutes), 0) AS total_minutes FROM sql_practice'
    );
    const totals = toRow(totalsResult);

    const byTopicResult = await db.execute(
      'SELECT topic, COUNT(*) AS sessions, SUM(minutes) AS total_minutes FROM sql_practice GROUP BY topic ORDER BY total_minutes DESC'
    );
    res.json({ ...totals, by_topic: toRows(byTopicResult) });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/sql-practice/stats error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sql-practice
router.post('/', async (req, res) => {
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
    const ins = await db.execute({
      sql: 'INSERT INTO sql_practice (topic, minutes, notes, practice_date) VALUES (?, ?, ?, ?)',
      args: [topic, minutes, notesVal, dateVal],
    });
    const created = await db.execute({
      sql: 'SELECT * FROM sql_practice WHERE id = ?',
      args: [Number(ins.lastInsertRowid)],
    });
    res.status(201).json(toRow(created));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/sql-practice error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sql-practice/:id
router.put('/:id', async (req, res) => {
  try {
    const getResult = await db.execute({ sql: 'SELECT * FROM sql_practice WHERE id = ?', args: [req.params.id] });
    const item = toRow(getResult);
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
    await db.execute({
      sql: 'UPDATE sql_practice SET topic = ?, minutes = ?, notes = ? WHERE id = ?',
      args: [topic, minutes, notes, req.params.id],
    });
    const updated = await db.execute({ sql: 'SELECT * FROM sql_practice WHERE id = ?', args: [req.params.id] });
    res.json(toRow(updated));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PUT /api/sql-practice/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sql-practice/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM sql_practice WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Practice entry not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DELETE /api/sql-practice/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
