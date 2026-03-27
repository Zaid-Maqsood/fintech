const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/db');

const getBudgets = async (userId) => {
  const result = await query(
    `SELECT b.id, b.user_id, b.name, b.month, b.year, b.total_limit, b.notes, b.created_at, b.updated_at,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', bc.id,
                  'category_id', bc.category_id,
                  'category_name', bc.category_name,
                  'limit_amount', bc.limit_amount,
                  'spent_amount', COALESCE(
                    (SELECT SUM(t.amount) FROM banking.transactions t
                     LEFT JOIN banking.transaction_categories tc2 ON t.category_id = tc2.id
                     WHERE t.user_id = b.user_id
                       AND t.type = 'expense'
                       AND t.status = 'completed'
                       AND EXTRACT(MONTH FROM t.transaction_date) = b.month
                       AND EXTRACT(YEAR FROM t.transaction_date) = b.year
                       AND (
                         t.category_id = bc.category_id
                         OR (bc.category_id IS NULL AND LOWER(tc2.name) = LOWER(bc.category_name))
                       )
                    ), 0
                  ),
                  'icon', tc.icon,
                  'color', tc.color
                )
              ) FILTER (WHERE bc.id IS NOT NULL), '[]'
            ) as categories
     FROM banking.budgets b
     LEFT JOIN banking.budget_categories bc ON b.id = bc.budget_id
     LEFT JOIN banking.transaction_categories tc ON bc.category_id = tc.id
     WHERE b.user_id = $1
     GROUP BY b.id
     ORDER BY b.year DESC, b.month DESC`,
    [userId]
  );
  return result.rows;
};

const getBudgetById = async (id, userId) => {
  const result = await query(
    `SELECT b.id, b.user_id, b.name, b.month, b.year, b.total_limit, b.notes, b.created_at, b.updated_at,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', bc.id,
                  'category_id', bc.category_id,
                  'category_name', bc.category_name,
                  'limit_amount', bc.limit_amount,
                  'spent_amount', COALESCE(
                    (SELECT SUM(t.amount) FROM banking.transactions t
                     LEFT JOIN banking.transaction_categories tc2 ON t.category_id = tc2.id
                     WHERE t.user_id = b.user_id
                       AND t.type = 'expense'
                       AND t.status = 'completed'
                       AND EXTRACT(MONTH FROM t.transaction_date) = b.month
                       AND EXTRACT(YEAR FROM t.transaction_date) = b.year
                       AND (
                         t.category_id = bc.category_id
                         OR (bc.category_id IS NULL AND LOWER(tc2.name) = LOWER(bc.category_name))
                       )
                    ), 0
                  ),
                  'icon', tc.icon,
                  'color', tc.color
                )
              ) FILTER (WHERE bc.id IS NOT NULL), '[]'
            ) as categories
     FROM banking.budgets b
     LEFT JOIN banking.budget_categories bc ON b.id = bc.budget_id
     LEFT JOIN banking.transaction_categories tc ON bc.category_id = tc.id
     WHERE b.id = $1 AND b.user_id = $2
     GROUP BY b.id`,
    [id, userId]
  );
  if (!result.rows.length) {
    const err = new Error('Budget not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

const getCurrentBudget = async (userId) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const result = await query(
    `SELECT b.id, b.user_id, b.name, b.month, b.year, b.total_limit, b.notes, b.created_at, b.updated_at,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', bc.id,
                  'category_id', bc.category_id,
                  'category_name', bc.category_name,
                  'limit_amount', bc.limit_amount,
                  'spent_amount', COALESCE(
                    (SELECT SUM(t.amount) FROM banking.transactions t
                     LEFT JOIN banking.transaction_categories tc2 ON t.category_id = tc2.id
                     WHERE t.user_id = b.user_id
                       AND t.type = 'expense'
                       AND t.status = 'completed'
                       AND EXTRACT(MONTH FROM t.transaction_date) = b.month
                       AND EXTRACT(YEAR FROM t.transaction_date) = b.year
                       AND (
                         t.category_id = bc.category_id
                         OR (bc.category_id IS NULL AND LOWER(tc2.name) = LOWER(bc.category_name))
                       )
                    ), 0
                  ),
                  'icon', tc.icon,
                  'color', tc.color
                )
              ) FILTER (WHERE bc.id IS NOT NULL), '[]'
            ) as categories
     FROM banking.budgets b
     LEFT JOIN banking.budget_categories bc ON b.id = bc.budget_id
     LEFT JOIN banking.transaction_categories tc ON bc.category_id = tc.id
     WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
     GROUP BY b.id
     LIMIT 1`,
    [userId, month, year]
  );
  return result.rows[0] || null;
};

const createBudget = async (userId, data) => {
  const { name, month, year, totalLimit, notes, categories } = data;
  const budgetId = uuidv4();

  const result = await query(
    `INSERT INTO budgets (id, user_id, name, month, year, total_limit, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [budgetId, userId, name, month, year, totalLimit, notes || null]
  );
  const budget = result.rows[0];

  if (categories && categories.length > 0) {
    for (const cat of categories) {
      // Calculate actual spent amount
      let spent = 0;
      if (cat.categoryId) {
        const spentResult = await query(
          `SELECT COALESCE(SUM(amount), 0) as spent
           FROM transactions
           WHERE user_id = $1 AND category_id = $2 AND type = 'expense'
             AND EXTRACT(MONTH FROM transaction_date) = $3
             AND EXTRACT(YEAR FROM transaction_date) = $4`,
          [userId, cat.categoryId, month, year]
        );
        spent = parseFloat(spentResult.rows[0].spent);
      }

      await query(
        `INSERT INTO budget_categories (id, budget_id, category_id, category_name, limit_amount, spent_amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), budgetId, cat.categoryId || null, cat.categoryName || null, cat.limitAmount, spent]
      );
    }
  }

  return getBudgetById(budgetId, userId);
};

