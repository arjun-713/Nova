const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { updateGPS, getLive, getBusHistory } = require('../controllers/gpsController');

router.post('/update', requireAuth, requireRole('DRIVER', 'ADMIN'), updateGPS);
router.get('/live', getLive);
router.get('/bus/:busId/history', getBusHistory);

module.exports = router;
