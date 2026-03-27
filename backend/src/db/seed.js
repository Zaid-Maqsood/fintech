require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool, schema } = require('../config/db');

const SALT_ROUNDS = 10;

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${schema},public`);
    console.log('Clearing existing data...');

    await client.query('DELETE FROM activity_logs');
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM budget_categories');
    await client.query('DELETE FROM budgets');
    await client.query('DELETE FROM transactions');
    await client.query('DELETE FROM transaction_categories');
    await client.query('DELETE FROM accounts');
    await client.query('DELETE FROM refresh_tokens');
    await client.query('DELETE FROM password_reset_tokens');
    await client.query('DELETE FROM users');

    console.log('Seeding transaction categories...');
    const categories = [
      { name: 'Salary', type: 'income', icon: 'briefcase', color: '#22c55e' },
      { name: 'Freelance', type: 'income', icon: 'laptop', color: '#10b981' },
      { name: 'Groceries', type: 'expense', icon: 'shopping-cart', color: '#f97316' },
      { name: 'Utilities', type: 'expense', icon: 'zap', color: '#eab308' },
      { name: 'Rent', type: 'expense', icon: 'home', color: '#ef4444' },
      { name: 'Subscriptions', type: 'expense', icon: 'repeat', color: '#8b5cf6' },
      { name: 'Travel', type: 'expense', icon: 'plane', color: '#06b6d4' },
      { name: 'Shopping', type: 'expense', icon: 'bag', color: '#ec4899' },
      { name: 'Health', type: 'expense', icon: 'heart', color: '#f43f5e' },
      { name: 'Savings', type: 'transfer', icon: 'piggy-bank', color: '#3b82f6' },
      { name: 'Transfers', type: 'transfer', icon: 'arrow-right-left', color: '#6366f1' },
      { name: 'Entertainment', type: 'expense', icon: 'tv', color: '#a855f7' },
      { name: 'Dining', type: 'expense', icon: 'utensils', color: '#f59e0b' },
      { name: 'Other', type: 'expense', icon: 'circle', color: '#6b7280' },
    ];

    const categoryIds = {};
    for (const cat of categories) {
      const id = uuidv4();
      categoryIds[cat.name] = id;
      await client.query(
        `INSERT INTO transaction_categories (id, name, type, icon, color) VALUES ($1, $2, $3, $4, $5)`,
        [id, cat.name, cat.type, cat.icon, cat.color]
      );
    }
    console.log(`Seeded ${categories.length} categories`);

    console.log('Seeding users...');
    const adminPassword = await bcrypt.hash('Admin@123', SALT_ROUNDS);
    const userPassword = await bcrypt.hash('User@123', SALT_ROUNDS);

    const usersData = [
      {
        id: uuidv4(),
        email: 'admin@fintech.com',
        password_hash: adminPassword,
        full_name: 'Admin User',
        phone: '+1-555-000-0001',
        role: 'admin',
        kyc_status: 'verified',
        checking_balance: 25000.00,
        savings_balance: 8000.00,
      },
      {
        id: uuidv4(),
        email: 'alice@example.com',
        password_hash: userPassword,
        full_name: 'Alice Johnson',
        phone: '+1-555-100-0001',
        role: 'user',
        kyc_status: 'verified',
        checking_balance: 12450.00,
        savings_balance: 3200.00,
      },
      {
        id: uuidv4(),
        email: 'bob@example.com',
        password_hash: userPassword,
        full_name: 'Bob Smith',
        phone: '+1-555-200-0002',
        role: 'user',
        kyc_status: 'verified',
        checking_balance: 8900.00,
        savings_balance: 1500.00,
      },
      {
        id: uuidv4(),
        email: 'carol@example.com',
        password_hash: userPassword,
        full_name: 'Carol Williams',
        phone: '+1-555-300-0003',
        role: 'user',
        kyc_status: 'pending',
        checking_balance: 15600.00,
        savings_balance: 5400.00,
      },
      {
        id: uuidv4(),
        email: 'david@example.com',
        password_hash: userPassword,
        full_name: 'David Brown',
        phone: '+1-555-400-0004',
        role: 'user',
        kyc_status: 'not_submitted',
        checking_balance: 6200.00,
        savings_balance: 2100.00,
      },
    ];

    for (const u of usersData) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, phone, role, kyc_status, account_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
        [u.id, u.email, u.password_hash, u.full_name, u.phone, u.role, u.kyc_status]
      );
    }
    console.log(`Seeded ${usersData.length} users`);

    console.log('Seeding accounts...');
    const accountIds = {};
    for (const u of usersData) {
      const checkingId = uuidv4();
      const savingsId = uuidv4();
      accountIds[u.id] = { checking: checkingId, savings: savingsId };

      const checkingNum = `CHK${Math.floor(Math.random() * 900000000 + 100000000)}`;
      const savingsNum = `SAV${Math.floor(Math.random() * 900000000 + 100000000)}`;

      await client.query(
        `INSERT INTO accounts (id, user_id, name, type, balance, currency, status, account_number)
         VALUES ($1, $2, $3, 'checking', $4, 'USD', 'active', $5)`,
        [checkingId, u.id, 'Primary Checking', u.checking_balance, checkingNum]
      );
      await client.query(
        `INSERT INTO accounts (id, user_id, name, type, balance, currency, status, account_number)
         VALUES ($1, $2, $3, 'savings', $4, 'USD', 'active', $5)`,
        [savingsId, u.id, 'Savings Account', u.savings_balance, savingsNum]
      );
    }
    console.log(`Seeded accounts for all users`);

    console.log('Seeding transactions...');
    const now = new Date();

    const transactionTemplates = {
      income: [
        { desc: 'Monthly Salary', category: 'Salary', amount: [3500, 6000], method: 'bank_transfer' },
        { desc: 'Freelance Project Payment', category: 'Freelance', amount: [500, 2000], method: 'bank_transfer' },
        { desc: 'Consulting Fee', category: 'Freelance', amount: [800, 1500], method: 'bank_transfer' },
        { desc: 'Bonus Payment', category: 'Salary', amount: [500, 2000], method: 'bank_transfer' },
      ],
      expense: [
        { desc: 'Grocery Store', category: 'Groceries', amount: [50, 200], method: 'debit_card' },
        { desc: 'Electric Bill', category: 'Utilities', amount: [80, 180], method: 'auto_pay' },
        { desc: 'Internet Service', category: 'Utilities', amount: [50, 100], method: 'auto_pay' },
        { desc: 'Monthly Rent', category: 'Rent', amount: [1200, 2000], method: 'bank_transfer' },
        { desc: 'Netflix Subscription', category: 'Subscriptions', amount: [15, 20], method: 'credit_card' },
        { desc: 'Spotify Premium', category: 'Subscriptions', amount: [10, 15], method: 'credit_card' },
        { desc: 'Gym Membership', category: 'Subscriptions', amount: [30, 60], method: 'credit_card' },
        { desc: 'Flight Ticket', category: 'Travel', amount: [200, 600], method: 'credit_card' },
        { desc: 'Hotel Stay', category: 'Travel', amount: [100, 400], method: 'credit_card' },
        { desc: 'Amazon Purchase', category: 'Shopping', amount: [30, 200], method: 'credit_card' },
        { desc: 'Clothing Store', category: 'Shopping', amount: [50, 300], method: 'debit_card' },
        { desc: 'Doctor Visit', category: 'Health', amount: [50, 200], method: 'debit_card' },
        { desc: 'Pharmacy', category: 'Health', amount: [20, 80], method: 'debit_card' },
        { desc: 'Restaurant Dinner', category: 'Dining', amount: [30, 120], method: 'credit_card' },
        { desc: 'Coffee Shop', category: 'Dining', amount: [5, 25], method: 'debit_card' },
        { desc: 'Movie Tickets', category: 'Entertainment', amount: [20, 60], method: 'credit_card' },
        { desc: 'Concert Tickets', category: 'Entertainment', amount: [50, 200], method: 'credit_card' },
        { desc: 'Gas Station', category: 'Other', amount: [30, 80], method: 'debit_card' },
        { desc: 'Car Insurance', category: 'Other', amount: [100, 200], method: 'auto_pay' },
      ],
      transfer: [
        { desc: 'Transfer to Savings', category: 'Savings', amount: [100, 500], method: 'internal' },
        { desc: 'Internal Transfer', category: 'Transfers', amount: [200, 1000], method: 'internal' },
      ],
    };

    for (const u of usersData) {
      const accs = accountIds[u.id];
      let txCount = 0;

      // Add monthly salary for past 3 months
      for (let m = 0; m < 3; m++) {
        const salaryDate = new Date(now);
        salaryDate.setMonth(salaryDate.getMonth() - m);
        salaryDate.setDate(1);
        const salaryAmount = u.role === 'admin' ? 6000.00 : randomBetween(3500, 5500);
        await client.query(
          `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, currency, description, status, payment_method, transaction_date)
           VALUES ($1, $2, $3, $4, 'income', $5, 'USD', $6, 'completed', 'bank_transfer', $7)`,
          [uuidv4(), u.id, accs.checking, categoryIds['Salary'], salaryAmount, 'Monthly Salary', salaryDate.toISOString()]
        );
        txCount++;
      }

      // Add monthly rent for past 3 months
      for (let m = 0; m < 3; m++) {
        const rentDate = new Date(now);
        rentDate.setMonth(rentDate.getMonth() - m);
        rentDate.setDate(5);
        const rentAmount = u.role === 'admin' ? 1800.00 : randomBetween(1200, 1800);
        await client.query(
          `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, currency, description, status, payment_method, transaction_date)
           VALUES ($1, $2, $3, $4, 'expense', $5, 'USD', $6, 'completed', 'bank_transfer', $7)`,
          [uuidv4(), u.id, accs.checking, categoryIds['Rent'], rentAmount, 'Monthly Rent', rentDate.toISOString()]
        );
        txCount++;
      }

      // Add various expenses over past 90 days
      const expenseTemplates = transactionTemplates.expense;
      for (let i = 0; i < 28; i++) {
        const tmpl = randomElement(expenseTemplates);
        const daysBack = Math.floor(Math.random() * 90);
        const txDate = new Date(now);
        txDate.setDate(txDate.getDate() - daysBack);
        const amount = randomBetween(tmpl.amount[0], tmpl.amount[1]);
        const accountId = Math.random() > 0.3 ? accs.checking : accs.savings;
        await client.query(
          `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, currency, description, status, payment_method, transaction_date)
           VALUES ($1, $2, $3, $4, 'expense', $5, 'USD', $6, 'completed', $7, $8)`,
          [uuidv4(), u.id, accountId, categoryIds[tmpl.category], amount, tmpl.desc, tmpl.method, txDate.toISOString()]
        );
        txCount++;
      }

      // Add freelance income entries
      for (let i = 0; i < 2; i++) {
        const daysBack = Math.floor(Math.random() * 60) + 5;
        const txDate = new Date(now);
        txDate.setDate(txDate.getDate() - daysBack);
        const amount = randomBetween(500, 1800);
        await client.query(
          `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, currency, description, status, payment_method, transaction_date)
           VALUES ($1, $2, $3, $4, 'income', $5, 'USD', $6, 'completed', 'bank_transfer', $7)`,
          [uuidv4(), u.id, accs.checking, categoryIds['Freelance'], amount, 'Freelance Project Payment', txDate.toISOString()]
        );
        txCount++;
      }

      // Add savings transfers
      for (let i = 0; i < 3; i++) {
        const daysBack = Math.floor(Math.random() * 90) + 1;
        const txDate = new Date(now);
        txDate.setDate(txDate.getDate() - daysBack);
        const amount = randomBetween(100, 500);
        await client.query(
          `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, currency, description, status, payment_method, transaction_date)
           VALUES ($1, $2, $3, $4, 'transfer', $5, 'USD', $6, 'completed', 'internal', $7)`,
          [uuidv4(), u.id, accs.checking, categoryIds['Savings'], amount, 'Transfer to Savings', txDate.toISOString()]
        );
        txCount++;
      }

      console.log(`  Seeded ${txCount} transactions for ${u.full_name}`);
    }

    console.log('Seeding budgets...');
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Budget for Alice
    const aliceUser = usersData.find(u => u.email === 'alice@example.com');
    const aliceBudgetId = uuidv4();
    await client.query(
      `INSERT INTO budgets (id, user_id, name, month, year, total_limit, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [aliceBudgetId, aliceUser.id, 'March Budget', currentMonth, currentYear, 3500.00, 'Monthly spending plan']
    );

    const aliceBudgetCategories = [
      { category: 'Groceries', limit: 400.00 },
      { category: 'Dining', limit: 300.00 },
      { category: 'Entertainment', limit: 150.00 },
      { category: 'Shopping', limit: 500.00 },
      { category: 'Utilities', limit: 200.00 },
      { category: 'Travel', limit: 600.00 },
      { category: 'Health', limit: 200.00 },
      { category: 'Subscriptions', limit: 100.00 },
    ];

    for (const bc of aliceBudgetCategories) {
      const spentResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) as spent
         FROM transactions
         WHERE user_id = $1
           AND category_id = $2
           AND type = 'expense'
           AND EXTRACT(MONTH FROM transaction_date) = $3
           AND EXTRACT(YEAR FROM transaction_date) = $4`,
        [aliceUser.id, categoryIds[bc.category], currentMonth, currentYear]
      );
      const spent = parseFloat(spentResult.rows[0].spent);
      await client.query(
        `INSERT INTO budget_categories (id, budget_id, category_id, category_name, limit_amount, spent_amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), aliceBudgetId, categoryIds[bc.category], bc.category, bc.limit, spent]
      );
    }

    // Budget for Bob
    const bobUser = usersData.find(u => u.email === 'bob@example.com');
    const bobBudgetId = uuidv4();
    await client.query(
      `INSERT INTO budgets (id, user_id, name, month, year, total_limit, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [bobBudgetId, bobUser.id, 'March Budget', currentMonth, currentYear, 2800.00, 'Tight budget month']
    );

    const bobBudgetCategories = [
      { category: 'Groceries', limit: 350.00 },
      { category: 'Dining', limit: 200.00 },
      { category: 'Entertainment', limit: 100.00 },
      { category: 'Shopping', limit: 300.00 },
      { category: 'Utilities', limit: 180.00 },
      { category: 'Subscriptions', limit: 80.00 },
      { category: 'Health', limit: 150.00 },
    ];

    for (const bc of bobBudgetCategories) {
      const spentResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) as spent
         FROM transactions
         WHERE user_id = $1
           AND category_id = $2
           AND type = 'expense'
           AND EXTRACT(MONTH FROM transaction_date) = $3
           AND EXTRACT(YEAR FROM transaction_date) = $4`,
        [bobUser.id, categoryIds[bc.category], currentMonth, currentYear]
      );
      const spent = parseFloat(spentResult.rows[0].spent);
      await client.query(
        `INSERT INTO budget_categories (id, budget_id, category_id, category_name, limit_amount, spent_amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), bobBudgetId, categoryIds[bc.category], bc.category, bc.limit, spent]
      );
    }
    console.log('Seeded budgets for Alice and Bob');

    console.log('Seeding payments...');
    const aliceAccs = accountIds[aliceUser.id];
    const bobAccs = accountIds[bobUser.id];
    const carolUser = usersData.find(u => u.email === 'carol@example.com');
    const carolAccs = accountIds[carolUser.id];
    const davidUser = usersData.find(u => u.email === 'david@example.com');
    const davidAccs = accountIds[davidUser.id];
    const adminUser = usersData.find(u => u.email === 'admin@fintech.com');
    const adminAccs = accountIds[adminUser.id];

    const paymentsData = [
      {
        id: uuidv4(),
        sender: aliceUser,
        sender_acc: aliceAccs.checking,
        receiver: bobUser,
        receiver_acc: bobAccs.checking,
        amount: 250.00,
        description: 'Dinner split',
        status: 'completed',
        days_ago: 5,
      },
      {
        id: uuidv4(),
        sender: bobUser,
        sender_acc: bobAccs.checking,
        receiver: carolUser,
        receiver_acc: carolAccs.checking,
        amount: 150.00,
        description: 'Shared utilities',
        status: 'completed',
        days_ago: 10,
      },
      {
        id: uuidv4(),
        sender: carolUser,
        sender_acc: carolAccs.checking,
        receiver: aliceUser,
        receiver_acc: aliceAccs.checking,
        amount: 80.00,
        description: 'Coffee and snacks',
        status: 'completed',
        days_ago: 15,
      },
      {
        id: uuidv4(),
        sender: davidUser,
        sender_acc: davidAccs.checking,
        receiver: bobUser,
        receiver_acc: bobAccs.checking,
        amount: 500.00,
        description: 'Rent contribution',
        status: 'pending',
        days_ago: 1,
      },
      {
        id: uuidv4(),
        sender: aliceUser,
        sender_acc: aliceAccs.checking,
        receiver: carolUser,
        receiver_acc: carolAccs.checking,
        amount: 320.00,
        description: 'Concert tickets',
        status: 'failed',
        days_ago: 20,
      },
      {
        id: uuidv4(),
        sender: bobUser,
        sender_acc: bobAccs.checking,
        receiver: davidUser,
        receiver_acc: davidAccs.checking,
        amount: 200.00,
        description: 'Groceries reimbursement',
        status: 'completed',
        days_ago: 8,
      },
      {
        id: uuidv4(),
        sender: carolUser,
        sender_acc: carolAccs.checking,
        receiver: adminUser,
        receiver_acc: adminAccs.checking,
        amount: 1000.00,
        description: 'Investment contribution',
        status: 'completed',
        days_ago: 12,
      },
    ];

    for (const p of paymentsData) {
      const refId = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const payDate = new Date(now);
      payDate.setDate(payDate.getDate() - p.days_ago);
      const completedAt = p.status === 'completed' ? payDate.toISOString() : null;

      await client.query(
        `INSERT INTO payments (id, sender_id, receiver_id, sender_account_id, receiver_account_id, amount, currency, status, reference_id, description, payment_date, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'USD', $7, $8, $9, $10, $11)`,
        [p.id, p.sender.id, p.receiver.id, p.sender_acc, p.receiver_acc, p.amount, p.status, refId, p.description, payDate.toISOString(), completedAt]
      );

      // Create transaction records for completed payments
      if (p.status === 'completed') {
        await client.query(
          `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, currency, description, status, payment_method, reference_id, transaction_date)
           VALUES ($1, $2, $3, $4, 'expense', $5, 'USD', $6, 'completed', 'bank_transfer', $7, $8)`,
          [uuidv4(), p.sender.id, p.sender_acc, categoryIds['Transfers'], p.amount, `Payment to ${p.receiver.full_name}: ${p.description}`, refId, payDate.toISOString()]
        );
        await client.query(
          `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, currency, description, status, payment_method, reference_id, transaction_date)
           VALUES ($1, $2, $3, $4, 'income', $5, 'USD', $6, 'completed', 'bank_transfer', $7, $8)`,
          [uuidv4(), p.receiver.id, p.receiver_acc, categoryIds['Transfers'], p.amount, `Payment from ${p.sender.full_name}: ${p.description}`, refId, payDate.toISOString()]
        );
      }
    }
    console.log(`Seeded ${paymentsData.length} payments`);

    console.log('Seeding notifications...');
    const notificationsData = [];

    for (const u of usersData) {
      notificationsData.push(
        {
          id: uuidv4(),
          user_id: u.id,
          type: 'welcome',
          title: 'Welcome to Fintech!',
          message: `Hello ${u.full_name}, your account is ready. Start managing your finances today.`,
          data: JSON.stringify({ action: 'go_to_dashboard' }),
          is_read: false,
          created_at: daysAgo(30),
        },
        {
          id: uuidv4(),
          user_id: u.id,
          type: 'transaction',
          title: 'Salary Received',
          message: `Your monthly salary has been credited to your account.`,
          data: JSON.stringify({ type: 'income', category: 'Salary' }),
          is_read: true,
          created_at: daysAgo(25),
        },
        {
          id: uuidv4(),
          user_id: u.id,
          type: 'security',
          title: 'New Login Detected',
          message: `A new login was detected on your account from a new device.`,
          data: JSON.stringify({ device: 'Chrome Browser', location: 'New York, US' }),
          is_read: false,
          created_at: daysAgo(3),
        }
      );
    }

    // Extra notifications for specific users
    notificationsData.push(
      {
        id: uuidv4(),
        user_id: aliceUser.id,
        type: 'budget',
        title: 'Budget Alert',
        message: 'You have used 80% of your Dining budget for this month.',
        data: JSON.stringify({ category: 'Dining', percent_used: 80 }),
        is_read: false,
        created_at: daysAgo(2),
      },
      {
        id: uuidv4(),
        user_id: bobUser.id,
        type: 'payment',
        title: 'Payment Received',
        message: 'You received $200.00 from David Brown for groceries reimbursement.',
        data: JSON.stringify({ amount: 200, from: 'David Brown' }),
        is_read: false,
        created_at: daysAgo(8),
      },
      {
        id: uuidv4(),
        user_id: carolUser.id,
        type: 'kyc',
        title: 'KYC Verification Pending',
        message: 'Your KYC verification is under review. We will notify you once complete.',
        data: JSON.stringify({ status: 'pending' }),
        is_read: false,
        created_at: daysAgo(5),
      },
      {
        id: uuidv4(),
        user_id: davidUser.id,
        type: 'kyc',
        title: 'Complete Your KYC',
        message: 'Please submit your identity documents to unlock all features.',
        data: JSON.stringify({ action: 'submit_kyc' }),
        is_read: false,
        created_at: daysAgo(7),
      },
      {
        id: uuidv4(),
        user_id: adminUser.id,
        type: 'admin',
        title: 'New User Registration',
        message: '5 new users registered this week.',
        data: JSON.stringify({ count: 5 }),
        is_read: false,
        created_at: daysAgo(1),
      }
    );

    for (const n of notificationsData) {
      await client.query(
        `INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [n.id, n.user_id, n.type, n.title, n.message, n.data, n.is_read, n.created_at]
      );
    }
    console.log(`Seeded ${notificationsData.length} notifications`);

    console.log('Seeding activity logs...');
    const activityLogs = [];

    for (const u of usersData) {
      activityLogs.push(
        {
          id: uuidv4(),
          user_id: u.id,
          action: 'user.register',
          entity_type: 'user',
          entity_id: u.id,
          metadata: JSON.stringify({ email: u.email }),
          ip_address: '127.0.0.1',
          created_at: daysAgo(30),
        },
        {
          id: uuidv4(),
          user_id: u.id,
          action: 'user.login',
          entity_type: 'user',
          entity_id: u.id,
          metadata: JSON.stringify({ method: 'email_password' }),
          ip_address: '127.0.0.1',
          created_at: daysAgo(1),
        },
        {
          id: uuidv4(),
          user_id: u.id,
          action: 'transaction.create',
          entity_type: 'transaction',
          entity_id: null,
          metadata: JSON.stringify({ type: 'expense', amount: randomBetween(50, 200) }),
          ip_address: '127.0.0.1',
          created_at: daysAgo(2),
        }
      );
    }

    // Admin-specific logs
    activityLogs.push(
      {
        id: uuidv4(),
        user_id: adminUser.id,
        action: 'admin.view_users',
        entity_type: 'user',
        entity_id: null,
        metadata: JSON.stringify({ filters: {} }),
        ip_address: '127.0.0.1',
        created_at: daysAgo(0),
      },
      {
        id: uuidv4(),
        user_id: adminUser.id,
        action: 'admin.flag_transaction',
        entity_type: 'transaction',
        entity_id: null,
        metadata: JSON.stringify({ reason: 'suspicious_amount' }),
        ip_address: '127.0.0.1',
        created_at: daysAgo(3),
      }
    );

    for (const log of activityLogs) {
      await client.query(
        `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, metadata, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [log.id, log.user_id, log.action, log.entity_type, log.entity_id || null, log.metadata, log.ip_address, log.created_at]
      );
    }
    console.log(`Seeded ${activityLogs.length} activity logs`);

    console.log('\nSeed completed successfully!');
    console.log('\nDemo credentials:');
    console.log('  Admin: admin@fintech.com / Admin@123');
    console.log('  Users: alice@example.com, bob@example.com, carol@example.com, david@example.com / User@123');
  } catch (err) {
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
