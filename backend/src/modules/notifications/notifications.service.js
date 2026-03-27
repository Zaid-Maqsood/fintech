const { query } = require('../../config/db');

const getNotifications = async (userId) => {
  const result = await query(
    `SELECT id, user_id, type, title, message, data, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  const unreadCount = result.rows.filter(n => !n.is_read).length;
  return {
    data: result.rows,
    unreadCount,
  };
};

const markAsRead = async (notificationId, userId) => {
  const result = await query(
    `UPDATE notifications SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );
  if (!result.rows.length) {
    const err = new Error('Notification not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

const markAllAsRead = async (userId) => {
  const result = await query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return { message: `Marked ${result.rowCount} notifications as read` };
};

const deleteNotification = async (notificationId, userId) => {
  const result = await query(
    'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
    [notificationId, userId]
  );
  if (result.rowCount === 0) {
    const err = new Error('Notification not found');
    err.status = 404;
    throw err;
  }
  return { message: 'Notification deleted' };
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification };
