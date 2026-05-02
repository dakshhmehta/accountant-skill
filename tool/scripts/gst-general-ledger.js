const db = require('../lib/db');

const gstLedgers = [
  { id: 13, name: 'Output CGST' },
  { id: 14, name: 'Output SGST' },
  { id: 19, name: 'Output IGST' }
];

gstLedgers.forEach(gst => {
  console.log('');
  console.log('=== ' + gst.name + ' ===');
  
  const lines = db.prepare(`
    SELECT 
      v.voucher_no,
      v.type,
      v.date,
      v.narration,
      v.source_doc_no,
      l.debit,
      l.credit
    FROM lines l
    JOIN vouchers v ON l.voucher_id = v.id
    WHERE l.ledger_id = ? AND v.status = 'POSTED'
    ORDER BY v.date, v.id
  `).all(gst.id);
  
  let balance = 0;
  
  if (lines.length === 0) {
    console.log('No transactions');
  } else {
    console.log('Date        | Voucher  | Debit      | Credit     | Balance    | Narration');
    console.log('--------------------------------------------------------------------------------');
    
    lines.forEach(line => {
      balance += (line.credit - line.debit);
      console.log(
        (line.date || 'N/A').padEnd(11) + ' | ' +
        (line.voucher_no || 'N/A').padEnd(8) + ' | ' +
        (line.debit || '').toString().padStart(10) + ' | ' +
        (line.credit || '').toString().padStart(10) + ' | ' +
        balance.toString().padStart(10) + ' | ' +
        (line.narration || '').substring(0, 40)
      );
    });
  }
  
  console.log('--------------------------------------------------------------------------------');
  console.log('Closing Balance: ' + balance.toFixed(2) + ' Cr');
});
