const { Router } = require('express');
const controller = require('./analytics.controller');

const router = Router();

router.get('/overview', controller.getOverview);
router.get('/spending-by-category', controller.getSpendingByCategory);
router.get('/monthly-flow', controller.getMonthlyFlow);
router.get('/budget-vs-actual', controller.getBudgetVsActual);

module.exports = router;
