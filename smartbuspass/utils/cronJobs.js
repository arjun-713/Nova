const cron = require('node-cron');
const db = require('../db/connection');
const mailer = require('./mailer');

function startCronJobs() {
  // Daily midnight: mark expired passes
  cron.schedule('0 0 * * *', async () => {
    try {
      const [result] = await db.execute(
        "UPDATE bus_passes SET status='EXPIRED' WHERE status='APPROVED' AND expiry_date < CURDATE()"
      );
      console.log(`[CRON] Expired ${result.affectedRows} passes.`);
    } catch (err) {
      console.error('[CRON] Expiry check failed:', err.message);
    }
  });

  // Daily 9 AM: expiry reminders (7 days and 1 day)
  cron.schedule('0 9 * * *', async () => {
    try {
      for (const daysLeft of [7, 1]) {
        const [passes] = await db.execute(
          `SELECT bp.pass_id, u.email, u.full_name, r.route_name
           FROM bus_passes bp
           JOIN users u ON bp.user_id=u.user_id
           JOIN routes r ON bp.route_id=r.route_id
           WHERE bp.status='APPROVED' AND bp.expiry_date = DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
          [daysLeft]
        );
        for (const pass of passes) {
          try {
            await mailer.sendExpiryReminderEmail(pass.email, pass.full_name, pass.route_name, daysLeft);
          } catch (e) {
            console.warn(`[CRON] Reminder email failed for ${pass.email}:`, e.message);
          }
        }
        console.log(`[CRON] Sent ${passes.length} reminders for ${daysLeft}-day expiry.`);
      }
    } catch (err) {
      console.error('[CRON] Reminder job failed:', err.message);
    }
  });

  console.log('[CRON] Jobs scheduled.');
}

module.exports = { startCronJobs };
