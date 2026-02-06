const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'tenders.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS tenders (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    buyer_name TEXT,
    supplier_name TEXT,
    value_amount REAL,
    value_currency TEXT DEFAULT 'AUD',
    date_signed TEXT,
    period_start TEXT,
    period_end TEXT,
    state TEXT,
    locality TEXT,
    source TEXT DEFAULT 'AusTender',
    category TEXT,
    is_construction BOOLEAN DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_date ON tenders(date_signed DESC);
  CREATE INDEX IF NOT EXISTS idx_construction ON tenders(is_construction, date_signed DESC);
  CREATE INDEX IF NOT EXISTS idx_state ON tenders(state, date_signed DESC);
`);

// Insert or update tender
const upsertTender = db.prepare(`
  INSERT INTO tenders (
    id, title, description, buyer_name, supplier_name,
    value_amount, value_currency, date_signed,
    period_start, period_end, state, locality,
    source, category, is_construction
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    value_amount = excluded.value_amount,
    supplier_name = excluded.supplier_name
`);

// Get recent tenders
const getRecentTenders = db.prepare(`
  SELECT * FROM tenders
  WHERE is_construction = 1
  ORDER BY date_signed DESC
  LIMIT ?
`);

// Get tenders by state
const getTendersByState = db.prepare(`
  SELECT * FROM tenders
  WHERE is_construction = 1 AND state = ?
  ORDER BY date_signed DESC
  LIMIT ?
`);

// Get tender count
const getTenderCount = db.prepare(`
  SELECT COUNT(*) as count FROM tenders WHERE is_construction = 1
`);

module.exports = {
  db,
  upsertTender,
  getRecentTenders,
  getTendersByState,
  getTenderCount
};
