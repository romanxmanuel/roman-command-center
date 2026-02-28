// routes/dev_tasks.js — Developer Tasks CRUD endpoints
// Project-based task tracker for personal dev projects and side projects
const express = require('express');
const router = express.Router();
const { db, toRows, toRow } = require('../db/connection');
const { withinMaxLen } = require('../utils/validate');

const VALID_STATUSES = ['todo', 'in_progress', 'done'];

// GET /api/dev-tasks?project=X&status=Y
router.get('/', async (req, res) => {
  try {
    let sql = 'SELECT id, project, title, status, priority, notes, created_at FROM dev_tasks';
    const args = [];
    const conditions = [];

    if (req.query.project) {
      conditions.push('project = ?');
      args.push(req.query.project);
    }
    if (req.query.status) {
      if (!VALID_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ error: 'status must be todo, in_progress, or done' });
      }
      conditions.push('status = ?');
      args.push(req.query.status);
    }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY priority ASC, created_at ASC';

    const result = await db.execute({ sql, args });
    res.json(toRows(result));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/dev-tasks error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dev-tasks/projects — distinct project names
router.get('/projects', async (req, res) => {
  try {
    const result = await db.execute('SELECT DISTINCT project FROM dev_tasks ORDER BY project ASC');
    res.json(result.rows.map(row => row[0]));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/dev-tasks/projects error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dev-tasks — { project, title, priority?, status?, notes? }
router.post('/', async (req, res) => {
  try {
    const { project, title, priority, status, notes } = req.body;
    if (!project || !title) {
      return res.status(400).json({ error: 'project and title are required' });
    }
    if (!withinMaxLen(project, 100)) {
      return res.status(400).json({ error: 'project must be 100 characters or less' });
    }
    if (!withinMaxLen(title, 200)) {
      return res.status(400).json({ error: 'title must be 200 characters or less' });
    }
    const priorityVal = priority !== undefined ? priority : 2;
    if (!Number.isInteger(priorityVal) || priorityVal < 1 || priorityVal > 3) {
      return res.status(400).json({ error: 'priority must be 1 (high), 2 (medium), or 3 (low)' });
    }
    const statusVal = status || 'todo';
    if (!VALID_STATUSES.includes(statusVal)) {
      return res.status(400).json({ error: 'status must be todo, in_progress, or done' });
    }
    if (notes && !withinMaxLen(notes, 1000)) {
      return res.status(400).json({ error: 'notes must be 1000 characters or less' });
    }
    const notesVal = notes || '';
    const ins = await db.execute({
      sql: 'INSERT INTO dev_tasks (project, title, priority, status, notes) VALUES (?, ?, ?, ?, ?)',
      args: [project, title, priorityVal, statusVal, notesVal],
    });
    const created = await db.execute({ sql: 'SELECT * FROM dev_tasks WHERE id = ?', args: [Number(ins.lastInsertRowid)] });
    res.status(201).json(toRow(created));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/dev-tasks error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dev-tasks/:id — { project?, title?, priority?, status?, notes? }
router.put('/:id', async (req, res) => {
  try {
    const getResult = await db.execute({ sql: 'SELECT * FROM dev_tasks WHERE id = ?', args: [req.params.id] });
    const item = toRow(getResult);
    if (!item) return res.status(404).json({ error: 'Task not found' });

    const project = req.body.project !== undefined ? req.body.project : item.project;
    const title = req.body.title !== undefined ? req.body.title : item.title;
    const priority = req.body.priority !== undefined ? req.body.priority : item.priority;
    const status = req.body.status !== undefined ? req.body.status : item.status;
    const notes = req.body.notes !== undefined ? req.body.notes : item.notes;

    if (typeof project === 'string' && !withinMaxLen(project, 100)) {
      return res.status(400).json({ error: 'project must be 100 characters or less' });
    }
    if (typeof title === 'string' && !withinMaxLen(title, 200)) {
      return res.status(400).json({ error: 'title must be 200 characters or less' });
    }
    if (!Number.isInteger(Number(priority)) || Number(priority) < 1 || Number(priority) > 3) {
      return res.status(400).json({ error: 'priority must be 1, 2, or 3' });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'status must be todo, in_progress, or done' });
    }
    if (typeof notes === 'string' && !withinMaxLen(notes, 1000)) {
      return res.status(400).json({ error: 'notes must be 1000 characters or less' });
    }
    await db.execute({
      sql: 'UPDATE dev_tasks SET project = ?, title = ?, priority = ?, status = ?, notes = ? WHERE id = ?',
      args: [project, title, Number(priority), status, notes, req.params.id],
    });
    const updated = await db.execute({ sql: 'SELECT * FROM dev_tasks WHERE id = ?', args: [req.params.id] });
    res.json(toRow(updated));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PUT /api/dev-tasks/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/dev-tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM dev_tasks WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DELETE /api/dev-tasks/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
