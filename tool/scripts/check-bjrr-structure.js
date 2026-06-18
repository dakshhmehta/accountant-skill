const db = require('../lib/db');

// Check original SE-0003 structure
const voucher = db.prepare("SELECT * FROM vouchers WHERE voucher_no = 'SE-0003'").get();
console.log('Voucher SE-0003:', JSON.stringify(voucher, null, 2));

const lines = db.prepare(`
  SELECT l.*, lg.name as ledger_name 
  FROM lines l 
  JOIN ledgers lg ON l.ledger_id = lg.id 
  WHERE l.voucher_id = ?
`).all(voucher.id);
console.log('Lines:', JSON.stringify(lines, null, 2));

// Check all BJRR party ledgers
console.log('\n=== All BJRR-related ledgers ===');
const bjrrVouchers = db.prepare(`
  SELECT DISTINCT v.id, v.voucher_no, v.date
  FROM vouchers v
  JOIN lines l ON v.id = l.voucher_id
  JOIN ledgers lg ON l.ledger_id = lg.id
  WHERE lg.name = 'BJRR Income' AND v.status = 'POSTED'
  ORDER BY v.date
`).all();

bjrrVouchers.forEach(v => {
  const vLines = db.prepare(`
    SELECT lg.name, l.debit, l.credit
    FROM lines l
    JOIN ledgers lg ON l.ledger_id = lg.id
    WHERE l.voucher_id = ?
  `).all(v.id);
  console.log('\n' + v.voucher_no + ':');
  vLines.forEach(line => console.log('  ' + line.name + ' | Dr: ' + line.debit + ' | Cr: ' + line.credit));
});
