const { z } = require('zod');
const adminService = require('./admin.service');

const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended']),
});

const flagTransactionSchema = z.object({
  notes: z.string().optional(),
});

const getStats = async (req, res, next) => {
  try {
    const raw = await adminService.getStats();
    // Normalize to flat shape the frontend expects
    const stats = {
      totalUsers: parseInt(raw.users?.total_users ?? 0),
      activeUsers: parseInt(raw.users?.active_users ?? 0),
      suspendedUsers: parseInt(raw.users?.suspended_users ?? 0),
      adminUsers: parseInt(raw.users?.admin_users ?? 0),
      kycVerified: parseInt(raw.users?.kyc_verified ?? 0),
      newUsers30d: parseInt(raw.users?.new_users_30d ?? 0),
      totalTransactions: parseInt(raw.transactions?.total_transactions ?? 0),
      totalVolume: parseFloat(raw.transactions?.total_volume ?? 0),
      completedTransactions: parseInt(raw.transactions?.completed_transactions ?? 0),
      pendingTransactions: parseInt(raw.transactions?.pending_transactions ?? 0),
      flaggedCount: parseInt(raw.transactions?.flagged_transactions ?? 0),
      transactions30d: parseInt(raw.transactions?.transactions_30d ?? 0),
      volume30d: parseFloat(raw.transactions?.volume_30d ?? 0),
      totalPayments: parseInt(raw.payments?.total_payments ?? 0),
      totalPaymentVolume: parseFloat(raw.payments?.total_payment_volume ?? 0),
      completedPayments: parseInt(raw.payments?.completed_payments ?? 0),
      pendingPayments: parseInt(raw.payments?.pending_payments ?? 0),
      failedPayments: parseInt(raw.payments?.failed_payments ?? 0),
      totalAccounts: parseInt(raw.accounts?.total_accounts ?? 0),
      totalBalanceAllAccounts: parseFloat(raw.accounts?.total_balance_all_accounts ?? 0),
    };
    // Add real monthly activity for the dashboard bar chart
    const analytics = await adminService.getAdminAnalytics();
    stats.monthlyActivity = (analytics.monthlyTransactionVolume ?? []).map(r => ({
      month: (r.month_label ?? '').split(' ')[0], // "Mar 2026" → "Mar"
      transactions: parseInt(r.transaction_count ?? 0),
    }));

    return res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const result = await adminService.getAllUsers(req.query);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const getUserDetail = async (req, res, next) => {
  try {
    const user = await adminService.getUserDetail(req.params.id);
    return res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const parsed = updateUserStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const result = await adminService.updateUserStatus(req.params.id, parsed.data.status);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const getAllTransactions = async (req, res, next) => {
  try {
    const result = await adminService.getAllTransactions(req.query);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const flagTransaction = async (req, res, next) => {
  try {
    const parsed = flagTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const result = await adminService.toggleTransactionFlag(req.params.id, parsed.data.notes);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const getAdminAnalytics = async (req, res, next) => {
  try {
    const raw = await adminService.getAdminAnalytics();
    const stats = await adminService.getStats();

    const totalUsers = parseInt(stats.users?.total_users ?? 0);
    const activeUsers = parseInt(stats.users?.active_users ?? 0);
    const totalTransactions = parseInt(stats.transactions?.total_transactions ?? 0);
    const totalVolume = parseFloat(stats.transactions?.total_volume ?? 0);
    const flaggedCount = parseInt(stats.transactions?.flagged_transactions ?? 0);
    const completedPayments = parseInt(stats.payments?.completed_payments ?? 0);
    const pendingPayments = parseInt(stats.payments?.pending_payments ?? 0);
    const failedPayments = parseInt(stats.payments?.failed_payments ?? 0);

    const result = {
      userGrowth: (raw.monthlyUserGrowth ?? []).map(r => ({
        month: r.month_label ?? `${r.year}-${r.month}`,
        users: parseInt(r.new_users ?? 0),
      })),
      transactionVolume: (raw.monthlyTransactionVolume ?? []).map(r => ({
        month: r.month_label ?? `${r.year}-${r.month}`,
        volume: parseFloat(r.total_volume ?? 0),
        transactions: parseInt(r.transaction_count ?? 0),
      })),
      statusBreakdown: [
        { name: 'Completed', value: completedPayments },
        { name: 'Pending', value: pendingPayments },
        { name: 'Failed', value: failedPayments },
      ].filter(s => s.value > 0),
      topCategories: (raw.topCategories ?? raw.topUsers ?? []).slice(0, 5).map(r => ({
        category: r.category_name ?? r.full_name ?? r.name ?? 'Unknown',
        amount: parseFloat(r.total_volume ?? r.total_spent ?? 0),
      })),
      summary: {
        totalUsers,
        totalTransactions,
        totalVolume,
        avgTransactionValue: totalTransactions > 0 ? totalVolume / totalTransactions : 0,
        activeUsersPercent: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
        flaggedRate: totalTransactions > 0 ? parseFloat(((flaggedCount / totalTransactions) * 100).toFixed(2)) : 0,
      },
    };
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getAllUsers, getUserDetail, updateUserStatus, getAllTransactions, flagTransaction, getAdminAnalytics };
