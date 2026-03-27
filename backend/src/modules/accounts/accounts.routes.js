const { Router } = require('express');
const controller = require('./accounts.controller');

const router = Router();

router.get('/', controller.getAccounts);
router.get('/:id', controller.getAccount);

module.exports = router;
