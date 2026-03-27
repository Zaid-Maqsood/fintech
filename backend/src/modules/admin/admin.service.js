const { query } = require('../../config/db');

const getStats = async () => {
  const userStats = await query(
    `SELECT
       COUNT(*) as total_users,
       COUNT(*) FILTER (WHERE account_status = 'active') as active_users,
       COUNT(*) FILTER (WHERE account_status = 'suspended') as suspended_users,
       COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
       COUNT(*) FILTER (WHERE kyc_status = 'verified') as kyc_verified,
       COUNT(*) FILTER (WHERE kyc_status = 'pending') as kyc_pending,
       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d
     FROM users`
  );

  const txStats = await query(
    `SELECT
       COUNT(*) as total_transactions,
       COALESCE(SUM(amount), 0) as total_volume,
       COUNT(*) FILTER (WHERE status = 'completed') as completed_transactions,
       COUNT(*) FILTER (WHERE status = 'pending') as pending_transactions,
       COUNT(*) FILTER (WHERE is_flagged = TRUE) as flagged_transactions,
       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as transactions_30d,
       COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0) as volume_30d
     FROM transactions`
  );

  const paymentStats = await query(
    `SELECT
       COUNT(*) as total_payments,
       COALESCE(SUM(amount), 0) as total_payment_volume,
       COUNT(*) FILTER (WHERE status = 'completed') as completed_payments,
       COUNT(*) FILTER (WHERE status = 'pending') as pending_payments,
       COUNT(*) FILTER (WHERE status = 'failed') as failed_payments
     FROM payments`
  );

  const accountStats = await query(
    `SELECT
       COUNT(*) as total_accounts,
       COALESCE(SUM(balance), 0) as total_balance_all_accounts
     FROM accounts WHERE status = 'active'`
  );

  return {
    users: userStats.rows[0],
    transactions: txStats.rows[0],
    payments: paymentStats.rows[0],
    accounts: accountStats.rows[0],
  };
};

const getAllUsers = async (filters = {}) => {
  const { page = 1, limit = 20, search, status, role, kyc_status } = filters;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (search) {
    conditions.push(`(u.full_name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }
  if (status) {
    conditions.push(`u.account_status = $${paramIdx++}`);
    params.push(status);
  }
  if (role) {
    conditions.push(`u.role = $${paramIdx++}`);
    params.push(role);
  }
  if (kyc_status) {
    conditions.push(`u.kyc_status = $${paramIdx++}`);
    params.push(kyc_status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(`SELECT COUNT(*) as total FROM users u ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].total);

  params.push(parseInt(limit), offset);
  const dataResult = await query(
    `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.account_status, u.kyc_status,
            u.aml_status, u.risk_level, u.country, u.created_at,
            (SELECT COUNT(*) FROM accounts a WHERE a.user_id = u.id) as account_count,
            (SELECT COALESCE(SUM(balance), 0) FROM accounts a WHERE a.user_id = u.id AND a.status = 'active') as total_balance
     FROM users u
     ${whereClause}
     ORDER BY u.created_at DESC
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

const getUserDetail = async (userId) => {
  const userResult = await query(
    `SELECT id, email, full_name, phone, country, currency_preference, timezone, role,
            kyc_status, aml_status, account_status, risk_level, avatar_url, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId]
  );
  if (!userResult.rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  const user = userResult.rows[0];

  const accounts = await query(
    'SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at ASC',
    [userId]
  );

  const recentTransactions = await query(
    `SELECT t.*, tc.name as category_name, tc.icon as category_icon, tc.color as category_color
     FROM transactions t
     LEFT JOIN transaction_categories tc ON t.category_id = tc.id
     WHERE t.user_id = $1
     ORDER BY t.transaction_date DESC
     LIMIT 10`,
    [userId]
  );

  return {
    ...user,
    accounts: accounts.rows,
    recentTransactions: recentTransactions.rows,
  };
};

