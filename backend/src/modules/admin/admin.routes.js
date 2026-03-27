const { Router } = require('express');
const { requireAdmin } = require('../../middleware/auth');
const controller = require('./admin.controller');

const router = Router();

// All routes require admin
router.use(requireAdmin);

router.get('/stats', controller.getStats);
router.get('/users', controller.getAllUsers);
router.get('/users/:id', controller.getUserDetail);
router.put('/users/:id/status', controller.updateUserStatus);
router.get('/transactions', controller.getAllTransactions);
router.put('/transactions/:id/flag', controller.flagTransaction);
router.get('/analytics', controller.getAdminAnalytics);

module.exports = router;
