// routes/admin.js — Admin utilities (DB reset with re-seed)
// Protected by confirmation header to prevent accidental calls
const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// POST /api/admin/reset
// Truncates all tables and re-inserts 14 days of seed data.
// Requires header: X-Confirm: RESET
router.post('/reset', (req, res) => {
  try {
    if (req.headers['x-confirm'] !== 'RESET') {
      return res.status(400).json({ error: 'Missing confirmation header: X-Confirm: RESET' });
    }

    // --- Helpers ---
    function daysAgo(n) {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d.toLocaleDateString('en-CA');
    }
    function daysFromNow(n) {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return d.toLocaleDateString('en-CA');
    }

    const tomorrow = daysFromNow(1);

    const resetAll = db.transaction(() => {
      // Clear all tables
      db.exec(`
        DELETE FROM power_tasks;
        DELETE FROM tomorrow_plan;
        DELETE FROM sql_practice;
        DELETE FROM job_applications;
        DELETE FROM gym_log;
        DELETE FROM relationship_checkins;
      `);

      // 1. Power tasks (14 days x 3 slots)
      const dailyTasks = [
        ['Complete SELECT/WHERE exercises', 'Set up project repo + package.json', 'Gym - Push day'],
        ['Practice INSERT/UPDATE/DELETE', 'Draft resume v2', 'Read 20 pages of SQL book'],
        ['INNER JOIN + LEFT JOIN drills', 'Apply to 3 backend roles', 'Gym - Pull day'],
        ['GROUP BY + HAVING exercises', 'Write cover letter template', 'Meal prep for the week'],
        ['Subquery practice (correlated)', 'Apply to 2 data analyst roles', 'Gym - Legs'],
        ['Window functions (ROW_NUMBER, RANK)', 'Follow up on DataCorp app', 'Evening walk + journal'],
        ['CTE deep dive + recursive CTEs', 'Update LinkedIn headline + summary', 'Gym - Push day'],
        ['Indexing strategies + EXPLAIN', 'Apply to Nexus Data + Bright Systems', 'Read 1 chapter System Design'],
        ['Multi-table JOIN practice', 'Prep answers for behavioral questions', 'Gym - Pull day'],
        ['Aggregate functions review', 'Send thank-you email to DataCorp', 'Cook a new healthy recipe'],
        ['CREATE TABLE + constraints drill', 'Apply to 2 more backend jobs', 'Gym - Legs'],
        ['Views + temp tables practice', 'Review portfolio project README', 'Evening run'],
        ['Transaction + rollback exercises', 'Finalize RCC job tracker feature', 'Gym - Push day'],
        ['Build dashboard charts for RCC', 'Follow up on all pending apps', 'Evening walk'],
      ];
      const insertTask = db.prepare('INSERT INTO power_tasks (task_date, title, slot, is_done) VALUES (?, ?, ?, ?)');
      for (let daysBack = 13; daysBack >= 0; daysBack--) {
        const titles = dailyTasks[13 - daysBack];
        const allDone = daysBack > 0 ? 1 : 0;
        titles.forEach((title, idx) => insertTask.run(daysAgo(daysBack), title, idx + 1, allDone));
      }

      // 2. Tomorrow's plan (6 items)
      const planItems = [
        { title: 'Morning SQL practice (CASE expressions)', done_when: '30 min focused, 5+ exercises completed' },
        { title: 'Apply to 2 backend engineer roles', done_when: 'Applications submitted with tailored cover letters' },
        { title: 'Gym - Pull day', done_when: 'All sets logged, progressive overload tracked' },
        { title: 'Build RCC analytics dashboard view', done_when: 'Chart.js rendering weekly trends' },
        { title: 'Read 1 chapter of Designing Data-Intensive Apps', done_when: 'Chapter finished, 3 key takeaways noted' },
        { title: 'Evening check-in + gratitude entry', done_when: 'Written and saved in RCC before 10pm' },
      ];
      const insertPlan = db.prepare('INSERT INTO tomorrow_plan (plan_date, slot, title, done_when) VALUES (?, ?, ?, ?)');
      planItems.forEach((item, idx) => insertPlan.run(tomorrow, idx + 1, item.title, item.done_when));

      // 3. SQL practice (14 sessions)
      const sqlSessions = [
        { daysBack: 13, topic: 'SELECT + WHERE + ORDER BY', minutes: 35 },
        { daysBack: 12, topic: 'INSERT, UPDATE, DELETE', minutes: 30 },
        { daysBack: 11, topic: 'INNER JOIN + LEFT JOIN', minutes: 45 },
        { daysBack: 10, topic: 'GROUP BY + HAVING', minutes: 40 },
        { daysBack: 9, topic: 'Correlated Subqueries', minutes: 45 },
        { daysBack: 8, topic: 'Window Functions', minutes: 50 },
        { daysBack: 7, topic: 'CTEs (Common Table Expressions)', minutes: 40 },
        { daysBack: 6, topic: 'Indexing + EXPLAIN QUERY PLAN', minutes: 35 },
        { daysBack: 5, topic: 'Multi-table JOINs (3+ tables)', minutes: 50 },
        { daysBack: 4, topic: 'Aggregate Functions Deep Dive', minutes: 30 },
        { daysBack: 3, topic: 'CREATE TABLE + Constraints', minutes: 35 },
        { daysBack: 2, topic: 'Views + Temp Tables', minutes: 40 },
        { daysBack: 1, topic: 'Transactions + ROLLBACK', minutes: 35 },
        { daysBack: 0, topic: 'CASE Expressions + Conditional Logic', minutes: 25 },
      ];
      const insertSql = db.prepare('INSERT INTO sql_practice (practice_date, topic, minutes, notes) VALUES (?, ?, ?, ?)');
      sqlSessions.forEach(s => insertSql.run(daysAgo(s.daysBack), s.topic, s.minutes, ''));

      // 4. Job applications (12)
      const applications = [
        { company: 'DataCorp', role: 'Junior Data Engineer', daysBack: 13, status: 'interviewing' },
        { company: 'Acme Analytics', role: 'Backend Developer', daysBack: 12, status: 'screening' },
        { company: 'TechFlow Inc.', role: 'SQL Developer', daysBack: 11, status: 'rejected' },
        { company: 'CloudBase', role: 'Junior Backend Engineer', daysBack: 10, status: 'rejected' },
        { company: 'Nexus Data', role: 'Data Analyst', daysBack: 8, status: 'screening' },
        { company: 'Bright Systems', role: 'Backend Engineer', daysBack: 7, status: 'interviewing' },
        { company: 'Horizon AI', role: 'Junior Software Engineer', daysBack: 6, status: 'applied' },
        { company: 'Pivot Analytics', role: 'Data Engineer I', daysBack: 5, status: 'applied' },
        { company: 'GridPoint Tech', role: 'Backend Developer (Node)', daysBack: 4, status: 'screening' },
        { company: 'Slate Software', role: 'Junior Full Stack Engineer', daysBack: 3, status: 'applied' },
        { company: 'Ember Data Co.', role: 'SQL Analyst', daysBack: 2, status: 'applied' },
        { company: 'Corewave Systems', role: 'Backend Engineer II', daysBack: 1, status: 'applied' },
      ];
      const insertApp = db.prepare('INSERT INTO job_applications (company, role, date_applied, status, notes) VALUES (?, ?, ?, ?, ?)');
      applications.forEach(a => insertApp.run(a.company, a.role, daysAgo(a.daysBack), a.status, ''));

      // 5. Gym log (8 sessions)
      const workouts = [
        { daysBack: 13, type: 'Push (Chest/Shoulders/Triceps)', duration: 60 },
        { daysBack: 11, type: 'Pull (Back/Biceps)', duration: 55 },
        { daysBack: 9, type: 'Legs (Quads/Hams/Glutes)', duration: 50 },
        { daysBack: 7, type: 'Push (Chest/Shoulders/Triceps)', duration: 65 },
        { daysBack: 5, type: 'Pull (Back/Biceps)', duration: 55 },
        { daysBack: 4, type: 'Cardio + Core', duration: 35 },
        { daysBack: 3, type: 'Legs (Quads/Hams/Glutes)', duration: 55 },
        { daysBack: 1, type: 'Push (Chest/Shoulders/Triceps)', duration: 60 },
      ];
      const insertGym = db.prepare('INSERT INTO gym_log (log_date, workout_type, duration_minutes, notes) VALUES (?, ?, ?, ?)');
      workouts.forEach(w => insertGym.run(daysAgo(w.daysBack), w.type, w.duration, ''));

      // 6. Relationship check-ins (25)
      const checkins = [
        { daysBack: 13, time: 'morning', notes: 'Good morning text. Set intention to be present today.', gratitude: 'Grateful she believes in me.' },
        { daysBack: 13, time: 'evening', notes: 'Cooked dinner together. Talked about weekend plans.', gratitude: 'Grateful for shared meals.' },
        { daysBack: 12, time: 'morning', notes: 'Quick call before work.', gratitude: 'Grateful I can be her support.' },
        { daysBack: 12, time: 'evening', notes: 'Watched a documentary together.', gratitude: 'Grateful for low-key quality time.' },
        { daysBack: 11, time: 'morning', notes: 'Sent a voice note. Small things matter.', gratitude: 'Grateful for easy communication.' },
        { daysBack: 10, time: 'morning', notes: 'Morning walk together before work.', gratitude: 'Grateful for morning routines.' },
        { daysBack: 10, time: 'evening', notes: 'Planned a date for the weekend.', gratitude: 'Grateful for forward planning together.' },
        { daysBack: 9, time: 'morning', notes: 'Busy day ahead. Short but meaningful.', gratitude: 'Grateful she understands my schedule.' },
        { daysBack: 9, time: 'evening', notes: 'Talked about goals and 5-year vision.', gratitude: 'Grateful we share ambition.' },
        { daysBack: 8, time: 'morning', notes: 'Brought her coffee before she woke up.', gratitude: 'Grateful for small acts of service.' },
        { daysBack: 7, time: 'morning', notes: 'Weekend morning. Made breakfast together.', gratitude: 'Grateful for unhurried mornings.' },
        { daysBack: 7, time: 'evening', notes: 'Date night. No phones at the table.', gratitude: 'Grateful for intentional disconnection.' },
        { daysBack: 6, time: 'morning', notes: 'Lazy Sunday. Read together in silence.', gratitude: 'Grateful for comfortable silence.' },
        { daysBack: 6, time: 'evening', notes: 'Prepped the week together.', gratitude: 'Grateful for teamwork.' },
        { daysBack: 5, time: 'morning', notes: 'Sent a thinking of you text.', gratitude: 'Grateful she respects my focus time.' },
        { daysBack: 5, time: 'evening', notes: 'Quick debrief on the day. Both tired but connected.', gratitude: 'Grateful for end-of-day honesty.' },
        { daysBack: 4, time: 'morning', notes: 'Morning gym together.', gratitude: 'Grateful for shared health goals.' },
        { daysBack: 4, time: 'evening', notes: 'She helped me practice interview answers.', gratitude: 'Grateful she invests in my growth.' },
        { daysBack: 3, time: 'morning', notes: 'Check-in over coffee.', gratitude: 'Grateful for emotional openness.' },
        { daysBack: 3, time: 'evening', notes: 'Went for an evening walk.', gratitude: 'Grateful for movement together.' },
        { daysBack: 2, time: 'morning', notes: 'Wrote her a note on the counter.', gratitude: 'Grateful for the power of written words.' },
        { daysBack: 2, time: 'evening', notes: 'Movie night. Her pick.', gratitude: 'Grateful for compromise.' },
        { daysBack: 1, time: 'morning', notes: 'Started the day aligned.', gratitude: 'Grateful for mutual discipline.' },
        { daysBack: 1, time: 'evening', notes: 'Talked about upcoming interview prep.', gratitude: 'Grateful for partnership in the grind.' },
        { daysBack: 0, time: 'morning', notes: 'Morning coffee and planning.', gratitude: 'Grateful for consistency.' },
      ];
      const insertCheckin = db.prepare('INSERT INTO relationship_checkins (checkin_date, time_of_day, notes, gratitude) VALUES (?, ?, ?, ?)');
      checkins.forEach(c => insertCheckin.run(daysAgo(c.daysBack), c.time, c.notes, c.gratitude));
    });

    resetAll();

    const counts = {
      power_tasks: db.prepare('SELECT COUNT(*) AS c FROM power_tasks').get().c,
      tomorrow_plan: db.prepare('SELECT COUNT(*) AS c FROM tomorrow_plan').get().c,
      sql_practice: db.prepare('SELECT COUNT(*) AS c FROM sql_practice').get().c,
      job_applications: db.prepare('SELECT COUNT(*) AS c FROM job_applications').get().c,
      gym_log: db.prepare('SELECT COUNT(*) AS c FROM gym_log').get().c,
      relationship_checkins: db.prepare('SELECT COUNT(*) AS c FROM relationship_checkins').get().c,
    };

    console.log(`[${new Date().toISOString()}] Database reset via admin endpoint`);
    res.json({ message: 'Database reset complete', counts });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/admin/reset error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
