// app.js — Roman Command Center frontend
// SPA router, 7 modules, Chart.js dashboards, toast notifications, inline editing,
// keyboard shortcuts, confirmation modal, streak widget, weekly summary

// ========== UTILITY ==========
function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('en-CA');
}

function last14Days() {
  const dates = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-CA'));
  }
  return dates;
}

function last7Days() {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-CA'));
  }
  return dates;
}

async function api(path, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers);
  const res = await fetch('/api' + path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function shortDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
}

// ========== TOAST NOTIFICATIONS ==========
function toast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-exit');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ========== EMPTY STATE HELPER ==========
function emptyState(message, hint) {
  const hintHtml = hint ? '<div class="empty-state-hint">' + escapeHtml(hint) + '</div>' : '';
  return '<div class="empty-state">' +
    '<div class="empty-state-icon">--</div>' +
    escapeHtml(message) + hintHtml +
    '</div>';
}

// ========== CONFIRMATION MODAL ==========
let modalResolve = null;

function showModal(title, body) {
  return new Promise((resolve) => {
    modalResolve = resolve;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').textContent = body;
    document.getElementById('modal-overlay').classList.remove('hidden');
  });
}

function initModal() {
  document.getElementById('modal-confirm').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.add('hidden');
    if (modalResolve) modalResolve(true);
    modalResolve = null;
  });
  document.getElementById('modal-cancel').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.add('hidden');
    if (modalResolve) modalResolve(false);
    modalResolve = null;
  });
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('modal-overlay').classList.add('hidden');
      if (modalResolve) modalResolve(false);
      modalResolve = null;
    }
  });
}

// ========== TOPBAR ==========
function initTopbar() {
  document.getElementById('topbar-date').textContent = formatDate(todayStr());

  document.getElementById('btn-reset-db').addEventListener('click', async () => {
    const confirmed = await showModal(
      'Reset Database',
      'This will delete ALL data and re-seed with 14 days of sample data. This cannot be undone.'
    );
    if (!confirmed) return;
    try {
      const btn = document.getElementById('btn-reset-db');
      btn.disabled = true;
      btn.textContent = 'Resetting...';
      await api('/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Confirm': 'RESET' },
      });
      toast('Database reset complete', 'success');
      loadSection(currentSection());
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      const btn = document.getElementById('btn-reset-db');
      btn.disabled = false;
      btn.textContent = 'Reset DB';
    }
  });
}

// ========== CLOCK ==========
function startClock() {
  const clockEl = document.getElementById('clock');
  function tick() {
    clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
  }
  tick();
  setInterval(tick, 1000);
}

// ========== KEYBOARD SHORTCUTS ==========
function initKeyboardShortcuts() {
  let gPressed = false;
  let gTimeout = null;

  const keyMap = {
    d: 'dashboard',
    p: 'tasks',
    t: 'plan',
    s: 'sql',
    j: 'applications',
    g: 'gym',
    r: 'relationships',
  };

  document.addEventListener('keydown', (e) => {
    // Ignore when typing in inputs, textareas, selects
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    // Ignore if modal is open
    if (!document.getElementById('modal-overlay').classList.contains('hidden')) return;

    const key = e.key.toLowerCase();

    if (gPressed) {
      gPressed = false;
      clearTimeout(gTimeout);
      const section = keyMap[key];
      if (section) {
        e.preventDefault();
        window.location.hash = section;
      }
      return;
    }

    if (key === 'g') {
      gPressed = true;
      gTimeout = setTimeout(() => { gPressed = false; }, 600);
    }
  });
}

