const { z } = require('zod');
const paymentsService = require('./payments.service');

const sendPaymentSchema = z.object({
  receiverId: z.string().uuid().optional(),
  receiverEmail: z.string().email().optional(),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional(),
}).refine(data => data.receiverId || data.receiverEmail, {
  message: 'Either receiverId or receiverEmail is required',
});

const getPayments = async (req, res, next) => {
  try {
    const payments = await paymentsService.getPayments(req.user.id);
    return res.status(200).json(payments);
  } catch (err) {
    next(err);
  }
};

const getPayment = async (req, res, next) => {
  try {
    const payment = await paymentsService.getPaymentById(req.params.id, req.user.id);
    return res.status(200).json(payment);
  } catch (err) {
    next(err);
  }
};

const sendPayment = async (req, res, next) => {
  try {
    const parsed = sendPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const payment = await paymentsService.sendPayment(req.user.id, parsed.data);
    return res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
};

module.exports = { getPayments, getPayment, sendPayment };
