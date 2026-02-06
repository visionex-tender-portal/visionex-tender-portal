const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'tenders.db'));

// Create tables with updated schema
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
    tender_status TEXT DEFAULT 'awarded',
    closing_date TEXT,
    cn_id TEXT,
    tender_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_date ON tenders(date_signed DESC);
  CREATE INDEX IF NOT EXISTS idx_construction ON tenders(is_construction, date_signed DESC);
  CREATE INDEX IF NOT EXISTS idx_state ON tenders(state, date_signed DESC);
  CREATE INDEX IF NOT EXISTS idx_status ON tenders(tender_status, closing_date DESC);
`);

// Add new columns if they don't exist (migration)
try {
  db.exec(`ALTER TABLE tenders ADD COLUMN tender_status TEXT DEFAULT 'awarded'`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE tenders ADD COLUMN closing_date TEXT`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE tenders ADD COLUMN cn_id TEXT`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE tenders ADD COLUMN tender_url TEXT`);
} catch (e) { /* Column already exists */ }

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

// Insert or update OPEN tender
const upsertOpenTender = db.prepare(`
  INSERT INTO tenders (
    id, title, description, buyer_name, supplier_name,
    value_amount, value_currency, closing_date,
    state, source, category, is_construction, tender_status,
    cn_id, tender_url
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    value_amount = excluded.value_amount,
    closing_date = excluded.closing_date,
    tender_status = 'open'
`);

// Get recent tenders (ALL - both open and awarded)
const getRecentTenders = db.prepare(`
  SELECT * FROM tenders
  WHERE is_construction = 1
  ORDER BY 
    CASE 
      WHEN tender_status = 'open' THEN 0 
      ELSE 1 
    END,
    COALESCE(closing_date, date_signed) DESC
  LIMIT ?
`);

// Get OPEN tenders only
const getOpenTenders = db.prepare(`
  SELECT * FROM tenders
  WHERE is_construction = 1 AND tender_status = 'open'
  ORDER BY closing_date ASC
  LIMIT ?
`);

// Get AWARDED contracts only
const getAwardedTenders = db.prepare(`
  SELECT * FROM tenders
  WHERE is_construction = 1 AND tender_status = 'awarded'
  ORDER BY date_signed DESC
  LIMIT ?
`);

// Get tenders by state
const getTendersByState = db.prepare(`
  SELECT * FROM tenders
  WHERE is_construction = 1 AND state = ?
  ORDER BY 
    CASE 
      WHEN tender_status = 'open' THEN 0 
      ELSE 1 
    END,
    COALESCE(closing_date, date_signed) DESC
  LIMIT ?
`);

// Get tender count
const getTenderCount = db.prepare(`
  SELECT COUNT(*) as count FROM tenders WHERE is_construction = 1
`);

// Get open tender count
const getOpenTenderCount = db.prepare(`
  SELECT COUNT(*) as count FROM tenders 
  WHERE is_construction = 1 AND tender_status = 'open'
`);

module.exports = {
  db,
  upsertTender,
  upsertOpenTender,
  getRecentTenders,
  getOpenTenders,
  getAwardedTenders,
  getTendersByState,
  getTenderCount,
  getOpenTenderCount
};
