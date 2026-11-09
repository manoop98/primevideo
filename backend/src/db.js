// ------------------------------------------------------------------
//  Database connection
//  All values come from ENVIRONMENT VARIABLES, so the same image
//  works in docker-compose (DB_HOST=mysql) and in AKS (DB_HOST=mysql
//  service). Nothing is hard-coded inside the image.
// ------------------------------------------------------------------
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'primeuser',
  password: process.env.DB_PASSWORD || 'primepass',
  database: process.env.DB_NAME || 'primevideo',
  waitForConnections: true,
  connectionLimit: 10,
};

let pool;

// MySQL can take 20-40 seconds to start the first time.
// Instead of crashing, the backend keeps retrying.
async function connectWithRetry(retries = 30, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      pool = mysql.createPool(config);
      await pool.query('SELECT 1');
      console.log(`[db] Connected to MySQL at ${config.host}:${config.port}`);
      return pool;
    } catch (err) {
      console.log(`[db] Attempt ${attempt}/${retries} failed (${err.code || err.message}). Retrying in ${delayMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Could not connect to MySQL');
}

function getPool() {
  if (!pool) throw new Error('Database not initialised yet');
  return pool;
}

module.exports = { connectWithRetry, getPool };
