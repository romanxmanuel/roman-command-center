// db/seed.js — Populates the database with 14 days of realistic fake data
// Run standalone: node db/seed.js (assumes tables already exist via migrate.js)
const db = require('./connection');

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

const today = daysAgo(0);
const tomorrow = daysFromNow(1);

// --- Clear all tables ---
console.log('[seed] Clearing existing data...');
db.exec(`
  DELETE FROM power_tasks;
  DELETE FROM tomorrow_plan;
  DELETE FROM sql_practice;
  DELETE FROM job_applications;
  DELETE FROM gym_log;
  DELETE FROM relationship_checkins;
`);

// =============================================
// 1. POWER TASKS — 3 tasks/day for 14 days
// =============================================
console.log('[seed] Inserting power tasks (14 days)...');

const dailyTasks = [
  // day 13 ago
  ['Complete SELECT/WHERE exercises', 'Set up project repo + package.json', 'Gym - Push day'],
  // day 12
  ['Practice INSERT/UPDATE/DELETE', 'Draft resume v2', 'Read 20 pages of SQL book'],
  // day 11
  ['INNER JOIN + LEFT JOIN drills', 'Apply to 3 backend roles', 'Gym - Pull day'],
  // day 10
  ['GROUP BY + HAVING exercises', 'Write cover letter template', 'Meal prep for the week'],
  // day 9
  ['Subquery practice (correlated)', 'Apply to 2 data analyst roles', 'Gym - Legs'],
  // day 8
  ['Window functions (ROW_NUMBER, RANK)', 'Follow up on DataCorp app', 'Evening walk + journal'],
  // day 7
  ['CTE deep dive + recursive CTEs', 'Update LinkedIn headline + summary', 'Gym - Push day'],
  // day 6
  ['Indexing strategies + EXPLAIN', 'Apply to Nexus Data + Bright Systems', 'Read 1 chapter System Design'],
  // day 5
  ['Multi-table JOIN practice', 'Prep answers for behavioral questions', 'Gym - Pull day'],
  // day 4
  ['Aggregate functions review', 'Send thank-you email to DataCorp', 'Cook a new healthy recipe'],
  // day 3
  ['CREATE TABLE + constraints drill', 'Apply to 2 more backend jobs', 'Gym - Legs'],
  // day 2
  ['Views + temp tables practice', 'Review portfolio project README', 'Evening run'],
  // day 1
  ['Transaction + rollback exercises', 'Finalize RCC job tracker feature', 'Gym - Push day'],
  // day 0 (today)
  ['Build dashboard charts for RCC', 'Follow up on all pending apps', 'Evening walk'],
];

const insertTask = db.prepare(
  'INSERT INTO power_tasks (task_date, title, slot, is_done) VALUES (?, ?, ?, ?)'
);

// Days 13-1 are all done (13-day streak). Today (day 0) is not done yet.
const insertTasks = db.transaction(() => {
  for (let daysBack = 13; daysBack >= 0; daysBack--) {
    const taskDate = daysAgo(daysBack);
    const titles = dailyTasks[13 - daysBack];
    const allDone = daysBack > 0 ? 1 : 0;
    titles.forEach((title, idx) => {
      insertTask.run(taskDate, title, idx + 1, allDone);
    });
  }
});
insertTasks();
console.log(`[seed]   → ${14 * 3} power tasks inserted (14 days x 3 slots)`);

// =============================================
// 2. TOMORROW'S PLAN — 6 items for tomorrow
// =============================================
console.log('[seed] Inserting tomorrow plan...');

const planItems = [
  { title: 'Morning SQL practice (CASE expressions)', done_when: '30 min focused, 5+ exercises completed' },
  { title: 'Apply to 2 backend engineer roles', done_when: 'Applications submitted with tailored cover letters' },
  { title: 'Gym - Pull day', done_when: 'All sets logged, progressive overload tracked' },
  { title: 'Build RCC analytics dashboard view', done_when: 'Chart.js rendering weekly trends' },
  { title: 'Read 1 chapter of Designing Data-Intensive Apps', done_when: 'Chapter finished, 3 key takeaways noted' },
  { title: 'Evening check-in + gratitude entry', done_when: 'Written and saved in RCC before 10pm' },
];

const insertPlan = db.prepare(
  'INSERT INTO tomorrow_plan (plan_date, slot, title, done_when) VALUES (?, ?, ?, ?)'
);

const insertPlans = db.transaction(() => {
  planItems.forEach((item, idx) => {
    insertPlan.run(tomorrow, idx + 1, item.title, item.done_when);
  });
});
insertPlans();
console.log(`[seed]   → ${planItems.length} plan items inserted for ${tomorrow}`);

