const db = require('../lib/db');

const result = db.prepare(`
  INSERT INTO ledgers (name, type, normal_balance, gstin, state_code, registration_type, default_supply_type) 
  VALUES (?, 'Asset', 'Debit', ?, 'Gujarat', 'regular', 'taxable')
`).run('JK Chem Industries LLP', '24AAWFJ6908LIZN');

console.log('Created ledger ID:', result.lastInsertRowid);

const ledger = db.prepare('SELECT * FROM ledgers WHERE id = ?').get(result.lastInsertRowid);
console.log('Ledger:', JSON.stringify(ledger, null, 2));
