const { v4: uuidv4 } = require('uuid');
const { query, pool } = require('../../config/db');
const schema = process.env.DB_SCHEMA || 'banking';

const sendPayment = async (senderId, data) => {
  const { receiverId, amount, description, receiverEmail } = data;

  // Find receiver
  let actualReceiverId = receiverId;
  if (!receiverId && receiverEmail) {
    const receiverResult = await query('SELECT id FROM users WHERE email = $1', [receiverEmail.toLowerCase()]);
    if (!receiverResult.rows.length) {
      const err = new Error('Receiver not found');
      err.status = 404;
      throw err;
    }
    actualReceiverId = receiverResult.rows[0].id;
  }

  if (!actualReceiverId) {
    const err = new Error('Receiver ID or email is required');
    err.status = 400;
    throw err;
  }

  if (senderId === actualReceiverId) {
    const err = new Error('Cannot send payment to yourself');
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${schema},public`);
    await client.query('BEGIN');

    // Get sender's primary checking account
    const senderAccResult = await client.query(
      `SELECT id, balance FROM accounts WHERE user_id = $1 AND type = 'checking' AND status = 'active' ORDER BY created_at ASC LIMIT 1`,
      [senderId]
    );
    if (!senderAccResult.rows.length) {
      const err = new Error('No active checking account found for sender');
      err.status = 400;
      throw err;
    }
    const senderAccount = senderAccResult.rows[0];

    if (parseFloat(senderAccount.balance) < parseFloat(amount)) {
      const err = new Error('Insufficient balance');
      err.status = 400;
      throw err;
    }

    // Get receiver's primary checking account
    const receiverAccResult = await client.query(
      `SELECT id, balance FROM accounts WHERE user_id = $1 AND type = 'checking' AND status = 'active' ORDER BY created_at ASC LIMIT 1`,
      [actualReceiverId]
    );
    if (!receiverAccResult.rows.length) {
      const err = new Error('Receiver has no active checking account');
      err.status = 400;
      throw err;
    }
    const receiverAccount = receiverAccResult.rows[0];

    // Deduct from sender
    await client.query(
      'UPDATE accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
      [parseFloat(amount), senderAccount.id]
    );

    // Add to receiver
    await client.query(
      'UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [parseFloat(amount), receiverAccount.id]
    );

    const refId = `PAY-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const paymentId = uuidv4();
    const now = new Date().toISOString();

    // Create payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (id, sender_id, receiver_id, sender_account_id, receiver_account_id, amount, currency, status, reference_id, description, payment_date, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'USD', 'completed', $7, $8, $9, $10)
       RETURNING *`,
      [paymentId, senderId, actualReceiverId, senderAccount.id, receiverAccount.id, parseFloat(amount), refId, description || null, now, now]
    );
    const payment = paymentResult.rows[0];

    // Get user names for transaction descriptions
    const senderInfo = await client.query('SELECT full_name FROM users WHERE id = $1', [senderId]);
    const receiverInfo = await client.query('SELECT full_name FROM users WHERE id = $1', [actualReceiverId]);
    const senderName = senderInfo.rows[0].full_name;
    const receiverName = receiverInfo.rows[0].full_name;

    // Get transfer category
    const catResult = await client.query(`SELECT id FROM transaction_categories WHERE name = 'Transfers' LIMIT 1`);
    const categoryId = catResult.rows.length ? catResult.rows[0].id : null;

    // Create expense transaction for sender
    await client.query(
      `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, currency, description, status, payment_method, reference_id, transaction_date)
       VALUES ($1, $2, $3, $4, 'expense', $5, 'USD', $6, 'completed', 'bank_transfer', $7, $8)`,
      [uuidv4(), senderId, senderAccount.id, categoryId, parseFloat(amount),
       `Payment to ${receiverName}${description ? ': ' + description : ''}`, refId, now]
    );

    // Create income transaction for receiver
    await client.query(
      `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, currency, description, status, payment_method, reference_id, transaction_date)
       VALUES ($1, $2, $3, $4, 'income', $5, 'USD', $6, 'completed', 'bank_transfer', $7, $8)`,
      [uuidv4(), actualReceiverId, receiverAccount.id, categoryId, parseFloat(amount),
       `Payment from ${senderName}${description ? ': ' + description : ''}`, refId, now]
    );

    // Create notifications
    await client.query(
      `INSERT INTO notifications (id, user_id, type, title, message, data)
       VALUES ($1, $2, 'payment', 'Payment Sent', $3, $4)`,
      [uuidv4(), senderId,
       `You sent $${parseFloat(amount).toFixed(2)} to ${receiverName}.`,
       JSON.stringify({ amount, to: receiverName, refId })]
    );
    await client.query(
      `INSERT INTO notifications (id, user_id, type, title, message, data)
       VALUES ($1, $2, 'payment', 'Payment Received', $3, $4)`,
      [uuidv4(), actualReceiverId,
       `You received $${parseFloat(amount).toFixed(2)} from ${senderName}.`,
       JSON.stringify({ amount, from: senderName, refId })]
    );

    await client.query('COMMIT');

    // Return enriched payment
    const fullPayment = await query(
      `SELECT p.*,
              s.full_name as sender_name, s.email as sender_email,
              r.full_name as receiver_name, r.email as receiver_email
       FROM payments p
       JOIN users s ON p.sender_id = s.id
       JOIN users r ON p.receiver_id = r.id
       WHERE p.id = $1`,
      [paymentId]
    );
    return fullPayment.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getPayments = async (userId) => {
  const result = await query(
    `SELECT p.*,
            s.full_name as sender_name, s.email as sender_email,
            r.full_name as receiver_name, r.email as receiver_email
     FROM payments p
     JOIN users s ON p.sender_id = s.id
     JOIN users r ON p.receiver_id = r.id
     WHERE p.sender_id = $1 OR p.receiver_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return result.rows;
};

const getPaymentById = async (id, userId) => {
  const result = await query(
    `SELECT p.*,
            s.full_name as sender_name, s.email as sender_email,
            r.full_name as receiver_name, r.email as receiver_email
     FROM payments p
     JOIN users s ON p.sender_id = s.id
     JOIN users r ON p.receiver_id = r.id
     WHERE p.id = $1 AND (p.sender_id = $2 OR p.receiver_id = $2)`,
    [id, userId]
  );
  if (!result.rows.length) {
    const err = new Error('Payment not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

module.exports = { sendPayment, getPayments, getPaymentById };
