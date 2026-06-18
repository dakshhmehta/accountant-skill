#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'accounting.db'));

// =========== Get All Ledgers ===========
const ledgers = db.prepare(`
  SELECT l.*, COALESCE(lg.name, '-') as parent_group
  FROM ledgers l
  LEFT JOIN ledger_groups lg ON l.parent_group_id = lg.id
  ORDER BY 
    CASE l.type WHEN 'Asset' THEN 1 WHEN 'Liability' THEN 2 WHEN 'Equity' THEN 3 WHEN 'Income' THEN 4 WHEN 'Expense' THEN 5 END,
    l.name
`).all();

// =========== Get All May 2026 POSTED Vouchers + Lines ===========
const rows = db.prepare(`
  SELECT v.id as voucher_id, v.type as vtype, v.date, v.source_doc_no, v.narration,
         vl.ledger_id, vl.debit, vl.credit, l.name as ledger_name, l.type as ledger_type
  FROM vouchers v
  JOIN lines vl ON v.id = vl.voucher_id
  JOIN ledgers l ON vl.ledger_id = l.id
  WHERE v.date >= '2026-05-01' AND v.date <= '2026-05-31'
    AND v.status = 'POSTED'
  ORDER BY v.date, v.id, vl.ledger_id
`).all();

// =========== Group lines by ledger ===========
const ledgerMap = {};
for (const row of rows) {
  if (!ledgerMap[row.ledger_id]) {
    ledgerMap[row.ledger_id] = {
      id: row.ledger_id,
      name: row.ledger_name,
      type: row.ledger_type,
      entries: []
    };
  }
  ledgerMap[row.ledger_id].entries.push(row);
}

// =========== Print General Ledger ===========
console.log("=".repeat(100));
console.log("GENERAL LEDGER — MAY 2026 (01-05-2026 to 31-05-2026)");
console.log("=".repeat(100));
console.log("");

const typeLabels = { Asset: 'ASSETS', Liability: 'LIABILITIES', Equity: 'EQUITY', Income: 'INCOME', Expense: 'EXPENSES' };

for (const [typeLabel, typeName] of Object.entries(typeLabels)) {
  console.log("-".repeat(100));
  console.log(`  ${typeLabel}`);
  console.log("-".repeat(100));

  const allTypeLedgers = ledgers.filter(l => l.type === typeName);

  for (const ledger of allTypeLedgers) {
    const data = ledgerMap[ledger.id];
    const entries = data ? data.entries : [];
    if (entries.length === 0) { if (ledgerMap[ledger.id]) console.error("SKIPPING (has map but 0 entries):", ledger.name); continue; }

    // Opening balance = sum of all entries before May 2026
    const opening = db.prepare(`
      SELECT COALESCE(SUM(vl.debit), 0) as total_dr, COALESCE(SUM(vl.credit), 0) as total_cr
      FROM lines vl
      JOIN vouchers v ON v.id = vl.voucher_id
      WHERE vl.ledger_id = ? AND v.date < '2026-05-01' AND v.status = 'POSTED'
    `).get(ledger.id);

    const isDebitNormal = ledger.normal_balance === 'Debit';
    const openingDr = opening.total_dr;
    const openingCr = opening.total_cr;
    const openingBal = isDebitNormal ? (openingDr - openingCr) : (openingCr - openingDr);

    console.log(`\n  Ledger: ${ledger.name} [${ledger.type}]${ledger.parent_group !== '-' ? ` (${ledger.parent_group})` : ''}`);
    if (ledger.gstin) console.log(`    GSTIN: ${ledger.gstin}`);
    console.log(`  ${'Date'.padEnd(12)} ${'Vch#'.padEnd(8)} ${'Doc#'.padEnd(18)} ${'Dr'.padStart(12)} ${'Cr'.padStart(12)} ${'Balance'.padStart(14)}`);
    console.log(`  ${'-'.repeat(70)}`);

    let runningBal = openingBal;

    // Print opening balance
    console.log(`  ${'Opening'.padEnd(12)} ${''.padEnd(8)} ${''.padEnd(18)} ${''.padStart(12)} ${''.padStart(12)} ${runningBal.toFixed(2).padStart(14)}`);

    for (const entry of entries) {
      runningBal = isDebitNormal
        ? runningBal + entry.debit - entry.credit
        : runningBal - entry.debit + entry.credit;

      console.log(`  ${entry.date.padEnd(12)} ${String(entry.voucher_id).padEnd(8)} ${(entry.source_doc_no || '').padEnd(18)} ${entry.debit > 0 ? entry.debit.toFixed(2).padStart(12) : ''.padStart(12)} ${entry.credit > 0 ? entry.credit.toFixed(2).padStart(12) : ''.padStart(12)} ${runningBal.toFixed(2).padStart(14)}`);
    }

    // May total
    const mayDr = entries.reduce((s, e) => s + e.debit, 0);
    const mayCr = entries.reduce((s, e) => s + e.credit, 0);
    console.log(`  ${'May Total'.padEnd(12)} ${''.padEnd(8)} ${''.padEnd(18)} ${mayDr.toFixed(2).padStart(12)} ${mayCr.toFixed(2).padStart(12)} ${runningBal.toFixed(2).padStart(14)}`);
    console.log(`  >>> Closing Balance: ₹${runningBal.toFixed(2)}`);
  }
  console.log("");
}

