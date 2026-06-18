const { getDb, resolveCompany, getCompanyMeta } = require('../lib/db');

function migrate(db) {
  console.log('Running schema migrations...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS ledger_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      parent_group_id INTEGER,
      FOREIGN KEY(parent_group_id) REFERENCES ledger_groups(id)
    );

    CREATE TABLE IF NOT EXISTS ledgers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense')),
      normal_balance TEXT NOT NULL CHECK(normal_balance IN ('Debit', 'Credit')),
      parent_group_id INTEGER,
      gstin TEXT,
      state_code TEXT,
      registration_type TEXT CHECK(registration_type IN ('regular', 'composition', 'unregistered', 'overseas', NULL)),
      default_supply_type TEXT CHECK(default_supply_type IN ('taxable', 'exempt', 'nil_rated', 'non_gst', NULL)),
      rcm_flag BOOLEAN DEFAULT 0,
      FOREIGN KEY(parent_group_id) REFERENCES ledger_groups(id)
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_no TEXT UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('CR', 'BR', 'CP', 'BP', 'PE', 'SE', 'PR', 'SR', 'CN', 'JE', 'OE')),
      date DATE NOT NULL,
      amount REAL NOT NULL CHECK(amount >= 0),
      narration TEXT,
      source_doc_type TEXT,
      source_doc_no TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PREVIEWED', 'CONFIRMED', 'POSTED', 'REVERSED')),
      request_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id INTEGER NOT NULL,
      ledger_id INTEGER NOT NULL,
      debit REAL NOT NULL DEFAULT 0 CHECK(debit >= 0),
      credit REAL NOT NULL DEFAULT 0 CHECK(credit >= 0),
      FOREIGN KEY(voucher_id) REFERENCES vouchers(id),
      FOREIGN KEY(ledger_id) REFERENCES ledgers(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      entity_id INTEGER,
      before_json TEXT,
      after_json TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  console.log('Schema migration complete.');
}

function main() {
  const company = resolveCompany();
  const db = getDb(company);
  const meta = getCompanyMeta(company);
  
  console.log(`Migrating schema for: ${meta ? meta.name : company} (${company})`);
  migrate(db);
}

if (require.main === module) {
  main();
}

module.exports = { migrate };
