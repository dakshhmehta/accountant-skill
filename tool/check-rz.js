const db = require('./lib/db');

// Check all Razorpay settlement entries with individual IGST amounts
const rows = db.prepare(`
  SELECT v.date, v.voucher_no, v.narration, l.debit, l.credit, l.id as line_id
  FROM lines l
  JOIN vouchers v ON l.voucher_id = v.id
  WHERE l.ledger_id = 20
    AND v.status = 'POSTED'
    AND v.date >= '2026-04-01'
    AND v.date <= '2026-04-30'
  ORDER BY v.date, v.id
`).all();

// Also let me check ALL Razorpay entries across ALL input GST ledgers
const allRazorpay = db.prepare(`
  SELECT v.date, v.voucher_no, v.narration, l.ledger_id, lg.name as ledger_name, l.debit, l.credit
  FROM lines l
  JOIN vouchers v ON l.voucher_id = v.id
  JOIN ledgers lg ON l.ledger_id = lg.id
  WHERE (v.narration LIKE '%Razorpay%' OR v.narration LIKE '%razorpay%' OR v.narration LIKE '%PG charges%')
    AND v.status = 'POSTED'
    AND v.date >= '2026-04-01'
    AND v.date <= '2026-04-30'
  ORDER BY v.date, v.id, l.id
`).all();

console.log('=== ALL Razorpay Entries April ===\n');
allRazorpay.forEach(r => {
  console.log(r.date + ' | ' + r.voucher_no + ' | ' + r.ledger_name + ' | Dr: ' + (r.debit||0).toFixed(2) + ' | Cr: ' + (r.credit||0).toFixed(2) + ' | ' + (r.narration||''));
});

// Sum by ledger
console.log('\n=== Summary by Ledger ===');
const byLedger = {};
allRazorpay.forEach(r => {
  if (!byLedger[r.ledger_name]) byLedger[r.ledger_name] = 0;
  byLedger[r.ledger_name] += (r.debit||0) - (r.credit||0);
});
Object.entries(byLedger).forEach(([k,v]) => console.log(k + ': ₹' + v.toFixed(2)));
