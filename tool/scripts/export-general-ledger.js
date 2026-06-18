const { getDb, resolveCompany, getCompanyMeta } = require('../lib/db');

function main() {
    const company = resolveCompany();
    const db = getDb(company);
    const meta = getCompanyMeta(company);

    console.log(`General Ledger Export — ${meta ? meta.name : company} (${company})`);
    console.log('-'.repeat(80));

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

    ledgers.forEach(ledger => {
      const lines = db.prepare(`
        SELECT v.date, v.voucher_no, v.type as voucher_type, v.narration, l.debit, l.credit
        FROM lines l
        JOIN vouchers v ON l.voucher_id = v.id
        WHERE l.ledger_id = ? AND v.status = 'POSTED'
        ORDER BY v.date, v.id
      `).all(ledger.id);

      console.log(`\n${ledger.name} (${ledger.type})`);
      console.log(`${'Date'.padEnd(12)} ${'Voucher'.padEnd(12)} ${'Debit'.padStart(10)} ${'Credit'.padStart(10)} ${'Balance'.padStart(12)}  Narration`);

      let balance = 0;
      lines.forEach(line => {
        balance += (line.debit - line.credit);
        console.log(
          `${line.date}`.padEnd(12) +
          `${line.voucher_no}`.padEnd(12) +
          `${line.debit.toFixed(2)}`.padStart(10) +
          `${line.credit.toFixed(2)}`.padStart(10) +
          `${balance.toFixed(2)}`.padStart(12) +
          `  ${(line.narration || '')}`
        );
      });
      console.log(`${'Closing Bal:'.padStart(36)} ${balance.toFixed(2).padStart(10)}`);
    });
}

if (require.main === module) {
    main();
}
