// routes/relationships.js — Relationship check-in CRUD endpoints
// Morning and evening entries with author (Roman/Jessica), gratitude, and notes
const express = require('express');
const router = express.Router();
const { db, toRows, toRow } = require('../db/connection');
const { isValidDate, withinMaxLen, todayStr } = require('../utils/validate');

const VALID_TIMES = ['morning', 'evening'];
const VALID_AUTHORS = ['Roman', 'Jessica'];

// GET /api/relationships?limit=30
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const result = await db.execute({
      sql: 'SELECT id, checkin_date, time_of_day, author, gratitude, notes, created_at FROM relationship_checkins ORDER BY checkin_date DESC, time_of_day DESC, id DESC LIMIT ?',
      args: [limit],
    });
    res.json(toRows(result));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/relationships error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/relationships/today
router.get('/today', async (req, res) => {
  try {
    const today = todayStr();
    const result = await db.execute({
      sql: 'SELECT id, checkin_date, time_of_day, author, gratitude, notes, created_at FROM relationship_checkins WHERE checkin_date = ? ORDER BY time_of_day ASC',
      args: [today],
    });
    res.json(toRows(result));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/relationships/today error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/relationships — { time_of_day, author?, gratitude?, notes, checkin_date? }
router.post('/', async (req, res) => {
  try {
    const { time_of_day, author, notes, gratitude, checkin_date } = req.body;
    if (!time_of_day || !notes) {
      return res.status(400).json({ error: 'time_of_day and notes are required' });
    }
    if (!VALID_TIMES.includes(time_of_day)) {
      return res.status(400).json({ error: 'time_of_day must be morning or evening' });
    }
    const authorVal = author || 'Roman';
    if (!VALID_AUTHORS.includes(authorVal)) {
      return res.status(400).json({ error: 'author must be Roman or Jessica' });
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

    const ins = await db.execute({
      sql: 'INSERT INTO relationship_checkins (time_of_day, author, notes, gratitude, checkin_date) VALUES (?, ?, ?, ?, ?)',
      args: [time_of_day, authorVal, notes, gratitudeVal, dateVal],
    });
    const created = await db.execute({
      sql: 'SELECT * FROM relationship_checkins WHERE id = ?',
      args: [Number(ins.lastInsertRowid)],
    });
    res.status(201).json(toRow(created));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/relationships error:`, err.message);
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: `${req.body.time_of_day} check-in by ${req.body.author || 'Roman'} already exists for that date` });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/relationships/:id — { notes?, gratitude?, author? }
router.put('/:id', async (req, res) => {
  try {
    const getResult = await db.execute({ sql: 'SELECT * FROM relationship_checkins WHERE id = ?', args: [req.params.id] });
    const item = toRow(getResult);
    if (!item) return res.status(404).json({ error: 'Check-in not found' });

    const notes = req.body.notes !== undefined ? req.body.notes : item.notes;
    const gratitude = req.body.gratitude !== undefined ? req.body.gratitude : item.gratitude;
    const author = req.body.author !== undefined ? req.body.author : item.author;

    if (typeof notes === 'string' && !withinMaxLen(notes, 1000)) {
      return res.status(400).json({ error: 'notes must be 1000 characters or less' });
    }
    if (typeof gratitude === 'string' && !withinMaxLen(gratitude, 500)) {
      return res.status(400).json({ error: 'gratitude must be 500 characters or less' });
    }
    if (!VALID_AUTHORS.includes(author)) {
      return res.status(400).json({ error: 'author must be Roman or Jessica' });
    }
    await db.execute({
      sql: 'UPDATE relationship_checkins SET notes = ?, gratitude = ?, author = ? WHERE id = ?',
      args: [notes, gratitude, author, req.params.id],
    });
    const updated = await db.execute({ sql: 'SELECT * FROM relationship_checkins WHERE id = ?', args: [req.params.id] });
    res.json(toRow(updated));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PUT /api/relationships/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/relationships/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM relationship_checkins WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Check-in not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DELETE /api/relationships/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
