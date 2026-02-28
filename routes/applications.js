// routes/applications.js — Job Applications tracker CRUD endpoints
// Pipeline tracking with status filter and stats
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { isValidDate, withinMaxLen, todayStr, VALID_STATUSES } = require('../utils/validate');

// GET /api/applications?status=applied
// Returns job applications, optionally filtered by status
router.get('/', (req, res) => {
  try {
    if (req.query.status && !VALID_STATUSES.includes(req.query.status)) {
      return res.status(400).json({
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }
    let query = `
      SELECT id, company, role, date_applied, status, notes, created_at
      FROM job_applications
    `;
    const params = [];

    if (req.query.status) {
      query += ' WHERE status = ?';
      params.push(req.query.status);
    }
    query += ' ORDER BY date_applied DESC, id DESC';

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/applications error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/stats
// Returns counts grouped by status
router.get('/stats', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM job_applications
      GROUP BY status
      ORDER BY count DESC
    `).all();

    const total = db.prepare('SELECT COUNT(*) AS total FROM job_applications').get();
    res.json({ total: total.total, by_status: rows });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] GET /api/applications/stats error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/applications
// Create an application: { company, role, date_applied?, status?, notes? }
router.post('/', (req, res) => {
  try {
    const { company, role, date_applied, status, notes } = req.body;
    if (!company || !role) {
      return res.status(400).json({ error: 'company and role are required' });
    }
    if (!withinMaxLen(company, 200)) {
      return res.status(400).json({ error: 'company must be 200 characters or less' });
    }
    if (!withinMaxLen(role, 200)) {
      return res.status(400).json({ error: 'role must be 200 characters or less' });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }
    if (notes && !withinMaxLen(notes, 1000)) {
      return res.status(400).json({ error: 'notes must be 1000 characters or less' });
    }
    if (date_applied && !isValidDate(date_applied)) {
      return res.status(400).json({ error: 'date_applied must be YYYY-MM-DD format' });
    }
    const dateVal = date_applied || todayStr();
    const statusVal = status || 'applied';
    const notesVal = notes || '';

    const result = db.prepare(`
      INSERT INTO job_applications (company, role, date_applied, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(company, role, dateVal, statusVal, notesVal);
    const created = db.prepare('SELECT * FROM job_applications WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/applications error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/applications/:id
// Update: { company?, role?, status?, notes? }
router.put('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM job_applications WHERE id = ?').get(req.params.id);
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
      return res.status(400).json({
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }
    if (typeof notes === 'string' && !withinMaxLen(notes, 1000)) {
      return res.status(400).json({ error: 'notes must be 1000 characters or less' });
    }
    db.prepare('UPDATE job_applications SET company = ?, role = ?, status = ?, notes = ? WHERE id = ?')
      .run(company, role, status, notes, req.params.id);
    const updated = db.prepare('SELECT * FROM job_applications WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] PUT /api/applications/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/applications/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM job_applications WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Application not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DELETE /api/applications/:id error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