// =========== 6. Trial Balance ===========
console.log("\n\n");
console.log("=".repeat(80));
console.log("TRIAL BALANCE AS OF 31-05-2026");
console.log("=".repeat(80));
console.log("");

const tbData = db.prepare(`
  SELECT 
    l.id, l.name, l.type, l.normal_balance,
    COALESCE(SUM(vl.debit), 0) as total_dr,
    COALESCE(SUM(vl.credit), 0) as total_cr
  FROM ledgers l
  LEFT JOIN lines vl ON vl.ledger_id = l.id
  LEFT JOIN vouchers v ON v.id = vl.voucher_id AND v.status = 'POSTED' AND v.date <= '2026-05-31'
  GROUP BY l.id
  HAVING total_dr > 0 OR total_cr > 0
  ORDER BY 
    CASE l.type WHEN 'Asset' THEN 1 WHEN 'Liability' THEN 2 WHEN 'Equity' THEN 3 WHEN 'Income' THEN 4 WHEN 'Expense' THEN 5 END,
    l.name
`).all();

let grandDr = 0, grandCr = 0;

console.log(`${'Ledger Name'.padEnd(42)} ${'Type'.padEnd(12)} ${'Debit'.padStart(14)} ${'Credit'.padStart(14)}`);
console.log('-'.repeat(90));

let currentType = '';
for (const row of tbData) {
  if (row.type !== currentType) {
    currentType = row.type;
    console.log(`  -- ${currentType} --`);
  }

  const netDr = row.total_dr > row.total_cr ? (row.total_dr - row.total_cr) : 0;
  const netCr = row.total_cr > row.total_dr ? (row.total_cr - row.total_dr) : 0;

  grandDr += netDr;
  grandCr += netCr;

  console.log(`${row.name.padEnd(42)} ${row.type.padEnd(12)} ${netDr > 0 ? netDr.toFixed(2).padStart(14) : ''.padStart(14)} ${netCr > 0 ? netCr.toFixed(2).padStart(14) : ''.padStart(14)}`);
}

console.log('-'.repeat(90));
console.log(`${'TOTAL'.padEnd(42)} ${''.padEnd(12)} ${grandDr.toFixed(2).padStart(14)} ${grandCr.toFixed(2).padStart(14)}`);
console.log(`\nTrial Balance ${grandDr.toFixed(2) === grandCr.toFixed(2) ? '✅ BALANCED' : '❌ OUT OF BALANCE by ₹' + Math.abs(grandDr - grandCr).toFixed(2)}`);

db.close();