const updateBudget = async (id, userId, data) => {
  const { name, totalLimit, notes, categories } = data;

  const existing = await query('SELECT id FROM budgets WHERE id = $1 AND user_id = $2', [id, userId]);
  if (!existing.rows.length) {
    const err = new Error('Budget not found');
    err.status = 404;
    throw err;
  }

  await query(
    `UPDATE budgets
     SET name = COALESCE($1, name),
         total_limit = COALESCE($2, total_limit),
         notes = COALESCE($3, notes),
         updated_at = NOW()
     WHERE id = $4 AND user_id = $5`,
    [name || null, totalLimit || null, notes || null, id, userId]
  );

  if (categories && categories.length > 0) {
    // Delete existing budget categories and re-insert
    await query('DELETE FROM budget_categories WHERE budget_id = $1', [id]);
    const budgetResult = await query('SELECT month, year FROM budgets WHERE id = $1', [id]);
    const { month, year } = budgetResult.rows[0];

    for (const cat of categories) {
      let spent = 0;
      if (cat.categoryId) {
        const spentResult = await query(
          `SELECT COALESCE(SUM(amount), 0) as spent
           FROM transactions
           WHERE user_id = $1 AND category_id = $2 AND type = 'expense'
             AND EXTRACT(MONTH FROM transaction_date) = $3
             AND EXTRACT(YEAR FROM transaction_date) = $4`,
          [userId, cat.categoryId, month, year]
        );
        spent = parseFloat(spentResult.rows[0].spent);
      }
      await query(
        `INSERT INTO budget_categories (id, budget_id, category_id, category_name, limit_amount, spent_amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), id, cat.categoryId || null, cat.categoryName || null, cat.limitAmount, spent]
      );
    }
  }

  return getBudgetById(id, userId);
};

const deleteBudget = async (id, userId) => {
  const result = await query('DELETE FROM budgets WHERE id = $1 AND user_id = $2', [id, userId]);
  if (result.rowCount === 0) {
    const err = new Error('Budget not found');
    err.status = 404;
    throw err;
  }
  return { message: 'Budget deleted successfully' };
};

module.exports = { getBudgets, getBudgetById, getCurrentBudget, createBudget, updateBudget, deleteBudget };
