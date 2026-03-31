const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const ctrl = require('../controllers/adminController');

const guard = [requireAuth, requireRole('ADMIN')];

router.get('/stats', ...guard, ctrl.getStats);
router.get('/applications', ...guard, ctrl.getApplications);
router.put('/applications/:passId/approve', ...guard, ctrl.approveApplication);
router.put('/applications/:passId/reject', ...guard, ctrl.rejectApplication);
router.get('/routes', ...guard, ctrl.getRoutes);
router.post('/routes', ...guard, ctrl.addRoute);
router.put('/routes/:id', ...guard, ctrl.updateRoute);
router.delete('/routes/:id', ...guard, ctrl.deleteRoute);
router.get('/users', ...guard, ctrl.getUsers);
router.get('/reports', ...guard, ctrl.getReports);

module.exports = router;