// =============================================
// 3. SQL PRACTICE — sessions across 14 days
// =============================================
console.log('[seed] Inserting SQL practice sessions...');

const sqlSessions = [
  { daysBack: 13, topic: 'SELECT + WHERE + ORDER BY',    minutes: 35, notes: 'Filtering rows, comparison operators, LIKE patterns. Solid warmup.' },
  { daysBack: 12, topic: 'INSERT, UPDATE, DELETE',        minutes: 30, notes: 'CRUD basics. Practiced ON CONFLICT for upserts.' },
  { daysBack: 11, topic: 'INNER JOIN + LEFT JOIN',        minutes: 45, notes: 'Joined users→orders→products. LEFT JOIN shows NULLs for users with no orders.' },
  { daysBack: 10, topic: 'GROUP BY + HAVING',             minutes: 40, notes: 'COUNT, SUM, AVG per group. HAVING filters groups after aggregation.' },
  { daysBack: 9,  topic: 'Correlated Subqueries',         minutes: 45, notes: 'EXISTS vs IN performance. Correlated runs once per outer row — slower but flexible.' },
  { daysBack: 8,  topic: 'Window Functions',              minutes: 50, notes: 'ROW_NUMBER, RANK, DENSE_RANK. PARTITION BY department ORDER BY salary DESC.' },
  { daysBack: 7,  topic: 'CTEs (Common Table Expressions)', minutes: 40, notes: 'WITH clause for readability. Recursive CTE for org chart hierarchy.' },
  { daysBack: 6,  topic: 'Indexing + EXPLAIN QUERY PLAN', minutes: 35, notes: 'B-tree indexes. Covering indexes avoid table lookups. EXPLAIN shows scan vs seek.' },
  { daysBack: 5,  topic: 'Multi-table JOINs (3+ tables)', minutes: 50, notes: 'Joined users→orders→order_items→products. Practiced LEFT vs INNER on each hop.' },
  { daysBack: 4,  topic: 'Aggregate Functions Deep Dive',  minutes: 30, notes: 'GROUP_CONCAT, TOTAL vs SUM on floats, COUNT(DISTINCT col).' },
  { daysBack: 3,  topic: 'CREATE TABLE + Constraints',     minutes: 35, notes: 'CHECK constraints, DEFAULT values, UNIQUE combos, foreign key cascades.' },
  { daysBack: 2,  topic: 'Views + Temp Tables',            minutes: 40, notes: 'CREATE VIEW for reusable queries. Temp tables for multi-step transforms.' },
  { daysBack: 1,  topic: 'Transactions + ROLLBACK',        minutes: 35, notes: 'BEGIN/COMMIT/ROLLBACK. Savepoints for partial rollback. ACID guarantees.' },
  { daysBack: 0,  topic: 'CASE Expressions + Conditional Logic', minutes: 25, notes: 'CASE WHEN for computed columns. Used in SELECT and ORDER BY.' },
];

const insertSql = db.prepare(
  'INSERT INTO sql_practice (practice_date, topic, minutes, notes) VALUES (?, ?, ?, ?)'
);

const insertSqlSessions = db.transaction(() => {
  sqlSessions.forEach(s => {
    insertSql.run(daysAgo(s.daysBack), s.topic, s.minutes, s.notes);
  });
});
insertSqlSessions();
console.log(`[seed]   → ${sqlSessions.length} SQL practice sessions inserted`);

// =============================================
// 4. JOB APPLICATIONS — spread across 14 days
// =============================================
console.log('[seed] Inserting job applications...');

