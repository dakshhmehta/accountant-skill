const db = require('../lib/db');
const engine = require('../lib/posting-engine');

function reverseVoucher(voucherNo) {
    const voucher = db.prepare("SELECT * FROM vouchers WHERE voucher_no = ?").get(voucherNo);
    if (!voucher) throw new Error("Voucher not found");
    
    const lines = db.prepare("SELECT * FROM lines WHERE voucher_id = ?").all(voucher.id);
    
    const reversedLines = lines.map(line => ({
        ledger_id: line.ledger_id,
        debit: line.credit,
        credit: line.debit
    }));

    const reversedVoucher = {
        type: voucher.type,
        date: voucher.date,
        amount: voucher.amount,
        narration: `Reversal of ${voucher.voucher_no}: ${voucher.narration || ''}`,
        source_doc_type: voucher.source_doc_type,
        source_doc_no: voucher.source_doc_no,
        status: 'POSTED',
        request_id: null, // No duplicate check
        tax_rate: voucher.tax_rate
    };

    return engine.postVoucher(reversedVoucher, reversedLines);
}

const vouchersToReverse = [
  'SE-0003', 'SE-0004', 'SE-0005', 'SE-0006', 
  'SE-0007', 'SE-0008', 'SE-0009', 'SE-0010', 
  'SE-0011', 'SE-0012', 'SE-0013'
];

console.log('=== Reversing 11 BJRR + 1 Velji Invoices ===');
console.log('');

vouchersToReverse.forEach(voucherNo => {
  try {
    const id = reverseVoucher(voucherNo);
    console.log(`✓ Reversed ${voucherNo} → New Voucher ID: ${id}`);
  } catch (e) {
    console.error(`✗ Failed to reverse ${voucherNo}: ${e.message}`);
  }
});

console.log('');
console.log('=== Reversal Complete ===');
