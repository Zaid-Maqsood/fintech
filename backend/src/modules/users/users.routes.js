const { Router } = require('express');
const controller = require('./users.controller');

const router = Router();

router.get('/me', controller.getMe);
router.get('/recipients', controller.getRecipients);
router.put('/me', controller.updateMe);
router.put('/me/password', controller.changePassword);

module.exports = router;