// ========== ANIMATED GRID BACKGROUND ==========
function initGrid() {
  const canvas = document.getElementById('gridCanvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let offset = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const spacing = 50;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    const shiftedOffset = offset % spacing;
    for (let y = -spacing + shiftedOffset; y < canvas.height + spacing; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    offset += 0.3;
    requestAnimationFrame(draw);
  }
  draw();
}

// ========== SPA ROUTER ==========
function currentSection() {
  return window.location.hash.replace('#', '') || 'dashboard';
}

function initRouter() {
  const links = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');

  function navigate(sectionName) {
    sections.forEach(s => s.classList.remove('active'));
    links.forEach(l => l.classList.remove('active'));
    const target = document.getElementById('section-' + sectionName);
    const link = document.querySelector('[data-section="' + sectionName + '"]');
    if (target) target.classList.add('active');
    if (link) link.classList.add('active');
    loadSection(sectionName);
  }

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      window.location.hash = section;
      navigate(section);
    });
  });

  function onHashChange() {
    const hash = currentSection();
    navigate(hash);
  }

  window.addEventListener('hashchange', onHashChange);
  onHashChange();
}

function loadSection(name) {
  const loaders = {
    dashboard: loadDashboard, tasks: loadTasks, plan: loadPlan,
    sql: loadSql, applications: loadApplications, gym: loadGym,
    relationships: loadRelationships,
  };
  if (loaders[name]) loaders[name]();
}

// ========== DASHBOARD ==========
let sqlChart = null;
let appsChart = null;
let gymChart = null;
let tasksChart = null;

async function loadDashboard() {
  try {
    const [tasks, streak, sqlStats, appsStats, gymStats, checkins] = await Promise.all([
      api('/tasks?date=' + todayStr()),
      api('/tasks/streak'),
      api('/sql-practice/stats'),
      api('/applications/stats'),
      api('/gym/stats'),
      api('/relationships/today'),
    ]);

    document.getElementById('dash-tasks-done').textContent = tasks.filter(t => t.is_done).length + '/3';
    document.getElementById('dash-streak').textContent = streak.streak;
    document.getElementById('dash-sql-minutes').textContent = sqlStats.total_minutes;
    document.getElementById('dash-apps-total').textContent = appsStats.total;
    document.getElementById('dash-gym-total').textContent = gymStats.total_workouts;
    document.getElementById('dash-checkins').textContent = checkins.length + '/2';

    renderWeeklySummary();
    renderSqlChart();
    renderAppsChart(appsStats);
    renderGymChart();
    renderTasksChart();
  } catch (err) {
    console.error('Dashboard load error:', err);
    toast('Failed to load dashboard', 'error');
  }
}

// ========== WEEKLY SUMMARY WIDGET ==========
async function renderWeeklySummary() {
  const gridEl = document.getElementById('weekly-grid');
  try {
    const dates = last7Days();
    const [taskResults, sqlSessions, gymEntries, checkins] = await Promise.all([
      Promise.all(dates.map(d => api('/tasks?date=' + d))),
      api('/sql-practice?limit=60'),
      api('/gym?limit=60'),
      api('/relationships?limit=60'),
    ]);

    // Tasks completed this week
    let tasksDone = 0;
    let tasksTotal = 0;
    taskResults.forEach(dayTasks => {
      tasksTotal += dayTasks.length;
      tasksDone += dayTasks.filter(t => t.is_done).length;
    });

    // SQL minutes this week
    let sqlMinutes = 0;
    sqlSessions.forEach(s => {
      if (dates.includes(s.practice_date)) sqlMinutes += s.minutes;
    });

    // Gym minutes this week
    let gymMinutes = 0;
    gymEntries.forEach(g => {
      if (dates.includes(g.log_date)) gymMinutes += g.duration_minutes;
    });

    // Check-ins this week
    let checkinCount = 0;
    checkins.forEach(c => {
      if (dates.includes(c.checkin_date)) checkinCount++;
    });

    gridEl.innerHTML = [
      { value: tasksDone + '/' + tasksTotal, label: 'Tasks Done' },
      { value: sqlMinutes + ' min', label: 'SQL Practice' },
      { value: gymMinutes + ' min', label: 'Gym Time' },
      { value: checkinCount, label: 'Check-ins' },
    ].map(s =>
      '<div class="weekly-stat">' +
        '<div class="weekly-stat-value">' + escapeHtml(String(s.value)) + '</div>' +
        '<div class="weekly-stat-label">' + escapeHtml(s.label) + '</div>' +
      '</div>'
    ).join('');
  } catch (err) {
    gridEl.innerHTML = emptyState('Could not load weekly summary');
  }
}

