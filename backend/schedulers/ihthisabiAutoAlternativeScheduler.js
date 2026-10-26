const cron = require('node-cron');
const { runAutoAlternativeSubmissions } = require('../utils/memberCategory');

const run = async (trigger) => {
  try {
    const { period, created, skipped } = await runAutoAlternativeSubmissions();
    if (created > 0) {
      console.log(
        `[AutoAlternativeSubmit] ${trigger}: created ${created} alternative submission(s) for Q${period.quarter} ${period.year} (${skipped} already submitted)`
      );
    }
  } catch (error) {
    console.error(`[AutoAlternativeSubmit] ${trigger} failed:`, error);
  }
};

/**
 * Auto-submits the open quarter's alternative report for Aged / Patient members
 * (see utils/memberCategory.js). Runs once at startup to catch up, then hourly,
 * so a new quarter is covered within an hour of opening. Each run is idempotent.
 */
let scheduled = false;
const initializeIhthisabiAutoAlternativeScheduler = () => {
  run('startup');
  // The connection's 'connected' event fires again after a reconnect.
  if (scheduled) return;
  scheduled = true;
  cron.schedule('15 * * * *', () => run('hourly'), { timezone: 'Asia/Kolkata' });
};

module.exports = initializeIhthisabiAutoAlternativeScheduler;
