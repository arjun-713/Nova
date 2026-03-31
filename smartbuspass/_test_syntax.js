// Quick syntax check - just require all modules
try {
  require('./db/connection');
  require('./middleware/auth');
  require('./middleware/role');
  require('./utils/qrGenerator');
  require('./utils/mailer');
  require('./utils/cronJobs');
  require('./utils/busSimulator');
  require('./controllers/authController');
  require('./controllers/passController');
  require('./controllers/adminController');
  require('./controllers/gpsController');
  require('./routes/auth');
  require('./routes/pass');
  require('./routes/admin');
  require('./routes/driver');
  require('./routes/gps');
  console.log('ALL MODULES OK');
} catch(e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
