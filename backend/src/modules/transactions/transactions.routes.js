const { Router } = require('express');
const controller = require('./transactions.controller');

const router = Router();

router.get('/categories', controller.getCategories);
router.get('/', controller.getTransactions);
router.get('/:id', controller.getTransaction);
router.post('/', controller.createTransaction);
router.put('/:id', controller.updateTransaction);
router.delete('/:id', controller.deleteTransaction);

module.exports = router;
