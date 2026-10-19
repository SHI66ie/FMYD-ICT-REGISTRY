const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'fmyd_registry',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Keep connections alive for LAN-connected clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  max: 20,
});

pool.on('connect', () => {
  console.log('📦  PostgreSQL pool: new client connected');
});

pool.on('error', (err) => {
  console.error('❌  PostgreSQL pool error:', err.message);
});

module.exports = pool;
