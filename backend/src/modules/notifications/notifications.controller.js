const notificationsService = require('./notifications.service');

const getNotifications = async (req, res, next) => {
  try {
    const result = await notificationsService.getNotifications(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const result = await notificationsService.markAsRead(req.params.id, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationsService.markAllAsRead(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const result = await notificationsService.deleteNotification(req.params.id, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification };
