const { getDb, resolveCompany, getCompanyMeta } = require('../lib/db');

function main() {
    const company = resolveCompany();
    const db = getDb(company);
    const meta = getCompanyMeta(company);

    console.log(`GST General Ledger — ${meta ? meta.name : company} (${company})`);

    const gstLedgers = db.prepare("SELECT id, name FROM ledgers WHERE name LIKE '%GST%' ORDER BY name").all();

    gstLedgers.forEach(gst => {
      console.log(`\n=== ${gst.name} ===`);
      
      const lines = db.prepare(`
        SELECT v.voucher_no, v.type, v.date, v.narration, v.source_doc_no, l.debit, l.credit
        FROM lines l
        JOIN vouchers v ON l.voucher_id = v.id
        WHERE l.ledger_id = ? AND v.status = 'POSTED'
        ORDER BY v.date, v.id
      `).all(gst.id);
      
      let balance = 0;
      
      if (lines.length === 0) {
        console.log('  No transactions');
      } else {
        console.log('  Date        | Voucher  | Debit       | Credit      | Balance     | Narration');
        console.log('  ' + '-'.repeat(85));
        
        lines.forEach(line => {
          balance += (line.credit - line.debit);
          console.log(
            '  ' + (line.date || 'N/A').padEnd(11) + ' | ' +
            (line.voucher_no || 'N/A').padEnd(8) + ' | ' +
            (line.debit || 0).toFixed(2).padStart(10) + ' | ' +
            (line.credit || 0).toFixed(2).padStart(10) + ' | ' +
            balance.toFixed(2).padStart(10) + ' | ' +
            (line.narration || '').substring(0, 40)
          );
        });
      }
      
      console.log('  ' + '-'.repeat(85));
      console.log(`  Closing Balance: ${balance.toFixed(2)} Cr`);
    });
}

if (require.main === module) {
    main();
}
