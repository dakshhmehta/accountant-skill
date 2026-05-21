const Database = require('better-sqlite3');
const db = new Database('/root/.openclaw/workspace/skills/accountant/tool/accounting.db');

console.log('========== TEEM WEEKLY REVIEW ==========');
console.log('Period: April 28 – May 4, 2026');
console.log('Company: Romin Interactive');
console.log();

// 1. RECEIVABLES
console.log('📋 RECEIVABLES');
console.log('----------------------------------------');

const customers = db.prepare(`
  SELECT l.id, l.name,
    COALESCE(SUM(li.debit), 0) - COALESCE(SUM(li.credit), 0) as balance
  FROM ledgers l
  LEFT JOIN lines li ON li.ledger_id = l.id
  LEFT JOIN vouchers v ON v.id = li.voucher_id
  WHERE l.type = 'Asset'
    AND l.name NOT IN ('Cash', 'DCB Bank', 'Input CGST', 'Input SGST', 'Input IGST', 'TDS Receivable', 'Prepaid Expenses')
  GROUP BY l.id, l.name
  HAVING balance != 0
  ORDER BY balance DESC
`).all();

let totalReceivable = 0;
for (const c of customers) {
  totalReceivable += c.balance;
  const lastInvoice = db.prepare("SELECT date FROM vouchers v JOIN lines li ON li.voucher_id = v.id WHERE li.ledger_id = ? AND v.type = 'SE' ORDER BY date DESC LIMIT 1").get(c.id);
  const days = lastInvoice ? Math.floor((new Date('2026-05-04') - new Date(lastInvoice.date))/(1000*60*60*24)) : 0;
  console.log(c.name + ': Rs.' + c.balance.toFixed(2) + (days > 0 ? ' (' + days + ' days)' : ''));
}
console.log('Total Receivables: Rs.' + totalReceivable.toFixed(2));
console.log();

// 2. GST STATUS
console.log('📋 GST STATUS');
console.log('----------------------------------------');

const gstLedgers = [
  {name: 'Output CGST', id: 13},
  {name: 'Output SGST', id: 14},
  {name: 'Output IGST', id: 19},
  {name: 'Input CGST', id: 17},
  {name: 'Input SGST', id: 18},
  {name: 'Input IGST', id: 20}
];

let outputTax = 0;
let inputCredit = 0;

for (const gl of gstLedgers) {
  const bal = db.prepare('SELECT COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0) as balance FROM lines WHERE ledger_id = ?').get(gl.id);
  const balance = bal ? bal.balance : 0;
  console.log(gl.name + ': Rs.' + balance.toFixed(2));
  if (gl.name.startsWith('Output')) outputTax += balance;
  if (gl.name.startsWith('Input')) inputCredit += balance;
}

console.log('Total Output Tax: Rs.' + outputTax.toFixed(2));
console.log('Total Input Credit: Rs.' + inputCredit.toFixed(2));
console.log('Net GST Liability: Rs.' + (outputTax - inputCredit).toFixed(2));
console.log();

// 3. ANOMALIES
console.log('📋 ANOMALY SCAN');
console.log('----------------------------------------');

// Duplicate invoice numbers
const dups = db.prepare("SELECT source_doc_no, COUNT(*) as cnt FROM vouchers WHERE type = 'SE' AND source_doc_no IS NOT NULL GROUP BY source_doc_no HAVING cnt > 1").all();
if (dups.length > 0) {
  console.log('⚠️ Duplicate invoice numbers found:');
  for (const d of dups) console.log('  - ' + d.source_doc_no + ' (' + d.cnt + ' times)');
} else {
  console.log('✅ No duplicate invoice numbers');
}

// Negative receivables
const neg = customers.filter(c => c.balance < 0);
if (neg.length > 0) {
  console.log('⚠️ Negative receivables (overpayment/advance):');
  for (const n of neg) console.log('  - ' + n.name + ': Rs.' + n.balance.toFixed(2));
} else {
  console.log('✅ No negative receivables');
}

// Check total debits = credits
const trial = db.prepare('SELECT COALESCE(SUM(debit), 0) as dr, COALESCE(SUM(credit), 0) as cr FROM lines').get();
console.log('✅ Trial Balance: Dr Rs.' + trial.dr.toFixed(2) + ' = Cr Rs.' + trial.cr.toFixed(2) + (Math.abs(trial.dr - trial.cr) < 0.01 ? ' (Balanced)' : ' ⚠️ IMBALANCED'));
console.log();

// 4. RECOMMENDATIONS
console.log('📋 RECOMMENDATIONS');
console.log('----------------------------------------');
if (customers.length > 0) {
  const overdue = customers.filter(c => {
    const lastInv = db.prepare("SELECT date FROM vouchers v JOIN lines li ON li.voucher_id = v.id WHERE li.ledger_id = ? AND v.type = 'SE' ORDER BY date DESC LIMIT 1").get(c.id);
    if (!lastInv) return false;
    const days = Math.floor((new Date('2026-05-04') - new Date(lastInv.date))/(1000*60*60*24));
    return days > 30 && c.balance > 0;
  });
  
  if (overdue.length > 0) {
    console.log('1. Follow up on overdue receivables:');
    for (const o of overdue) console.log('   - ' + o.name + ' (Rs.' + o.balance.toFixed(2) + ')');
  }
}

if (outputTax > inputCredit) {
  console.log('2. GST payment due: Rs.' + (outputTax - inputCredit).toFixed(2) + ' (schedule payment)');
}

if (dups.length > 0) {
  console.log('3. Review duplicate invoices and correct if needed');
}

console.log('4. Review any unmatched receipts against open invoices');
console.log();
console.log('--- End of Weekly Review ---');
