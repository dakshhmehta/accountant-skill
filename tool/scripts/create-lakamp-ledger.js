const db = require('../lib/db');

const NAME = 'LaKamp Resort, Bhuj';

const existing = db.prepare("SELECT * FROM ledgers WHERE name = ?").get(NAME);
if (existing) {
  console.log('ALREADY EXISTS:', JSON.stringify(existing));
  process.exit(0);
}

// Mirrors the existing Reseller/billing customer record: "LaKamp Resort, Bhuj"
// (client id 142, account "LaKamp Resort, Bhuj"). No GSTIN on file -> unregistered,
// so the GST engine treats the supply as intrastate (CGST + SGST).
const result = db.prepare(`
  INSERT INTO ledgers (name, type, normal_balance, parent_group_id, gstin, state_code, registration_type, default_supply_type, rcm_flag)
  VALUES (?, 'Asset', 'Debit', 7, NULL, '24', 'unregistered', NULL, 0)
`).run(NAME);

console.log('Created ledger ID:', result.lastInsertRowid);
console.log('Ledger:', JSON.stringify(db.prepare('SELECT * FROM ledgers WHERE id = ?').get(result.lastInsertRowid)));
