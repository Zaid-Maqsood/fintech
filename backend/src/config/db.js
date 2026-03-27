const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL.replace('?sslmode=require', '').replace('&sslmode=require', ''),
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };

const pool = new Pool(poolConfig);

const schema = process.env.DB_SCHEMA || 'banking';

pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema},public`);
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('query', { text: text.substring(0, 80), duration, rows: res.rowCount });
  }
  return res;
};

module.exports = { pool, query, schema };
