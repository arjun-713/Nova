require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'smartbuspass_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// Rate limit on login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' }
});
app.use('/api/auth/login', loginLimiter);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pass', require('./routes/pass'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/driver', require('./routes/driver'));
app.use('/api/gps', require('./routes/gps'));

// Catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// Start cron jobs and simulator
const useDummyAuth = String(process.env.USE_DUMMY_AUTH || 'true').toLowerCase() === 'true';
if (useDummyAuth) {
  console.log('[MODE] USE_DUMMY_AUTH=true -> skipping DB cron jobs and bus simulator.');
} else {
  const { startCronJobs } = require('./utils/cronJobs');
  const { startBusSimulator } = require('./utils/busSimulator');
  startCronJobs();
  startBusSimulator();
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SmartBusPass running on http://localhost:${PORT}`));