// ========== CHARTS ==========
function makeBarOptions(gridColor) {
  return {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { color: '#7a8a9e' }, grid: { color: gridColor + '11' } },
      x: { ticks: { color: '#7a8a9e' }, grid: { display: false } },
    },
  };
}

async function renderSqlChart() {
  const sessions = await api('/sql-practice?limit=60');
  const dates = last14Days();
  const byDate = {};
  dates.forEach(d => byDate[d] = 0);
  sessions.forEach(s => { if (byDate[s.practice_date] !== undefined) byDate[s.practice_date] += s.minutes; });

  const ctx = document.getElementById('chart-sql').getContext('2d');
  if (sqlChart) sqlChart.destroy();
  sqlChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dates.map(d => d.slice(5)),
      datasets: [{
        label: 'Minutes',
        data: dates.map(d => byDate[d]),
        backgroundColor: 'rgba(0, 255, 255, 0.3)',
        borderColor: 'rgba(0, 255, 255, 0.8)',
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: makeBarOptions('rgba(0, 255, 255)'),
  });
}

async function renderAppsChart(stats) {
  const ctx = document.getElementById('chart-apps').getContext('2d');
  if (appsChart) appsChart.destroy();
  const statusColors = {
    applied: '#00ffff', screening: '#ffee00', interviewing: '#ff00ff',
    offer: '#00ff88', rejected: '#ff3366', accepted: '#00ff88',
  };
  const labels = stats.by_status.map(s => s.status);
  const data = stats.by_status.map(s => s.count);
  const colors = labels.map(l => statusColors[l] || '#7a8a9e');

  appsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors.map(c => c + '44'), borderColor: colors, borderWidth: 2 }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: '#7a8a9e', padding: 12, font: { size: 11 } } } },
    },
  });
}

async function renderGymChart() {
  const entries = await api('/gym?limit=60');
  const dates = last14Days();
  const byDate = {};
  dates.forEach(d => byDate[d] = 0);
  entries.forEach(g => { if (byDate[g.log_date] !== undefined) byDate[g.log_date] += g.duration_minutes; });

  const ctx = document.getElementById('chart-gym').getContext('2d');
  if (gymChart) gymChart.destroy();
  gymChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dates.map(d => d.slice(5)),
      datasets: [{
        label: 'Minutes',
        data: dates.map(d => byDate[d]),
        backgroundColor: 'rgba(255, 0, 255, 0.25)',
        borderColor: 'rgba(255, 0, 255, 0.7)',
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: makeBarOptions('rgba(255, 0, 255)'),
  });
}

async function renderTasksChart() {
  const dates = last14Days();
  const results = await Promise.all(dates.map(d => api('/tasks?date=' + d)));
  const rates = results.map(tasks => {
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter(t => t.is_done).length / tasks.length) * 100);
  });

  const ctx = document.getElementById('chart-tasks').getContext('2d');
  if (tasksChart) tasksChart.destroy();
  tasksChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates.map(d => d.slice(5)),
      datasets: [{
        label: '% Done',
        data: rates,
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#00ff88',
        pointRadius: 3,
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true, max: 100,
          ticks: { color: '#7a8a9e', callback: v => v + '%' },
          grid: { color: 'rgba(0, 255, 136, 0.06)' },
        },
        x: { ticks: { color: '#7a8a9e' }, grid: { display: false } },
      },
    },
  });
}

// ========== POWER TASKS ==========
function getTasksDate() {
  return document.getElementById('tasks-date').value || todayStr();
}

