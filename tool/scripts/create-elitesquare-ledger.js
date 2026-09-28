const db = require('../lib/db');

const name = 'The Elite Square';
const ex = db.prepare('SELECT * FROM ledgers WHERE name = ?').get(name);
if (ex) {
  console.log('ALREADY EXISTS:', JSON.stringify(ex));
  process.exit(0);
}

const r = db.prepare(`
  INSERT INTO ledgers (name, type, normal_balance, parent_group_id, gstin, state_code, registration_type, default_supply_type, rcm_flag)
  VALUES (?, 'Asset', 'Debit', 7, NULL, NULL, NULL, 'intra-state', 0)
`).run(name);

console.log('Created ledger ID:', r.lastInsertRowid);
console.log(JSON.stringify(db.prepare('SELECT * FROM ledgers WHERE id = ?').get(r.lastInsertRowid)));
