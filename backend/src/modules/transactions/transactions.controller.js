const { z } = require('zod');
const txService = require('./transactions.service');

const createTransactionSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().max(10).optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'completed', 'failed', 'cancelled']).optional(),
  paymentMethod: z.string().optional(),
  referenceId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  transactionDate: z.string().optional(),
});

const updateTransactionSchema = z.object({
  categoryId: z.string().uuid().optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'completed', 'failed', 'cancelled']).optional(),
  paymentMethod: z.string().optional(),
  tags: z.array(z.string()).optional(),
  transactionDate: z.string().optional(),
});

const getTransactions = async (req, res, next) => {
  try {
    const result = await txService.getTransactions(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const getTransaction = async (req, res, next) => {
  try {
    const tx = await txService.getTransactionById(req.params.id, req.user.id);
    return res.status(200).json(tx);
  } catch (err) {
    next(err);
  }
};

const createTransaction = async (req, res, next) => {
  try {
    const parsed = createTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const tx = await txService.createTransaction(req.user.id, parsed.data);
    return res.status(201).json(tx);
  } catch (err) {
    next(err);
  }
};

const updateTransaction = async (req, res, next) => {
  try {
    const parsed = updateTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const tx = await txService.updateTransaction(req.params.id, req.user.id, parsed.data);
    return res.status(200).json(tx);
  } catch (err) {
    next(err);
  }
};

const deleteTransaction = async (req, res, next) => {
  try {
    const result = await txService.deleteTransaction(req.params.id, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await txService.getCategories();
    return res.status(200).json(categories);
  } catch (err) {
    next(err);
  }
};

module.exports = { getTransactions, getTransaction, createTransaction, updateTransaction, deleteTransaction, getCategories };