const applications = [
  { company: 'DataCorp',           role: 'Junior Data Engineer',       daysBack: 13, status: 'interviewing', notes: 'Phone screen went well. Technical round scheduled.' },
  { company: 'Acme Analytics',     role: 'Backend Developer',          daysBack: 12, status: 'screening',    notes: 'Recruiter responded. Take-home assignment incoming.' },
  { company: 'TechFlow Inc.',      role: 'SQL Developer',              daysBack: 11, status: 'rejected',     notes: 'Position filled internally. Recruiter said to reapply in 3 months.' },
  { company: 'CloudBase',          role: 'Junior Backend Engineer',    daysBack: 10, status: 'rejected',     notes: 'No response after 2 weeks. Marked as rejected.' },
  { company: 'Nexus Data',         role: 'Data Analyst',               daysBack: 8,  status: 'screening',    notes: 'HR phone screen next Tuesday.' },
  { company: 'Bright Systems',     role: 'Backend Engineer',           daysBack: 7,  status: 'interviewing', notes: 'Completed take-home. Live coding round next.' },
  { company: 'Horizon AI',         role: 'Junior Software Engineer',   daysBack: 6,  status: 'applied',      notes: 'Strong referral from network contact.' },
  { company: 'Pivot Analytics',    role: 'Data Engineer I',            daysBack: 5,  status: 'applied',      notes: 'Applied through company careers page.' },
  { company: 'GridPoint Tech',     role: 'Backend Developer (Node)',   daysBack: 4,  status: 'screening',    notes: 'Recruiter messaged on LinkedIn.' },
  { company: 'Slate Software',     role: 'Junior Full Stack Engineer', daysBack: 3,  status: 'applied',      notes: 'Found on Indeed. Express + SQL required — good fit.' },
  { company: 'Ember Data Co.',     role: 'SQL Analyst',                daysBack: 2,  status: 'applied',      notes: 'Applied via AngelList. Small startup, interesting product.' },
  { company: 'Corewave Systems',   role: 'Backend Engineer II',        daysBack: 1,  status: 'applied',      notes: 'Stretch role. Applied anyway — good practice.' },
];

const insertApp = db.prepare(
  'INSERT INTO job_applications (company, role, date_applied, status, notes) VALUES (?, ?, ?, ?, ?)'
);

const insertApps = db.transaction(() => {
  applications.forEach(a => {
    insertApp.run(a.company, a.role, daysAgo(a.daysBack), a.status, a.notes);
  });
});
insertApps();
console.log(`[seed]   → ${applications.length} job applications inserted`);

// =============================================
// 5. GYM LOG — Push/Pull/Legs rotation, ~10 sessions across 14 days
// =============================================
console.log('[seed] Inserting gym log...');

const workouts = [
  { daysBack: 13, type: 'Push (Chest/Shoulders/Triceps)', duration: 60, notes: 'Bench 135x8, OHP 85x8, Dips 3x12. Felt strong.' },
  { daysBack: 11, type: 'Pull (Back/Biceps)',              duration: 55, notes: 'Deadlift 185x5, Barbell rows 115x8, Chin-ups 3x8.' },
  { daysBack: 9,  type: 'Legs (Quads/Hams/Glutes)',        duration: 50, notes: 'Squats 155x8, Walking lunges 3x10, Leg press 3x12.' },
  { daysBack: 7,  type: 'Push (Chest/Shoulders/Triceps)',  duration: 65, notes: 'Incline DB press 50x10, Lateral raises 20x12, Skull crushers 40x10.' },
  { daysBack: 5,  type: 'Pull (Back/Biceps)',              duration: 55, notes: 'Pull-ups 4x6, Seated cable rows 3x12, Hammer curls 30x10.' },
  { daysBack: 4,  type: 'Cardio + Core',                   duration: 35, notes: '20 min incline walk, 15 min abs circuit. Active recovery.' },
  { daysBack: 3,  type: 'Legs (Quads/Hams/Glutes)',        duration: 55, notes: 'Front squats 115x8, RDLs 135x10, Calf raises 3x15.' },
  { daysBack: 1,  type: 'Push (Chest/Shoulders/Triceps)',  duration: 60, notes: 'Flat bench 140x6 (PR attempt), Arnold press 40x8, Tricep dips 3x10.' },
];

const insertGym = db.prepare(
  'INSERT INTO gym_log (log_date, workout_type, duration_minutes, notes) VALUES (?, ?, ?, ?)'
);

const insertGymEntries = db.transaction(() => {
  workouts.forEach(w => {
    insertGym.run(daysAgo(w.daysBack), w.type, w.duration, w.notes);
  });
});
insertGymEntries();
console.log(`[seed]   → ${workouts.length} gym sessions inserted`);

// =============================================
// 6. RELATIONSHIP CHECK-INS — morning + evening, most days
// =============================================
console.log('[seed] Inserting relationship check-ins...');

