const { Router } = require('express');
const controller = require('./payments.controller');

const router = Router();

router.get('/', controller.getPayments);
router.get('/:id', controller.getPayment);
router.post('/send', controller.sendPayment);

module.exports = router;
