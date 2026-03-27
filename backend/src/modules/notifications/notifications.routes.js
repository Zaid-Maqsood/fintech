const { Router } = require('express');
const controller = require('./notifications.controller');

const router = Router();

router.get('/', controller.getNotifications);
router.put('/read-all', controller.markAllAsRead);
router.put('/:id/read', controller.markAsRead);
router.delete('/:id', controller.deleteNotification);

module.exports = router;
