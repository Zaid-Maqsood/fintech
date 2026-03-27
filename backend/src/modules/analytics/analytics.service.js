const { query } = require('../../config/db');

const getOverview = async (userId) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Total balance across all accounts
  const balanceResult = await query(
    `SELECT COALESCE(SUM(balance), 0) as total_balance
     FROM accounts WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );

  // Monthly income
  const incomeResult = await query(
    `SELECT COALESCE(SUM(amount), 0) as monthly_income
     FROM transactions
     WHERE user_id = $1 AND type = 'income' AND status = 'completed'
       AND EXTRACT(MONTH FROM transaction_date) = $2
       AND EXTRACT(YEAR FROM transaction_date) = $3`,
    [userId, month, year]
  );

  // Monthly expense
  const expenseResult = await query(
    `SELECT COALESCE(SUM(amount), 0) as monthly_expense
     FROM transactions
     WHERE user_id = $1 AND type = 'expense' AND status = 'completed'
       AND EXTRACT(MONTH FROM transaction_date) = $2
       AND EXTRACT(YEAR FROM transaction_date) = $3`,
    [userId, month, year]
  );

  // Transaction count this month
  const txCountResult = await query(
    `SELECT COUNT(*) as transaction_count
     FROM transactions
     WHERE user_id = $1
       AND EXTRACT(MONTH FROM transaction_date) = $2
       AND EXTRACT(YEAR FROM transaction_date) = $3`,
    [userId, month, year]
  );

  const totalBalance = parseFloat(balanceResult.rows[0].total_balance);
  const monthlyIncome = parseFloat(incomeResult.rows[0].monthly_income);
  const monthlyExpense = parseFloat(expenseResult.rows[0].monthly_expense);
  const savings = monthlyIncome - monthlyExpense;
  const transactionCount = parseInt(txCountResult.rows[0].transaction_count);

  return {
    totalBalance,
    availableBalance: totalBalance,
    monthlyIncome,
    monthlyExpenses: monthlyExpense,
    monthlyExpense,
    savings,
    transactionCount,
    month,
    year,
  };
};

const getSpendingByCategory = async (userId, months = 3) => {
  const result = await query(
    `SELECT tc.id as category_id, tc.name as category_name, tc.icon, tc.color,
            COALESCE(SUM(t.amount), 0) as total_spent,
            COUNT(t.id) as transaction_count
     FROM transaction_categories tc
     LEFT JOIN transactions t ON tc.id = t.category_id
       AND t.user_id = $1
       AND t.type = 'expense'
       AND t.status = 'completed'
       AND t.transaction_date >= NOW() - INTERVAL '${parseInt(months)} months'
     WHERE tc.type = 'expense'
     GROUP BY tc.id, tc.name, tc.icon, tc.color
     HAVING COALESCE(SUM(t.amount), 0) > 0
     ORDER BY total_spent DESC`,
    [userId]
  );
  return result.rows.map(row => ({
    category_id: row.category_id,
    category: row.category_name,
    category_name: row.category_name,
    amount: parseFloat(row.total_spent),
    total_spent: parseFloat(row.total_spent),
    transaction_count: parseInt(row.transaction_count),
    icon: row.icon,
    color: row.color,
  }));
};

const getMonthlyFlow = async (userId, months = 6) => {
  const result = await query(
    `SELECT
       EXTRACT(YEAR FROM transaction_date)::int as year,
       EXTRACT(MONTH FROM transaction_date)::int as month,
       TO_CHAR(transaction_date, 'Mon YYYY') as month_label,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
     FROM transactions
     WHERE user_id = $1
       AND status = 'completed'
       AND type IN ('income', 'expense')
       AND transaction_date >= NOW() - INTERVAL '${parseInt(months)} months'
     GROUP BY EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date), TO_CHAR(transaction_date, 'Mon YYYY')
     ORDER BY year ASC, month ASC`,
    [userId]
  );

  return result.rows.map(row => ({
    year: row.year,
    month: row.month_label,
    monthLabel: row.month_label,
    income: parseFloat(row.income),
    expenses: parseFloat(row.expense),
    expense: parseFloat(row.expense),
    net: parseFloat(row.income) - parseFloat(row.expense),
  }));
};

const getBudgetVsActual = async (userId) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const result = await query(
    `SELECT
       bc.id,
       bc.category_name,
       bc.limit_amount,
       tc.icon,
       tc.color,
       COALESCE(
         (SELECT SUM(t.amount)
          FROM transactions t
          WHERE t.user_id = $1
            AND t.category_id = bc.category_id
            AND t.type = 'expense'
            AND t.status = 'completed'
            AND EXTRACT(MONTH FROM t.transaction_date) = $2
            AND EXTRACT(YEAR FROM t.transaction_date) = $3),
         0
       ) as actual_spent
     FROM budgets b
     JOIN budget_categories bc ON b.id = bc.budget_id
     LEFT JOIN transaction_categories tc ON bc.category_id = tc.id
     WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
     ORDER BY actual_spent DESC`,
    [userId, month, year]
  );

  return result.rows.map(row => ({
    id: row.id,
    category: row.category_name,
    categoryName: row.category_name,
    budget: parseFloat(row.limit_amount),
    actual: parseFloat(row.actual_spent),
    limitAmount: parseFloat(row.limit_amount),
    actualSpent: parseFloat(row.actual_spent),
    remaining: parseFloat(row.limit_amount) - parseFloat(row.actual_spent),
    percentUsed: row.limit_amount > 0
      ? Math.round((parseFloat(row.actual_spent) / parseFloat(row.limit_amount)) * 100)
      : 0,
    icon: row.icon,
    color: row.color,
  }));
};

module.exports = { getOverview, getSpendingByCategory, getMonthlyFlow, getBudgetVsActual };
