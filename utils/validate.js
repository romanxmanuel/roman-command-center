// utils/validate.js — Simple validation helpers for API request bodies
// Used across all route files for consistent input checking.
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const VALID_STATUSES = ['applied', 'screening', 'interviewing', 'offer', 'rejected', 'accepted'];

function isValidDate(value) {
  return typeof value === 'string' && DATE_PATTERN.test(value);
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value >= 0;
}

function withinMaxLen(value, max) {
  return typeof value === 'string' && value.length <= max;
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('en-CA');
}

module.exports = {
  isValidDate,
  isPositiveInt,
  withinMaxLen,
  todayStr,
  tomorrowStr,
  VALID_STATUSES,
};
