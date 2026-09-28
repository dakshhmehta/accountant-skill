const db = require('../lib/db');

const existing = db.prepare("SELECT * FROM ledgers WHERE name = 'Kimaya Interiors, Gandhidham'").get();
if (existing) {
  console.log('ALREADY EXISTS:', JSON.stringify(existing));
  process.exit(0);
}

// GSTIN 24AAJFU3158Q1ZJ (Gujarat, same state) -> CGST/SGST.
const result = db.prepare(`
  INSERT INTO ledgers (name, type, normal_balance, parent_group_id, gstin, state_code, registration_type, default_supply_type, rcm_flag)
  VALUES (?, 'Asset', 'Debit', 7, ?, '24', 'regular', 'intra-state', 0)
`).run('Kimaya Interiors, Gandhidham', '24AAJFU3158Q1ZJ');

console.log('Created ledger ID:', result.lastInsertRowid);
console.log(db.prepare('SELECT * FROM ledgers WHERE id = ?').get(result.lastInsertRowid));