async function loadTasks() {
  const dateInput = document.getElementById('tasks-date');
  if (!dateInput.value) dateInput.value = todayStr();

  const listEl = document.getElementById('tasks-list');
  listEl.innerHTML = '<div class="spinner"></div>';

  try {
    const [tasks, streak] = await Promise.all([
      api('/tasks?date=' + getTasksDate()),
      api('/tasks/streak'),
    ]);

    document.getElementById('tasks-streak').textContent = streak.streak;

    if (tasks.length === 0) {
      listEl.innerHTML = emptyState('No tasks for this date', 'Add up to 3 power tasks using the form below');
    } else {
      listEl.innerHTML = tasks.map(t =>
        '<div class="task-item ' + (t.is_done ? 'done' : '') + '">' +
          '<span class="task-slot">#' + t.slot + '</span>' +
          '<button class="task-toggle ' + (t.is_done ? 'checked' : '') + '" data-id="' + t.id + '">' +
            (t.is_done ? '&#10003;' : '') +
          '</button>' +
          '<span class="task-title">' + escapeHtml(t.title) + '</span>' +
          '<button class="task-delete" data-id="' + t.id + '">&times;</button>' +
        '</div>'
      ).join('');
    }

    renderStreakCalendar();
  } catch (err) {
    listEl.innerHTML = emptyState('Failed to load tasks');
    toast(err.message, 'error');
  }
}

// ========== STREAK CALENDAR WIDGET ==========
async function renderStreakCalendar() {
  const calEl = document.getElementById('streak-calendar');
  try {
    const dates = last14Days();
    const today = todayStr();
    const results = await Promise.all(dates.map(d => api('/tasks?date=' + d)));

    calEl.innerHTML = dates.map((date, i) => {
      const tasks = results[i];
      const total = tasks.length;
      const done = tasks.filter(t => t.is_done).length;
      let cls = 'streak-day';
      if (total === 0) cls += ' empty';
      else if (done === total) cls += ' complete';
      else if (done > 0) cls += ' partial';
      else cls += ' empty';
      if (date === today) cls += ' today';
      return '<div class="' + cls + '" title="' + escapeHtml(date) + ': ' + done + '/' + total + '">' +
        escapeHtml(shortDay(date)) +
      '</div>';
    }).join('');
  } catch (err) {
    calEl.innerHTML = '';
  }
}

