const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { getMyPasses, applyPass, getActiveRoutes } = require('../controllers/passController');

router.get('/my-passes', requireAuth, getMyPasses);
router.post('/apply', requireAuth, requireRole('PASSENGER'), applyPass);
router.get('/routes/active', getActiveRoutes);

module.exports = router;
