const db = require('../lib/db');

const existing = db.prepare("SELECT * FROM ledgers WHERE name = 'Rotary Club of Bhuj'").get();
if (existing) {
  console.log('ALREADY EXISTS:', JSON.stringify(existing));
  process.exit(0);
}

// No GSTIN on file -> intrastate CGST/SGST per GST-IN rule.
const result = db.prepare(`
  INSERT INTO ledgers (name, type, normal_balance, parent_group_id, gstin, state_code, registration_type, default_supply_type, rcm_flag)
  VALUES (?, 'Asset', 'Debit', 7, NULL, 'Gujarat', 'unregistered', NULL, 0)
`).run('Rotary Club of Bhuj');

console.log('Created ledger ID:', result.lastInsertRowid);
console.log(db.prepare('SELECT * FROM ledgers WHERE id = ?').get(result.lastInsertRowid));