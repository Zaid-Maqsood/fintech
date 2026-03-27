const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');

const getProfile = async (userId) => {
  const result = await query(
    `SELECT id, email, full_name, phone, country, currency_preference, timezone, role,
            kyc_status, aml_status, account_status, risk_level, avatar_url, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId]
  );
  if (!result.rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

const updateProfile = async (userId, data) => {
  const { fullName, phone, country, currencyPreference, timezone, avatarUrl } = data;

  const result = await query(
    `UPDATE users
     SET full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone),
         country = COALESCE($3, country),
         currency_preference = COALESCE($4, currency_preference),
         timezone = COALESCE($5, timezone),
         avatar_url = COALESCE($6, avatar_url),
         updated_at = NOW()
     WHERE id = $7
     RETURNING id, email, full_name, phone, country, currency_preference, timezone, role,
               kyc_status, aml_status, account_status, risk_level, avatar_url, created_at, updated_at`,
    [fullName || null, phone || null, country || null, currencyPreference || null, timezone || null, avatarUrl || null, userId]
  );
  if (!result.rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!result.rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) {
    const err = new Error('Current password is incorrect');
    err.status = 400;
    throw err;
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
  return { message: 'Password changed successfully' };
};

const getRecipients = async (currentUserId) => {
  const result = await query(
    `SELECT id, full_name, email FROM users WHERE id != $1 AND account_status = 'active' ORDER BY full_name`,
    [currentUserId]
  );
  return result.rows;
};

module.exports = { getProfile, updateProfile, changePassword, getRecipients };
