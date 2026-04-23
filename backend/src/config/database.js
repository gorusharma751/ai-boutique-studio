const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

let pool = null;
let db = null;

// Check if using SQLite (local development) or PostgreSQL (production)
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('sqlite')) {
  // SQLite for local development
  const dbPath = path.join(__dirname, '../../dev.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  logger.info('🗄️ SQLite database connected at', dbPath);

  // Wrapper for compatibility with pg-like interface
  const query = (text, params = []) => {
    try {
      if (text.toUpperCase().includes('SELECT')) {
        const stmt = db.prepare(text);
        const rows = stmt.all(...(params || []));
        return { rows, rowCount: rows.length };
      } else {
        const stmt = db.prepare(text);
        const result = stmt.run(...(params || []));
        return { rows: [], rowCount: result.changes };
      }
    } catch (err) {
      logger.error('SQLite query error:', err);
      throw err;
    }
  };

  const withTransaction = (callback) => {
    const trans = db.transaction(callback);
    return trans();
  };

  module.exports = { pool: null, db, query, withTransaction };
} else {
  // PostgreSQL for Supabase/Production
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('connect', () => {
    logger.info('🐘 PostgreSQL database connection established');
  });

  pool.on('error', (err) => {
    logger.error('Unexpected database error:', err);
    if (process.env.NODE_ENV === 'production') {
      process.exit(-1);
    }
  });

  // Helper query function
  const query = async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (duration > 1000) {
        logger.warn('⏱️ Slow query detected:', { text, duration, rows: res.rowCount });
      }
      return res;
    } catch (err) {
      logger.error('Database query error:', { text, err: err.message });
      throw err;
    }
  };

  // Transaction helper
  const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };

  module.exports = { pool, query, withTransaction };
}
