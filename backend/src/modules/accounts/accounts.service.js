const { query } = require('../../config/db');

const getUserAccounts = async (userId) => {
  const result = await query(
    `SELECT id, user_id, name, type, balance, currency, status, account_number, created_at, updated_at
     FROM accounts
     WHERE user_id = $1
     ORDER BY created_at ASC`,
    [userId]
  );
  return result.rows;
};

const getAccountById = async (accountId, userId) => {
  const result = await query(
    `SELECT id, user_id, name, type, balance, currency, status, account_number, created_at, updated_at
     FROM accounts
     WHERE id = $1 AND user_id = $2`,
    [accountId, userId]
  );
  if (!result.rows.length) {
    const err = new Error('Account not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

module.exports = { getUserAccounts, getAccountById };
