require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: false,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter, require('./modules/auth/auth.routes'));
app.use('/api/users', require('./middleware/auth').authenticate, require('./modules/users/users.routes'));
app.use('/api/accounts', require('./middleware/auth').authenticate, require('./modules/accounts/accounts.routes'));
app.use('/api/transactions', require('./middleware/auth').authenticate, require('./modules/transactions/transactions.routes'));
app.use('/api/budgets', require('./middleware/auth').authenticate, require('./modules/budgets/budgets.routes'));
app.use('/api/payments', require('./middleware/auth').authenticate, require('./modules/payments/payments.routes'));
app.use('/api/analytics', require('./middleware/auth').authenticate, require('./modules/analytics/analytics.routes'));
app.use('/api/admin', require('./middleware/auth').authenticate, require('./modules/admin/admin.routes'));
app.use('/api/notifications', require('./middleware/auth').authenticate, require('./modules/notifications/notifications.routes'));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use(errorHandler);

module.exports = app;
