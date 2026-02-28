// server.js — Express entry point for Roman Command Center
const express = require('express');
const path = require('path');

// Ensure tables exist on startup (idempotent — uses CREATE TABLE IF NOT EXISTS)
require('./db/migrate');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/plan', require('./routes/plan'));
app.use('/api/sql-practice', require('./routes/sql_practice'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/gym', require('./routes/gym'));
app.use('/api/relationships', require('./routes/relationships'));
app.use('/api/admin', require('./routes/admin'));

// --- Fallback: serve index.html for SPA routing ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Roman Command Center online at http://localhost:${PORT}`);
});
