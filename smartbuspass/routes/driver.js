const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validateScan } = require('../controllers/gpsController');

router.post('/scan/validate', requireAuth, requireRole('DRIVER', 'ADMIN'), validateScan);

module.exports = router;