const updateUserStatus = async (userId, status) => {
  const allowedStatuses = ['active', 'inactive', 'suspended'];
  if (!allowedStatuses.includes(status)) {
    const err = new Error('Invalid status value');
    err.status = 400;
    throw err;
  }

  const result = await query(
    `UPDATE users SET account_status = $1, updated_at = NOW() WHERE id = $2
     RETURNING id, email, full_name, account_status, updated_at`,
    [status, userId]
  );
  if (!result.rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

const getAllTransactions = async (filters = {}) => {
  const { page = 1, limit = 20, type, status, is_flagged, search, user_id, date_from, date_to } = filters;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (type) {
    conditions.push(`t.type = $${paramIdx++}`);
    params.push(type);
  }
  if (status) {
    conditions.push(`t.status = $${paramIdx++}`);
    params.push(status);
  }
  if (is_flagged !== undefined && is_flagged !== '') {
    conditions.push(`t.is_flagged = $${paramIdx++}`);
    params.push(is_flagged === 'true' || is_flagged === true);
  }
  if (user_id) {
    conditions.push(`t.user_id = $${paramIdx++}`);
    params.push(user_id);
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
    conditions.push(`(t.description ILIKE $${paramIdx} OR t.reference_id ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*) as total FROM transactions t JOIN users u ON t.user_id = u.id ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  params.push(parseInt(limit), offset);
  const dataResult = await query(
    `SELECT t.id, t.user_id, t.type, t.amount, t.currency, t.description, t.status,
            t.is_flagged, t.risk_score, t.compliance_notes, t.payment_method, t.reference_id,
            t.transaction_date, t.created_at,
            u.email as user_email, u.full_name as user_name,
            tc.name as category_name
     FROM transactions t
     JOIN users u ON t.user_id = u.id
     LEFT JOIN transaction_categories tc ON t.category_id = tc.id
     ${whereClause}
     ORDER BY t.transaction_date DESC
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

const toggleTransactionFlag = async (transactionId, notes) => {
  const result = await query(
    `UPDATE transactions
     SET is_flagged = NOT is_flagged,
         compliance_notes = COALESCE($1, compliance_notes),
         updated_at = NOW()
     WHERE id = $2
     RETURNING id, is_flagged, compliance_notes, updated_at`,
    [notes || null, transactionId]
  );
  if (!result.rows.length) {
    const err = new Error('Transaction not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

const getAdminAnalytics = async () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const monthlyStats = await query(
    `SELECT
       EXTRACT(YEAR FROM created_at)::int as year,
       EXTRACT(MONTH FROM created_at)::int as month,
       TO_CHAR(created_at, 'Mon YYYY') as month_label,
       COUNT(*) as new_users
     FROM users
     WHERE created_at >= NOW() - INTERVAL '6 months'
     GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at), TO_CHAR(created_at, 'Mon YYYY')
     ORDER BY year ASC, month ASC`
  );

  const monthlyTxVolume = await query(
    `SELECT
       EXTRACT(YEAR FROM transaction_date)::int as year,
       EXTRACT(MONTH FROM transaction_date)::int as month,
       TO_CHAR(transaction_date, 'Mon YYYY') as month_label,
       COUNT(*) as transaction_count,
       COALESCE(SUM(amount), 0) as total_volume
     FROM transactions
     WHERE transaction_date >= NOW() - INTERVAL '6 months' AND status = 'completed'
     GROUP BY EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date), TO_CHAR(transaction_date, 'Mon YYYY')
     ORDER BY year ASC, month ASC`
  );

  const topUsers = await query(
    `SELECT u.id, u.full_name, u.email,
            COUNT(t.id) as transaction_count,
            COALESCE(SUM(t.amount), 0) as total_volume
     FROM users u
     LEFT JOIN transactions t ON u.id = t.user_id AND t.status = 'completed'
     GROUP BY u.id, u.full_name, u.email
     ORDER BY total_volume DESC
     LIMIT 10`
  );

  const riskDistribution = await query(
    `SELECT risk_level, COUNT(*) as count FROM users GROUP BY risk_level ORDER BY count DESC`
  );

  const kycDistribution = await query(
    `SELECT kyc_status, COUNT(*) as count FROM users GROUP BY kyc_status ORDER BY count DESC`
  );

  return {
    monthlyUserGrowth: monthlyStats.rows,
    monthlyTransactionVolume: monthlyTxVolume.rows,
    topUsers: topUsers.rows,
    riskDistribution: riskDistribution.rows,
    kycDistribution: kycDistribution.rows,
  };
};

module.exports = {
  getStats,
  getAllUsers,
  getUserDetail,
  updateUserStatus,
  getAllTransactions,
  toggleTransactionFlag,
  getAdminAnalytics,
};
