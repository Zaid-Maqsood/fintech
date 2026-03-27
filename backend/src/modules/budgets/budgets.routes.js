const { Router } = require('express');
const controller = require('./budgets.controller');

const router = Router();

router.get('/current', controller.getCurrentBudget);
router.get('/', controller.getBudgets);
router.get('/:id', controller.getBudget);
router.post('/', controller.createBudget);
router.put('/:id', controller.updateBudget);
router.delete('/:id', controller.deleteBudget);

module.exports = router;
