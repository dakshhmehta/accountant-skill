#!/usr/bin/env node
/**
 * General Ledger Export Template
 * Usage: node export-gl-template.js <YYYY-MM-DD>
 * Example: node export-gl-template.js 2026-04-30
 * 
 * Exports all ledger transactions up to specified date.
 * Semicolon-separated format for Excel import.
 */

const db = require('../lib/db');

const cutoffDate = process.argv[2] || new Date().toISOString().split('T')[0];

const ledgers = db.prepare(`
  SELECT DISTINCT l.id, l.name, l.type
  FROM ledgers l
  JOIN lines li ON l.id = li.ledger_id
  JOIN vouchers v ON li.voucher_id = v.id
  WHERE v.status = 'POSTED' AND v.date <= ?
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
`).all(cutoffDate);

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
    WHERE l.ledger_id = ? AND v.status = 'POSTED' AND v.date <= ?
    ORDER BY v.date, v.id
  `).all(ledger.id, cutoffDate);

  let balance = 0;
  
  lines.forEach(line => {
    balance += (line.debit - line.credit);
    const narration = (line.narration || '').replace(/;/g, ',');
    console.log(
      `${ledger.name};${line.date};${line.voucher_no};${line.voucher_type};${narration};${line.debit};${line.credit};${balance.toFixed(2)}`
    );
  });
});

console.error(`\n// Export complete: ${ledgers.length} ledgers, up to ${cutoffDate}`);
