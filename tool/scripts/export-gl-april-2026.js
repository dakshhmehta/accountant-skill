const db = require('../lib/db');

// Get all ledgers with posted transactions up to April 30, 2026
const ledgers = db.prepare(`
  SELECT DISTINCT l.id, l.name, l.type
  FROM ledgers l
  JOIN lines li ON l.id = li.ledger_id
  JOIN vouchers v ON li.voucher_id = v.id
  WHERE v.status = 'POSTED' AND v.date <= '2026-04-30'
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

console.log('Ledger Name;Date;Voucher No;Type;Narration;Debit;Credit;Running Balance');

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
    WHERE l.ledger_id = ? AND v.status = 'POSTED' AND v.date <= '2026-04-30'
    ORDER BY v.date, v.id
  `).all(ledger.id);

  let balance = 0;
  
  lines.forEach(line => {
    balance += (line.debit - line.credit);
    const narration = (line.narration || '').replace(/;/g, ',');
    console.log(
      `${ledger.name};${line.date};${line.voucher_no};${line.voucher_type};${narration};${line.debit};${line.credit};${balance.toFixed(2)}`
    );
  });
});
