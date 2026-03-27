const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/db');

const generateAccessToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

const storeRefreshToken = async (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await query(
    'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
    [uuidv4(), userId, token, expiresAt.toISOString()]
  );
};

const register = async (email, password, fullName, phone) => {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length) {
    const err = new Error('Email already in use');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = uuidv4();

  const userResult = await query(
    `INSERT INTO users (id, email, password_hash, full_name, phone, role, account_status, kyc_status)
     VALUES ($1, $2, $3, $4, $5, 'user', 'active', 'not_submitted')
     RETURNING id, email, full_name, phone, role, account_status, kyc_status, created_at`,
    [userId, email.toLowerCase(), passwordHash, fullName, phone || null]
  );
  const user = userResult.rows[0];

  // Create default checking account
  const checkingNum = `CHK${Math.floor(Math.random() * 900000000 + 100000000)}`;
  await query(
    `INSERT INTO accounts (id, user_id, name, type, balance, currency, status, account_number)
     VALUES ($1, $2, 'Primary Checking', 'checking', 0.00, 'USD', 'active', $3)`,
    [uuidv4(), userId, checkingNum]
  );

  // Create default savings account
  const savingsNum = `SAV${Math.floor(Math.random() * 900000000 + 100000000)}`;
  await query(
    `INSERT INTO accounts (id, user_id, name, type, balance, currency, status, account_number)
     VALUES ($1, $2, 'Savings Account', 'savings', 0.00, 'USD', 'active', $3)`,
    [uuidv4(), userId, savingsNum]
  );

  // Welcome notification
  await query(
    `INSERT INTO notifications (id, user_id, type, title, message, data)
     VALUES ($1, $2, 'welcome', 'Welcome to Fintech!', $3, $4)`,
    [uuidv4(), userId, `Hello ${fullName}, your account is ready. Start managing your finances today.`, JSON.stringify({ action: 'go_to_dashboard' })]
  );

  // Activity log
  await query(
    `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, 'user.register', 'user', $3, $4)`,
    [uuidv4(), userId, userId, JSON.stringify({ email })]
  );

  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const refreshToken = generateRefreshToken(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return { user, accessToken, refreshToken };
};

const login = async (email, password) => {
  const result = await query(
    'SELECT id, email, password_hash, full_name, role, account_status, kyc_status, avatar_url FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  if (!result.rows.length) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }
  const user = result.rows[0];
  if (user.account_status !== 'active') {
    const err = new Error('Account is suspended or inactive');
    err.status = 403;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const refreshToken = generateRefreshToken(user.id);
  await storeRefreshToken(user.id, refreshToken);

  // Activity log
  await query(
    `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, 'user.login', 'user', $3, $4)`,
    [uuidv4(), user.id, user.id, JSON.stringify({ method: 'email_password' })]
  );

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
};

const logout = async (refreshToken) => {
  await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  return { message: 'Logged out successfully' };
};

const refreshToken = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    const error = new Error('Invalid or expired refresh token');
    error.status = 401;
    throw error;
  }

  const stored = await query(
    'SELECT id FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
    [token, decoded.userId]
  );
  if (!stored.rows.length) {
    const err = new Error('Refresh token not found or expired');
    err.status = 401;
    throw err;
  }

  const userResult = await query(
    'SELECT id, email, role, account_status FROM users WHERE id = $1',
    [decoded.userId]
  );
  if (!userResult.rows.length) {
    const err = new Error('User not found');
    err.status = 401;
    throw err;
  }
  const user = userResult.rows[0];
  if (user.account_status !== 'active') {
    const err = new Error('Account suspended');
    err.status = 403;
    throw err;
  }

  const accessToken = generateAccessToken(user.id, user.email, user.role);
  return { accessToken };
};

const forgotPassword = async (email) => {
  const result = await query('SELECT id, email, full_name FROM users WHERE email = $1', [email.toLowerCase()]);
  if (!result.rows.length) {
    // Return success even if user not found to prevent email enumeration
    return { message: 'If that email is registered, a reset link has been sent.' };
  }
  const user = result.rows[0];

  // Invalidate existing tokens
  await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  await query(
    'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
    [uuidv4(), user.id, token, expiresAt.toISOString()]
  );

  // In a real app, this would send an email. For demo, return the token.
  return {
    message: 'If that email is registered, a reset link has been sent.',
    resetToken: token, // Only for demo purposes
  };
};

const resetPassword = async (token, newPassword) => {
  const result = await query(
    `SELECT prt.id, prt.user_id FROM password_reset_tokens prt
     WHERE prt.token = $1 AND prt.expires_at > NOW() AND prt.used = FALSE`,
    [token]
  );
  if (!result.rows.length) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }
  const { id: tokenId, user_id } = result.rows[0];

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, user_id]
  );
  await query(
    'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
    [tokenId]
  );
  // Invalidate all refresh tokens
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [user_id]);

  return { message: 'Password reset successfully' };
};

module.exports = { register, login, logout, refreshToken, forgotPassword, resetPassword };
