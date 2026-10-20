const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database file path: server/data/fmyd_registry.db
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'fmyd_registry.db');
console.log(`📦 Initializing SQLite database at: ${dbPath}`);

const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Initialize Schema ────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    created_at    TEXT NOT NULL DEFAULT (DATETIME('now'))
  );

  CREATE TABLE IF NOT EXISTS files (
    id               TEXT PRIMARY KEY,
    file_number      TEXT NOT NULL UNIQUE,
    title            TEXT NOT NULL,
    date_logged      TEXT NOT NULL,
    reference_number TEXT,
    type             TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing')),
    origin           TEXT,
    destination      TEXT,
    action_officer   TEXT,
    status           TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Returned')),
    remarks          TEXT,
    scan_path        TEXT,
    created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at       TEXT NOT NULL DEFAULT (DATETIME('now')),
    updated_at       TEXT NOT NULL DEFAULT (DATETIME('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_files_type ON files(type);
  CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
  CREATE INDEX IF NOT EXISTS idx_files_date_logged ON files(date_logged);
  CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
`);

// ─── Seed Default Admin User ──────────────────────────────────────────────────
// admin / admin123
const checkAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!checkAdmin) {
  const seedAdmin = db.prepare(`
    INSERT INTO users (id, username, password_hash, full_name, role)
    VALUES (?, ?, ?, ?, ?)
  `);
  seedAdmin.run(
    '00000000-0000-0000-0000-000000000001',
    'admin',
    '$2a$10$.4h4GonB27Ajqa2iAhTJ..h7G7.le.8dC91IgiRyu2bTBcMh9gA7u',
    'System Administrator',
    'admin'
  );
  console.log('👤 Seeded default admin user: admin / admin123');
}

// ─── PostgreSQL-Compatible Query Adapter ───────────────────────────────────────
// Translates $1, $2 to ? and converts RETURNING statements transparently
const pool = {
  db,
  async query(text, params = []) {
    let sql = text.trim();

    // Special case: stats aggregate query
    // Replace PostgreSQL FILTER clauses with SQLite SUM(CASE WHEN ...) COALESCE
    if (sql.includes('FILTER (WHERE')) {
      sql = sql
        .replace(/COUNT\(\*\)\s+FILTER\s*\(WHERE\s+type\s*=\s*'incoming'\)/gi, "COALESCE(SUM(CASE WHEN type = 'incoming' THEN 1 ELSE 0 END), 0)")
        .replace(/COUNT\(\*\)\s+FILTER\s*\(WHERE\s+type\s*=\s*'outgoing'\)/gi, "COALESCE(SUM(CASE WHEN type = 'outgoing' THEN 1 ELSE 0 END), 0)")
        .replace(/COUNT\(\*\)\s+FILTER\s*\(WHERE\s+status\s*=\s*'Pending'\)/gi, "COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0)")
        .replace(/COUNT\(\*\)\s+FILTER\s*\(WHERE\s+status\s*=\s*'In Progress'\)/gi, "COALESCE(SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END), 0)")
        .replace(/COUNT\(\*\)\s+FILTER\s*\(WHERE\s+status\s*=\s*'Completed'\)/gi, "COALESCE(SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END), 0)")
        .replace(/COUNT\(\*\)\s+FILTER\s*\(WHERE\s+status\s*=\s*'Returned'\)/gi, "COALESCE(SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END), 0)")
        .replace(/COUNT\(\*\)\s+FILTER\s*\(WHERE\s+date_logged\s*=\s*CURRENT_DATE\)/gi, "COALESCE(SUM(CASE WHEN date_logged = DATE('now') THEN 1 ELSE 0 END), 0)");
    }

    // Convert $1, $2, ... placeholders to ?
    const convertedSql = sql.replace(/\$[0-9]+/g, '?');

    // Handle RETURNING * / RETURNING clause
    const hasReturning = /RETURNING\s+(.+)$/i.test(convertedSql);
    let cleanSql = convertedSql;
    let returningCols = '*';

    if (hasReturning) {
      const match = convertedSql.match(/RETURNING\s+(.+)$/i);
      returningCols = match[1].trim();
      cleanSql = convertedSql.replace(/RETURNING\s+.+$/i, '').trim();
    }

    const isSelect = /^\s*SELECT/i.test(cleanSql);

    try {
      if (isSelect) {
        const stmt = db.prepare(cleanSql);
        const rows = stmt.all(...params);
        return { rows, rowCount: rows.length };
      }

      // Check if this is an INSERT / UPDATE / DELETE with RETURNING
      if (hasReturning) {
        // If it's an INSERT into files or users, find the id from params or execute transaction
        const isInsert = /^\s*INSERT\s+INTO\s+(\w+)/i.test(cleanSql);
        const isUpdate = /^\s*UPDATE\s+(\w+)/i.test(cleanSql);
        const isDelete = /^\s*DELETE\s+FROM\s+(\w+)/i.test(cleanSql);

        if (isInsert) {
          const matchTable = cleanSql.match(/^\s*INSERT\s+INTO\s+(\w+)/i);
          const table = matchTable[1];
          // In files and users, the first parameter ($1) is always id (UUID)
          const id = params[0];

          const stmt = db.prepare(cleanSql);
          stmt.run(...params);

          const getRow = db.prepare(`SELECT ${returningCols} FROM ${table} WHERE id = ?`).get(id);
          return { rows: getRow ? [getRow] : [], rowCount: getRow ? 1 : 0 };
        }

        if (isUpdate) {
          const matchTable = cleanSql.match(/^\s*UPDATE\s+(\w+)/i);
          const table = matchTable[1];
          // In files and users update, WHERE id = $N is always the last parameter
          const id = params[params.length - 1];

          const stmt = db.prepare(cleanSql);
          const result = stmt.run(...params);

          if (result.changes === 0) {
            return { rows: [], rowCount: 0 };
          }

          const getRow = db.prepare(`SELECT ${returningCols} FROM ${table} WHERE id = ?`).get(id);
          return { rows: getRow ? [getRow] : [], rowCount: getRow ? 1 : 0 };
        }

        if (isDelete) {
          const matchTable = cleanSql.match(/^\s*DELETE\s+FROM\s+(\w+)/i);
          const table = matchTable[1];
          const id = params[0];

          // Fetch before delete for RETURNING clause
          const getRow = db.prepare(`SELECT ${returningCols} FROM ${table} WHERE id = ?`).get(id);

          const stmt = db.prepare(cleanSql);
          const result = stmt.run(...params);

          return { rows: result.changes > 0 && getRow ? [getRow] : [], rowCount: result.changes };
        }
      }

      // Standard INSERT / UPDATE / DELETE without RETURNING
      const stmt = db.prepare(cleanSql);
      const result = stmt.run(...params);
      return { rows: [], rowCount: result.changes };
    } catch (err) {
      console.error('SQL Execution Error:', err.message, '\nQuery:', cleanSql, '\nParams:', params);
      throw err;
    }
  },
};

module.exports = pool;
