const { z } = require('zod');
const budgetsService = require('./budgets.service');

const budgetCategorySchema = z.object({
  categoryId: z.string().uuid().optional(),
  categoryName: z.string().optional(),
  limitAmount: z.number().positive(),
});

const createBudgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  totalLimit: z.number().positive('Total limit must be positive'),
  notes: z.string().optional(),
  categories: z.array(budgetCategorySchema).optional(),
});

const updateBudgetSchema = z.object({
  name: z.string().min(1).optional(),
  totalLimit: z.number().positive().optional(),
  notes: z.string().optional(),
  categories: z.array(budgetCategorySchema).optional(),
});

const getBudgets = async (req, res, next) => {
  try {
    const budgets = await budgetsService.getBudgets(req.user.id);
    return res.status(200).json(budgets);
  } catch (err) {
    next(err);
  }
};

const getCurrentBudget = async (req, res, next) => {
  try {
    const budget = await budgetsService.getCurrentBudget(req.user.id);
    if (!budget) return res.status(404).json({ error: 'No budget found for current month' });
    return res.status(200).json(budget);
  } catch (err) {
    next(err);
  }
};

const getBudget = async (req, res, next) => {
  try {
    const budget = await budgetsService.getBudgetById(req.params.id, req.user.id);
    return res.status(200).json(budget);
  } catch (err) {
    next(err);
  }
};

const createBudget = async (req, res, next) => {
  try {
    const parsed = createBudgetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const budget = await budgetsService.createBudget(req.user.id, parsed.data);
    return res.status(201).json(budget);
  } catch (err) {
    next(err);
  }
};

const updateBudget = async (req, res, next) => {
  try {
    const parsed = updateBudgetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const budget = await budgetsService.updateBudget(req.params.id, req.user.id, parsed.data);
    return res.status(200).json(budget);
  } catch (err) {
    next(err);
  }
};

const deleteBudget = async (req, res, next) => {
  try {
    const result = await budgetsService.deleteBudget(req.params.id, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { getBudgets, getCurrentBudget, getBudget, createBudget, updateBudget, deleteBudget };