function initTasks() {
  document.getElementById('tasks-date').addEventListener('change', loadTasks);

  document.getElementById('tasks-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const slot = parseInt(document.getElementById('tasks-slot').value);
    const title = document.getElementById('tasks-title').value.trim();
    if (!slot || !title) return;
    try {
      await api('/tasks', { method: 'POST', body: { title, slot, task_date: getTasksDate() } });
      document.getElementById('tasks-title').value = '';
      document.getElementById('tasks-slot').value = '';
      toast('Task added', 'success');
      loadTasks();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('tasks-list').addEventListener('click', async (e) => {
    const toggleBtn = e.target.closest('.task-toggle');
    const deleteBtn = e.target.closest('.task-delete');

    if (toggleBtn) {
      try {
        await api('/tasks/' + toggleBtn.dataset.id, { method: 'PATCH' });
        loadTasks();
      } catch (err) { toast(err.message, 'error'); }
    }

    if (deleteBtn) {
      try {
        await api('/tasks/' + deleteBtn.dataset.id, { method: 'DELETE' });
        toast('Task deleted', 'success');
        loadTasks();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

// ========== TOMORROW'S PLAN ==========
function getPlanDate() {
  return document.getElementById('plan-date').value || tomorrowStr();
}

async function loadPlan() {
  const dateInput = document.getElementById('plan-date');
  if (!dateInput.value) dateInput.value = tomorrowStr();

  const listEl = document.getElementById('plan-list');
  listEl.innerHTML = '<div class="spinner"></div>';

  try {
    const items = await api('/plan?date=' + getPlanDate());

    if (items.length === 0) {
      listEl.innerHTML = emptyState('No plan items yet', 'Add up to 6 items for this date');
    } else {
      listEl.innerHTML = items.map(item =>
        '<div class="task-item ' + (item.is_done ? 'done' : '') + '">' +
          '<span class="task-slot">#' + item.slot + '</span>' +
          '<button class="task-toggle ' + (item.is_done ? 'checked' : '') + '" data-id="' + item.id + '">' +
            (item.is_done ? '&#10003;' : '') +
          '</button>' +
          '<div style="flex:1">' +
            '<span class="task-title">' + escapeHtml(item.title) + '</span>' +
            (item.done_when ? '<div class="task-done-when">Done when: ' + escapeHtml(item.done_when) + '</div>' : '') +
          '</div>' +
          '<button class="task-delete" data-id="' + item.id + '">&times;</button>' +
        '</div>'
      ).join('');
    }
  } catch (err) {
    listEl.innerHTML = emptyState('Failed to load plan');
    toast(err.message, 'error');
  }
}

function initPlan() {
  document.getElementById('plan-date').addEventListener('change', loadPlan);

  document.getElementById('plan-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const slot = parseInt(document.getElementById('plan-slot').value);
    const title = document.getElementById('plan-title').value.trim();
    const doneWhen = document.getElementById('plan-done-when').value.trim();
    if (!slot || !title) return;
    try {
      await api('/plan', { method: 'POST', body: { title, slot, done_when: doneWhen, plan_date: getPlanDate() } });
      document.getElementById('plan-title').value = '';
      document.getElementById('plan-done-when').value = '';
      document.getElementById('plan-slot').value = '';
      toast('Plan item added', 'success');
      loadPlan();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('plan-list').addEventListener('click', async (e) => {
    const toggleBtn = e.target.closest('.task-toggle');
    const deleteBtn = e.target.closest('.task-delete');

    if (toggleBtn) {
      try {
        const isDone = toggleBtn.classList.contains('checked') ? 0 : 1;
        await api('/plan/' + toggleBtn.dataset.id, { method: 'PATCH', body: { is_done: isDone } });
        loadPlan();
      } catch (err) { toast(err.message, 'error'); }
    }

    if (deleteBtn) {
      try {
        await api('/plan/' + deleteBtn.dataset.id, { method: 'DELETE' });
        toast('Plan item deleted', 'success');
        loadPlan();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

// ========== SQL PRACTICE (with edit) ==========
let sqlItems = [];
let sqlEditingId = null;

async function loadSql() {
  const listEl = document.getElementById('sql-list');
  listEl.innerHTML = '<div class="spinner"></div>';

  try {
    sqlItems = await api('/sql-practice?limit=20');
    if (sqlItems.length === 0) {
      listEl.innerHTML = emptyState('No practice sessions logged yet', 'Log your first SQL session above');
      return;
    }
    listEl.innerHTML = sqlItems.map(s =>
      '<div class="log-item">' +
        '<div class="log-item-main">' +
          '<div class="log-item-title">' + escapeHtml(s.topic) + '</div>' +
          '<div class="log-item-meta">' + escapeHtml(s.practice_date) + ' &middot; ' + s.minutes + ' min</div>' +
          (s.notes ? '<div class="log-item-notes">' + escapeHtml(s.notes) + '</div>' : '') +
        '</div>' +
        '<div class="log-item-actions">' +
          '<button class="btn-edit" data-id="' + s.id + '">&#9998;</button>' +
          '<button class="task-delete" data-id="' + s.id + '">&times;</button>' +
        '</div>' +
      '</div>'
    ).join('');
  } catch (err) {
    listEl.innerHTML = emptyState('Failed to load sessions');
    toast(err.message, 'error');
  }
}

function resetSqlForm() {
  sqlEditingId = null;
  document.getElementById('sql-form').reset();
  document.getElementById('sql-submit').textContent = 'Log Session';
  document.getElementById('sql-cancel').style.display = 'none';
}

function initSql() {
  document.getElementById('sql-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const topic = document.getElementById('sql-topic').value.trim();
    const minutes = parseInt(document.getElementById('sql-minutes').value);
    const notes = document.getElementById('sql-notes').value.trim();
    if (!topic || isNaN(minutes)) return;
    try {
      if (sqlEditingId) {
        await api('/sql-practice/' + sqlEditingId, { method: 'PUT', body: { topic, minutes, notes } });
        toast('Session updated', 'success');
      } else {
        await api('/sql-practice', { method: 'POST', body: { topic, minutes, notes } });
        toast('Session logged', 'success');
      }
      resetSqlForm();
      loadSql();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('sql-cancel').addEventListener('click', resetSqlForm);

  document.getElementById('sql-list').addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.task-delete');

    if (editBtn) {
      const item = sqlItems.find(i => i.id == editBtn.dataset.id);
      if (!item) return;
      document.getElementById('sql-topic').value = item.topic;
      document.getElementById('sql-minutes').value = item.minutes;
      document.getElementById('sql-notes').value = item.notes || '';
      sqlEditingId = item.id;
      document.getElementById('sql-submit').textContent = 'Update';
      document.getElementById('sql-cancel').style.display = '';
      document.getElementById('sql-form').scrollIntoView({ behavior: 'smooth' });
    }

    if (deleteBtn) {
      try {
        await api('/sql-practice/' + deleteBtn.dataset.id, { method: 'DELETE' });
        toast('Session deleted', 'success');
        if (sqlEditingId == deleteBtn.dataset.id) resetSqlForm();
        loadSql();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

// ========== JOB APPLICATIONS (with edit + filter) ==========
let appsItems = [];
let appsEditingId = null;

async function loadApplications() {
  const listEl = document.getElementById('apps-list');
  listEl.innerHTML = '<div class="spinner"></div>';

  try {
    const filter = document.getElementById('apps-filter').value;
    const query = filter ? '?status=' + encodeURIComponent(filter) : '';
    appsItems = await api('/applications' + query);
    if (appsItems.length === 0) {
      listEl.innerHTML = emptyState(
        filter ? 'No applications match this filter' : 'No applications yet',
        filter ? 'Try a different status filter' : 'Add your first application above'
      );
      return;
    }
    listEl.innerHTML = appsItems.map(a =>
      '<div class="log-item">' +
        '<div class="log-item-main">' +
          '<div class="log-item-title">' + escapeHtml(a.company) + ' &mdash; ' + escapeHtml(a.role) + '</div>' +
          '<div class="log-item-meta">Applied: ' + escapeHtml(a.date_applied) + '</div>' +
          (a.notes ? '<div class="log-item-notes">' + escapeHtml(a.notes) + '</div>' : '') +
        '</div>' +
        '<div class="log-item-actions">' +
          '<select class="status-select" data-id="' + a.id + '">' +
            ['applied','screening','interviewing','offer','rejected','accepted']
              .map(s => '<option value="' + s + '"' + (s === a.status ? ' selected' : '') + '>' + escapeHtml(s) + '</option>')
              .join('') +
          '</select>' +
          '<span class="status-badge status-' + escapeHtml(a.status) + '">' + escapeHtml(a.status) + '</span>' +
          '<button class="btn-edit" data-id="' + a.id + '">&#9998;</button>' +
          '<button class="task-delete" data-id="' + a.id + '">&times;</button>' +
        '</div>' +
      '</div>'
    ).join('');
  } catch (err) {
    listEl.innerHTML = emptyState('Failed to load applications');
    toast(err.message, 'error');
  }
}

function resetAppsForm() {
  appsEditingId = null;
  document.getElementById('apps-form').reset();
  document.getElementById('apps-submit').textContent = 'Add Application';
  document.getElementById('apps-cancel').style.display = 'none';
}

function initApplications() {
  document.getElementById('apps-filter').addEventListener('change', loadApplications);

  document.getElementById('apps-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const company = document.getElementById('apps-company').value.trim();
    const role = document.getElementById('apps-role').value.trim();
    const status = document.getElementById('apps-status').value;
    const notes = document.getElementById('apps-notes').value.trim();
    if (!company || !role) return;
    try {
      if (appsEditingId) {
        await api('/applications/' + appsEditingId, { method: 'PUT', body: { company, role, status, notes } });
        toast('Application updated', 'success');
      } else {
        await api('/applications', { method: 'POST', body: { company, role, status, notes } });
        toast('Application added', 'success');
      }
      resetAppsForm();
      loadApplications();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('apps-cancel').addEventListener('click', resetAppsForm);

  document.getElementById('apps-list').addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.task-delete');

    if (editBtn) {
      const item = appsItems.find(i => i.id == editBtn.dataset.id);
      if (!item) return;
      document.getElementById('apps-company').value = item.company;
      document.getElementById('apps-role').value = item.role;
      document.getElementById('apps-status').value = item.status;
      document.getElementById('apps-notes').value = item.notes || '';
      appsEditingId = item.id;
      document.getElementById('apps-submit').textContent = 'Update';
      document.getElementById('apps-cancel').style.display = '';
      document.getElementById('apps-form').scrollIntoView({ behavior: 'smooth' });
    }

    if (deleteBtn) {
      try {
        await api('/applications/' + deleteBtn.dataset.id, { method: 'DELETE' });
        toast('Application deleted', 'success');
        if (appsEditingId == deleteBtn.dataset.id) resetAppsForm();
        loadApplications();
      } catch (err) { toast(err.message, 'error'); }
    }
  });

  document.getElementById('apps-list').addEventListener('change', async (e) => {
    const select = e.target.closest('.status-select');
    if (select) {
      try {
        await api('/applications/' + select.dataset.id, { method: 'PUT', body: { status: select.value } });
        toast('Status updated', 'success');
        loadApplications();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

// ========== GYM LOG (with edit) ==========
let gymItems = [];
let gymEditingId = null;

async function loadGym() {
  const listEl = document.getElementById('gym-list');
  listEl.innerHTML = '<div class="spinner"></div>';

  try {
    gymItems = await api('/gym?limit=20');
    if (gymItems.length === 0) {
      listEl.innerHTML = emptyState('No workouts logged yet', 'Log your first workout above');
      return;
    }
    listEl.innerHTML = gymItems.map(g =>
      '<div class="log-item">' +
        '<div class="log-item-main">' +
          '<div class="log-item-title">' + escapeHtml(g.workout_type) + '</div>' +
          '<div class="log-item-meta">' + escapeHtml(g.log_date) + ' &middot; ' + g.duration_minutes + ' min</div>' +
          (g.notes ? '<div class="log-item-notes">' + escapeHtml(g.notes) + '</div>' : '') +
        '</div>' +
        '<div class="log-item-actions">' +
          '<button class="btn-edit" data-id="' + g.id + '">&#9998;</button>' +
          '<button class="task-delete" data-id="' + g.id + '">&times;</button>' +
        '</div>' +
      '</div>'
    ).join('');
  } catch (err) {
    listEl.innerHTML = emptyState('Failed to load workouts');
    toast(err.message, 'error');
  }
}

function resetGymForm() {
  gymEditingId = null;
  document.getElementById('gym-form').reset();
  document.getElementById('gym-submit').textContent = 'Log Workout';
  document.getElementById('gym-cancel').style.display = 'none';
}

function initGym() {
  document.getElementById('gym-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const workoutType = document.getElementById('gym-type').value.trim();
    const durationMinutes = parseInt(document.getElementById('gym-duration').value);
    const notes = document.getElementById('gym-notes').value.trim();
    if (!workoutType || isNaN(durationMinutes)) return;
    try {
      if (gymEditingId) {
        await api('/gym/' + gymEditingId, { method: 'PUT', body: { workout_type: workoutType, duration_minutes: durationMinutes, notes } });
        toast('Workout updated', 'success');
      } else {
        await api('/gym', { method: 'POST', body: { workout_type: workoutType, duration_minutes: durationMinutes, notes } });
        toast('Workout logged', 'success');
      }
      resetGymForm();
      loadGym();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('gym-cancel').addEventListener('click', resetGymForm);

  document.getElementById('gym-list').addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.task-delete');

    if (editBtn) {
      const item = gymItems.find(i => i.id == editBtn.dataset.id);
      if (!item) return;
      document.getElementById('gym-type').value = item.workout_type;
      document.getElementById('gym-duration').value = item.duration_minutes;
      document.getElementById('gym-notes').value = item.notes || '';
      gymEditingId = item.id;
      document.getElementById('gym-submit').textContent = 'Update';
      document.getElementById('gym-cancel').style.display = '';
      document.getElementById('gym-form').scrollIntoView({ behavior: 'smooth' });
    }

    if (deleteBtn) {
      try {
        await api('/gym/' + deleteBtn.dataset.id, { method: 'DELETE' });
        toast('Workout deleted', 'success');
        if (gymEditingId == deleteBtn.dataset.id) resetGymForm();
        loadGym();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

// ========== RELATIONSHIP CHECK-INS (with edit) ==========
let relItems = [];
let relEditingId = null;

async function loadRelationships() {
  const listEl = document.getElementById('rel-list');
  listEl.innerHTML = '<div class="spinner"></div>';

  try {
    relItems = await api('/relationships?limit=20');
    if (relItems.length === 0) {
      listEl.innerHTML = emptyState('No check-ins yet', 'Save your first morning or evening check-in above');
      return;
    }
    listEl.innerHTML = relItems.map(r =>
      '<div class="log-item">' +
        '<div class="log-item-main">' +
          '<div class="log-item-title">' +
            '<span class="time-badge time-' + escapeHtml(r.time_of_day) + '">' + escapeHtml(r.time_of_day) + '</span> ' +
            escapeHtml(r.checkin_date) +
          '</div>' +
          '<div class="log-item-notes">' + escapeHtml(r.notes) + '</div>' +
          (r.gratitude ? '<div class="log-item-meta" style="margin-top:0.3rem;">Gratitude: ' + escapeHtml(r.gratitude) + '</div>' : '') +
        '</div>' +
        '<div class="log-item-actions">' +
          '<button class="btn-edit" data-id="' + r.id + '">&#9998;</button>' +
          '<button class="task-delete" data-id="' + r.id + '">&times;</button>' +
        '</div>' +
      '</div>'
    ).join('');
  } catch (err) {
    listEl.innerHTML = emptyState('Failed to load check-ins');
    toast(err.message, 'error');
  }
}

function resetRelForm() {
  relEditingId = null;
  document.getElementById('rel-form').reset();
  document.getElementById('rel-submit').textContent = 'Save Check-in';
  document.getElementById('rel-cancel').style.display = 'none';
}

function initRelationships() {
  document.getElementById('rel-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const timeOfDay = document.getElementById('rel-time').value;
    const notes = document.getElementById('rel-notes').value.trim();
    const gratitude = document.getElementById('rel-gratitude').value.trim();
    if (!notes) return;
    try {
      if (relEditingId) {
        await api('/relationships/' + relEditingId, { method: 'PUT', body: { notes, gratitude } });
        toast('Check-in updated', 'success');
      } else {
        await api('/relationships', { method: 'POST', body: { time_of_day: timeOfDay, notes, gratitude } });
        toast('Check-in saved', 'success');
      }
      resetRelForm();
      loadRelationships();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('rel-cancel').addEventListener('click', resetRelForm);

  document.getElementById('rel-list').addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.task-delete');

    if (editBtn) {
      const item = relItems.find(i => i.id == editBtn.dataset.id);
      if (!item) return;
      document.getElementById('rel-time').value = item.time_of_day;
      document.getElementById('rel-notes').value = item.notes || '';
      document.getElementById('rel-gratitude').value = item.gratitude || '';
      relEditingId = item.id;
      document.getElementById('rel-submit').textContent = 'Update';
      document.getElementById('rel-cancel').style.display = '';
      document.getElementById('rel-form').scrollIntoView({ behavior: 'smooth' });
    }

    if (deleteBtn) {
      try {
        await api('/relationships/' + deleteBtn.dataset.id, { method: 'DELETE' });
        toast('Check-in deleted', 'success');
        if (relEditingId == deleteBtn.dataset.id) resetRelForm();
        loadRelationships();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  initGrid();
  initModal();
  initTopbar();
  initKeyboardShortcuts();
  initRouter();
  initTasks();
  initPlan();
  initSql();
  initApplications();
  initGym();
  initRelationships();
});
