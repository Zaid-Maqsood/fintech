const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/db');

const getTransactions = async (userId, filters = {}) => {
  const {
    page = 1,
    limit = 20,
    type,
    category_id,
    status,
    search,
    date_from,
    date_to,
    sort = 'transaction_date',
    order = 'DESC',
    account_id,
  } = filters;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = ['t.user_id = $1'];
  const params = [userId];
  let paramIdx = 2;

  if (type) {
    conditions.push(`t.type = $${paramIdx++}`);
    params.push(type);
  }
  if (category_id) {
    conditions.push(`t.category_id = $${paramIdx++}`);
    params.push(category_id);
  }
  if (status) {
    conditions.push(`t.status = $${paramIdx++}`);
    params.push(status);
  }
  if (account_id) {
    conditions.push(`t.account_id = $${paramIdx++}`);
    params.push(account_id);
  }
  if (date_from) {
    conditions.push(`t.transaction_date >= $${paramIdx++}`);
    params.push(date_from);
  }
  if (date_to) {
    conditions.push(`t.transaction_date <= $${paramIdx++}`);
    params.push(date_to);
  }
  if (search) {
    conditions.push(`(t.description ILIKE $${paramIdx} OR t.reference_id ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  const allowedSorts = ['transaction_date', 'amount', 'created_at', 'description'];
  const allowedOrders = ['ASC', 'DESC'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'transaction_date';
  const safeOrder = allowedOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

  const whereClause = conditions.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) as total FROM transactions t WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  params.push(parseInt(limit), offset);
  const dataResult = await query(
    `SELECT t.id, t.user_id, t.account_id, t.category_id, t.type, t.amount, t.currency,
            t.description, t.status, t.payment_method, t.reference_id, t.risk_score,
            t.is_flagged, t.compliance_notes, t.tags, t.transaction_date, t.created_at, t.updated_at,
            tc.name as category_name, tc.icon as category_icon, tc.color as category_color,
            a.name as account_name, a.type as account_type
     FROM transactions t
     LEFT JOIN transaction_categories tc ON t.category_id = tc.id
     LEFT JOIN accounts a ON t.account_id = a.id
     WHERE ${whereClause}
     ORDER BY t.${safeSort} ${safeOrder}
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    params
  );

  return {
    data: dataResult.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  };
};

const getTransactionById = async (id, userId) => {
  const result = await query(
    `SELECT t.id, t.user_id, t.account_id, t.category_id, t.type, t.amount, t.currency,
            t.description, t.status, t.payment_method, t.reference_id, t.risk_score,
            t.is_flagged, t.compliance_notes, t.tags, t.transaction_date, t.created_at, t.updated_at,
            tc.name as category_name, tc.icon as category_icon, tc.color as category_color,
            a.name as account_name, a.type as account_type
     FROM transactions t
     LEFT JOIN transaction_categories tc ON t.category_id = tc.id
     LEFT JOIN accounts a ON t.account_id = a.id
     WHERE t.id = $1 AND t.user_id = $2`,
    [id, userId]
  );
  if (!result.rows.length) {
    const err = new Error('Transaction not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

const createTransaction = async (userId, data) => {
  const {
    accountId,
    categoryId,
    type,
    amount,
    currency = 'USD',
    description,
    status = 'completed',
    paymentMethod,
    referenceId,
    tags,
    transactionDate,
  } = data;

  // Verify account belongs to user if provided
  if (accountId) {
    const accResult = await query('SELECT id, balance FROM accounts WHERE id = $1 AND user_id = $2', [accountId, userId]);
    if (!accResult.rows.length) {
      const err = new Error('Account not found or does not belong to user');
      err.status = 404;
      throw err;
    }
  }

  const id = uuidv4();
  const txDate = transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString();

  const result = await query(
    `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, currency, description,
                               status, payment_method, reference_id, tags, transaction_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [id, userId, accountId || null, categoryId || null, type, parseFloat(amount), currency,
     description || null, status, paymentMethod || null, referenceId || null,
     tags ? `{${tags.join(',')}}` : null, txDate]
  );
  const tx = result.rows[0];

  // Update account balance if linked and status is completed
  if (accountId && status === 'completed') {
    let balanceChange = parseFloat(amount);
    if (type === 'expense' || type === 'transfer') balanceChange = -balanceChange;
    await query(
      'UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [balanceChange, accountId]
    );
  }

  return tx;
};

const updateTransaction = async (id, userId, data) => {
  const {
    categoryId,
    description,
    status,
    paymentMethod,
    tags,
    transactionDate,
  } = data;

  const result = await query(
    `UPDATE transactions
     SET category_id = COALESCE($1, category_id),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         payment_method = COALESCE($4, payment_method),
         tags = COALESCE($5, tags),
         transaction_date = COALESCE($6, transaction_date),
         updated_at = NOW()
     WHERE id = $7 AND user_id = $8
     RETURNING *`,
    [categoryId || null, description || null, status || null, paymentMethod || null,
     tags ? `{${tags.join(',')}}` : null,
     transactionDate ? new Date(transactionDate).toISOString() : null,
     id, userId]
  );
  if (!result.rows.length) {
    const err = new Error('Transaction not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

const deleteTransaction = async (id, userId) => {
  // Get transaction first to reverse balance
  const txResult = await query(
    'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (!txResult.rows.length) {
    const err = new Error('Transaction not found');
    err.status = 404;
    throw err;
  }
  const tx = txResult.rows[0];

  // Reverse the balance effect if transaction was completed and had an account
  if (tx.account_id && tx.status === 'completed') {
    let reversal = parseFloat(tx.amount);
    if (tx.type === 'expense' || tx.type === 'transfer') reversal = -reversal;
    // Reverse means opposite
    await query(
      'UPDATE accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
      [reversal, tx.account_id]
    );
  }

  await query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);
  return { message: 'Transaction deleted successfully' };
};

const getCategories = async () => {
  const result = await query('SELECT * FROM transaction_categories ORDER BY type, name');
  return result.rows;
};

module.exports = { getTransactions, getTransactionById, createTransaction, updateTransaction, deleteTransaction, getCategories };
