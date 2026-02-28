// routes/applications.js — Job Applications tracker CRUD endpoints
// Pipeline tracking with status filter and stats
const express = require('express');
const router = express.Router();
const { db, toRows, toRow } = require('../db/connection');
const { isValidDate, withinMaxLen, todayStr, VALID_STATUSES } = require('../utils/validate');

// GET /api/applications?status=applied
router.get('/', async (req, res) => {
  try {
    if (req.query.status && !VALID_STATUSES.includes(req.query.status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    let sql = 'SELECT id, company, role, date_applied, status, notes, created_at FROM job_applications';
    const args = [];
    if (req.query.status) {
      sql += ' WHERE status = ?';
      args.push(req.query.status);
    }
    sql += ' ORDER BY date_applied DESC, id DESC';
    const result = await db.execute({ sql, args });
    res.json(toRows(result));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/applications error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/stats
router.get('/stats', async (req, res) => {
  try {
    const byStatusResult = await db.execute(
      'SELECT status, COUNT(*) AS count FROM job_applications GROUP BY status ORDER BY count DESC'
    );
    const totalResult = await db.execute('SELECT COUNT(*) AS total FROM job_applications');
    res.json({ total: toRow(totalResult).total, by_status: toRows(byStatusResult) });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/applications/stats error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/applications
router.post('/', async (req, res) => {
  try {
    const { company, role, date_applied, status, notes } = req.body;
    if (!company || !role) {
      return res.status(400).json({ error: 'company and role are required' });
    }
    if (!withinMaxLen(company, 200)) return res.status(400).json({ error: 'company must be 200 characters or less' });
    if (!withinMaxLen(role, 200)) return res.status(400).json({ error: 'role must be 200 characters or less' });
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (notes && !withinMaxLen(notes, 1000)) return res.status(400).json({ error: 'notes must be 1000 characters or less' });
    if (date_applied && !isValidDate(date_applied)) return res.status(400).json({ error: 'date_applied must be YYYY-MM-DD format' });

    const dateVal = date_applied || todayStr();
    const statusVal = status || 'applied';
    const notesVal = notes || '';
    const ins = await db.execute({
      sql: 'INSERT INTO job_applications (company, role, date_applied, status, notes) VALUES (?, ?, ?, ?, ?)',
      args: [company, role, dateVal, statusVal, notesVal],
    });
    const created = await db.execute({
      sql: 'SELECT * FROM job_applications WHERE id = ?',
      args: [Number(ins.lastInsertRowid)],
    });
    res.status(201).json(toRow(created));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/applications error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/applications/:id
router.put('/:id', async (req, res) => {
  try {
    const getResult = await db.execute({ sql: 'SELECT * FROM job_applications WHERE id = ?', args: [req.params.id] });
    const item = toRow(getResult);
    if (!item) return res.status(404).json({ error: 'Application not found' });

    const company = req.body.company !== undefined ? req.body.company : item.company;
    const role = req.body.role !== undefined ? req.body.role : item.role;
    const status = req.body.status !== undefined ? req.body.status : item.status;
    const notes = req.body.notes !== undefined ? req.body.notes : item.notes;

    if (typeof company === 'string' && !withinMaxLen(company, 200)) {
      return res.status(400).json({ error: 'company must be 200 characters or less' });
    }
    if (typeof role === 'string' && !withinMaxLen(role, 200)) {
      return res.status(400).json({ error: 'role must be 200 characters or less' });
    }
    if (req.body.status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (typeof notes === 'string' && !withinMaxLen(notes, 1000)) {
      return res.status(400).json({ error: 'notes must be 1000 characters or less' });
    }
    await db.execute({
      sql: 'UPDATE job_applications SET company = ?, role = ?, status = ?, notes = ? WHERE id = ?',
      args: [company, role, status, notes, req.params.id],
    });
    const updated = await db.execute({ sql: 'SELECT * FROM job_applications WHERE id = ?', args: [req.params.id] });
    res.json(toRow(updated));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PUT /api/applications/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/applications/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM job_applications WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Application not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DELETE /api/applications/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
