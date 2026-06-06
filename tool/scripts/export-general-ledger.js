const db = require('../lib/db');

// Parse --from and --to flags
const args = process.argv.slice(2);
let fromDate = '';
let toDate = '';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--from' && args[i+1]) fromDate = args[++i];
  if (args[i] === '--to' && args[i+1]) toDate = args[++i];
}

const dateFilter = fromDate || toDate 
  ? `AND v.date >= '${fromDate || '0000-00-00'}' AND v.date <= '${toDate || '9999-12-31'}'`
  : '';

// Get all ledgers with posted transactions
const ledgers = db.prepare(`
  SELECT DISTINCT l.id, l.name, l.type
  FROM ledgers l
  JOIN lines li ON l.id = li.ledger_id
  JOIN vouchers v ON li.voucher_id = v.id
  WHERE v.status = 'POSTED'
  ORDER BY 
    CASE l.type 
      WHEN 'Asset' THEN 1 
      WHEN 'Expense' THEN 2 
      WHEN 'Income' THEN 3 
      WHEN 'Liability' THEN 4 
      WHEN 'Equity' THEN 5 
      ELSE 6 
    END,
    l.name
`).all();

if (fromDate || toDate) {
  console.log(`# General Ledger from ${fromDate || 'beginning'} to ${toDate || 'end'}`);
}
console.log('Ledger Name\tDate\tVoucher No\tType\tNarration\tDebit\tCredit\tRunning Balance');

ledgers.forEach(ledger => {
  const lines = db.prepare(`
    SELECT 
      v.date,
      v.voucher_no,
      v.type as voucher_type,
      v.narration,
      l.debit,
      l.credit
    FROM lines l
    JOIN vouchers v ON l.voucher_id = v.id
    WHERE l.ledger_id = ? AND v.status = 'POSTED' ${dateFilter}
    ORDER BY v.date, v.id
  `).all(ledger.id);

  let balance = 0;
  
  lines.forEach(line => {
    balance += (line.debit - line.credit);
    console.log(
      `${ledger.name}\t${line.date}\t${line.voucher_no}\t${line.voucher_type}\t${(line.narration || '').replace(/\t/g, ' ')}\t${line.debit}\t${line.credit}\t${balance.toFixed(2)}`
    );
  });
});