const checkins = [
  { daysBack: 13, time: 'morning', notes: 'Good morning text. Set intention to be present today.',                   gratitude: 'Grateful she believes in me.' },
  { daysBack: 13, time: 'evening', notes: 'Cooked dinner together. Talked about weekend plans.',                     gratitude: 'Grateful for shared meals.' },
  { daysBack: 12, time: 'morning', notes: 'Quick call before work. She had a tough day ahead — encouraged her.',     gratitude: 'Grateful I can be her support.' },
  { daysBack: 12, time: 'evening', notes: 'Watched a documentary together. Relaxed evening.',                        gratitude: 'Grateful for low-key quality time.' },
  { daysBack: 11, time: 'morning', notes: 'Sent a voice note. Small things matter.',                                 gratitude: 'Grateful for easy communication.' },
  { daysBack: 10, time: 'morning', notes: 'Morning walk together before I started work.',                            gratitude: 'Grateful for morning routines.' },
  { daysBack: 10, time: 'evening', notes: 'Planned a date for the weekend. Felt good to be intentional.',            gratitude: 'Grateful for forward planning together.' },
  { daysBack: 9,  time: 'morning', notes: 'Busy day ahead. Short but meaningful check-in.',                          gratitude: 'Grateful she understands my schedule.' },
  { daysBack: 9,  time: 'evening', notes: 'Talked about goals and 5-year vision. Aligned.',                          gratitude: 'Grateful we share ambition.' },
  { daysBack: 8,  time: 'morning', notes: 'Brought her coffee before she woke up.',                                  gratitude: 'Grateful for small acts of service.' },
  { daysBack: 7,  time: 'morning', notes: 'Weekend morning. Made breakfast together.',                               gratitude: 'Grateful for unhurried mornings.' },
  { daysBack: 7,  time: 'evening', notes: 'Date night — dinner out. No phones at the table.',                        gratitude: 'Grateful for intentional disconnection.' },
  { daysBack: 6,  time: 'morning', notes: 'Lazy Sunday. Read together in silence.',                                  gratitude: 'Grateful for comfortable silence.' },
  { daysBack: 6,  time: 'evening', notes: 'Prepped the week together. Meal planning + groceries.',                   gratitude: 'Grateful for teamwork.' },
  { daysBack: 5,  time: 'morning', notes: 'Sent a "thinking of you" text during deep work block.',                   gratitude: 'Grateful she respects my focus time.' },
  { daysBack: 5,  time: 'evening', notes: 'Quick debrief on the day. Both tired but connected.',                     gratitude: 'Grateful for end-of-day honesty.' },
  { daysBack: 4,  time: 'morning', notes: 'Morning gym together — first time in a while.',                           gratitude: 'Grateful for shared health goals.' },
  { daysBack: 4,  time: 'evening', notes: 'She helped me practice behavioral interview answers.',                    gratitude: 'Grateful she invests in my growth.' },
  { daysBack: 3,  time: 'morning', notes: 'Check-in over coffee. Talked about stress levels.',                       gratitude: 'Grateful for emotional openness.' },
  { daysBack: 3,  time: 'evening', notes: 'Went for an evening walk. Good for decompressing.',                       gratitude: 'Grateful for movement together.' },
  { daysBack: 2,  time: 'morning', notes: 'Wrote her a note and left it on the counter.',                            gratitude: 'Grateful for the power of written words.' },
  { daysBack: 2,  time: 'evening', notes: 'Movie night. Her pick — I actually enjoyed it.',                          gratitude: 'Grateful for compromise.' },
  { daysBack: 1,  time: 'morning', notes: 'Started the day aligned. Both feeling focused.',                          gratitude: 'Grateful for mutual discipline.' },
  { daysBack: 1,  time: 'evening', notes: 'Talked about this weekend and upcoming interview prep.',                  gratitude: 'Grateful for partnership in the grind.' },
  { daysBack: 0,  time: 'morning', notes: 'Morning coffee and planning. Set 3 intentions for the day.',             gratitude: 'Grateful for consistency.' },
];

const insertCheckin = db.prepare(
  'INSERT INTO relationship_checkins (checkin_date, time_of_day, notes, gratitude) VALUES (?, ?, ?, ?)'
);

const insertCheckins = db.transaction(() => {
  checkins.forEach(c => {
    insertCheckin.run(daysAgo(c.daysBack), c.time, c.notes, c.gratitude);
  });
});
insertCheckins();
console.log(`[seed]   → ${checkins.length} relationship check-ins inserted`);

// --- Summary ---
const counts = {
  power_tasks: db.prepare('SELECT COUNT(*) AS c FROM power_tasks').get().c,
  tomorrow_plan: db.prepare('SELECT COUNT(*) AS c FROM tomorrow_plan').get().c,
  sql_practice: db.prepare('SELECT COUNT(*) AS c FROM sql_practice').get().c,
  job_applications: db.prepare('SELECT COUNT(*) AS c FROM job_applications').get().c,
  gym_log: db.prepare('SELECT COUNT(*) AS c FROM gym_log').get().c,
  relationship_checkins: db.prepare('SELECT COUNT(*) AS c FROM relationship_checkins').get().c,
};

console.log('[seed] === Summary ===');
Object.entries(counts).forEach(([table, count]) => {
  console.log(`[seed]   ${table}: ${count} rows`);
});
console.log('[seed] Done.');
