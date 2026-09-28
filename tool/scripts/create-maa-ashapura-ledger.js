const db = require('../lib/db');

// Check first — must not already exist
const existing = db.prepare("SELECT * FROM ledgers WHERE name = 'Maa Ashapura Projects'").get();
if (existing) {
  console.log('ALREADY EXISTS:', JSON.stringify(existing));
  process.exit(0);
}

// Invoice GSTIN 24AAOCM9520E1ZF, Gujarat (state code 24) — same state => CGST/SGST
const result = db.prepare(`
  INSERT INTO ledgers (name, type, normal_balance, parent_group_id, gstin, state_code, registration_type, default_supply_type, rcm_flag)
  VALUES (?, 'Asset', 'Debit', 7, ?, 'Gujarat', 'regular', 'taxable', 0)
`).run('Maa Ashapura Projects', '24AAOCM9520E1ZF');

console.log('Created ledger ID:', result.lastInsertRowid);
const ledger = db.prepare('SELECT * FROM ledgers WHERE id = ?').get(result.lastInsertRowid);
console.log('Ledger:', JSON.stringify(ledger));