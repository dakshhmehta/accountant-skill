const db = require('../lib/db');

const existing = db.prepare("SELECT * FROM ledgers WHERE name = 'Gateway to Rann Resort'").get();
if (existing) {
  console.log('ALREADY EXISTS:', JSON.stringify(existing));
  process.exit(0);
}

// Invoice party GSTIN 24AABTD8138P1Z9, Gujarat (state code 24) — same state => CGST/SGST
const result = db.prepare(`
  INSERT INTO ledgers (name, type, normal_balance, parent_group_id, gstin, state_code, registration_type, default_supply_type, rcm_flag)
  VALUES (?, 'Asset', 'Debit', 7, ?, 'Gujarat', 'regular', 'taxable', 0)
`).run('Gateway to Rann Resort', '24AABTD8138P1Z9');

console.log('Created ledger ID:', result.lastInsertRowid);
console.log('Ledger:', JSON.stringify(db.prepare('SELECT * FROM ledgers WHERE id = ?').get(result.lastInsertRowid)));