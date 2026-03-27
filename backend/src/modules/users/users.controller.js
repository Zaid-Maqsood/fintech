const { z } = require('zod');
const usersService = require('./users.service');

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  currencyPreference: z.string().max(10).optional(),
  timezone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const getMe = async (req, res, next) => {
  try {
    const profile = await usersService.getProfile(req.user.id);
    return res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const result = await usersService.updateProfile(req.user.id, parsed.data);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const result = await usersService.changePassword(req.user.id, parsed.data.currentPassword, parsed.data.newPassword);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const getRecipients = async (req, res, next) => {
  try {
    const recipients = await usersService.getRecipients(req.user.id);
    return res.status(200).json(recipients);
  } catch (err) {
    next(err);
  }
};

module.exports = { getMe, updateMe, changePassword, getRecipients };
