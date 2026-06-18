const db = require('../lib/db');

console.log('=== CUSTOMER RECEIVABLES ===');
const assets = db.prepare(`
  SELECT l.id, l.name,
    COALESCE((SELECT SUM(jl.debit - jl.credit) FROM lines jl WHERE jl.ledger_id = l.id), 0) as balance
  FROM ledgers l
  WHERE l.type = 'Asset' AND l.parent_group_id = 7
  ORDER BY balance DESC
`).all();
assets.forEach(a => console.log(a.name.padEnd(35), '₹', a.balance.toFixed(2)));

console.log('\n=== VENDOR PAYABLES ===');
const liabilities = db.prepare(`
  SELECT l.id, l.name,
    COALESCE((SELECT SUM(jl.credit - jl.debit) FROM lines jl WHERE jl.ledger_id = l.id), 0) as balance
  FROM ledgers l
  WHERE l.type = 'Liability' AND l.name NOT IN ('Output CGST','Output SGST','Output IGST','Partner Capital')
  ORDER BY balance DESC
`).all();
liabilities.forEach(l => console.log(l.name.padEnd(35), '₹', l.balance.toFixed(2)));

console.log('\n=== BANK & CASH ===');
const banks = db.prepare(`
  SELECT l.id, l.name,
    COALESCE((SELECT SUM(jl.debit - jl.credit) FROM lines jl WHERE jl.ledger_id = l.id), 0) as balance
  FROM ledgers l
  WHERE l.parent_group_id = 6
  ORDER BY balance DESC
`).all();
banks.forEach(b => console.log(b.name.padEnd(35), '₹', b.balance.toFixed(2)));

console.log('\n=== GST LIABILITIES ===');
const gst = db.prepare(`
  SELECT l.id, l.name,
    COALESCE((SELECT SUM(jl.credit - jl.debit) FROM lines jl WHERE jl.ledger_id = l.id), 0) as balance
  FROM ledgers l
  WHERE l.name LIKE 'Output %'
  ORDER BY l.name
`).all();
gst.forEach(g => console.log(g.name.padEnd(35), '₹', g.balance.toFixed(2)));

console.log('\n=== INPUT GST (ITC) ===');
const inputGst = db.prepare(`
  SELECT l.id, l.name,
    COALESCE((SELECT SUM(jl.debit - jl.credit) FROM lines jl WHERE jl.ledger_id = l.id), 0) as balance
  FROM ledgers l
  WHERE l.name LIKE 'Input %'
  ORDER BY l.name
`).all();
inputGst.forEach(g => console.log(g.name.padEnd(35), '₹', g.balance.toFixed(2)));

// Revenue totals for May
console.log('\n=== MAY REVENUE BY INCOME LEDGER ===');
const revenue = db.prepare(`
  SELECT l.name,
    COALESCE((SELECT SUM(jl.credit - jl.debit) FROM lines jl JOIN vouchers v ON jl.voucher_id = v.id WHERE jl.ledger_id = l.id AND v.date >= '2026-05-01' AND v.date <= '2026-05-31'), 0) as balance
  FROM ledgers l
  WHERE l.type = 'Income' AND l.parent_group_id = 9
  ORDER BY balance DESC
`).all();
revenue.forEach(r => console.log(r.name.padEnd(35), '₹', r.balance.toFixed(2)));
const totalRev = revenue.reduce((sum, r) => sum + r.balance, 0);
console.log('TOTAL MAY REVENUE: ₹', totalRev.toFixed(2));

// Expense totals for May
console.log('\n=== MAY EXPENSES ===');
const expenses = db.prepare(`
  SELECT l.name,
    COALESCE((SELECT SUM(jl.debit - jl.credit) FROM lines jl JOIN vouchers v ON jl.voucher_id = v.id WHERE jl.ledger_id = l.id AND v.date >= '2026-05-01' AND v.date <= '2026-05-31'), 0) as balance
  FROM ledgers l
  WHERE l.type = 'Expense'
  ORDER BY balance DESC
`).all();
expenses.forEach(e => console.log(e.name.padEnd(35), '₹', e.balance.toFixed(2)));
const totalExp = expenses.reduce((sum, e) => sum + e.balance, 0);
console.log('TOTAL MAY EXPENSES: ₹', totalExp.toFixed(2));
