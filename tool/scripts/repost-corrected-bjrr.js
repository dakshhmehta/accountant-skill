const db = require('../lib/db');
const engine = require('../lib/posting-engine');

// Corrected breakdown for ₹2,430 with CGST+SGST
const total = 2430;
const taxableValue = parseFloat((total / 1.18).toFixed(2)); // 2059.32
const cgst = parseFloat((taxableValue * 0.09).toFixed(2)); // 185.34
const sgst = parseFloat((total - taxableValue - cgst).toFixed(2)); // 185.34

console.log('Taxable Value:', taxableValue);
console.log('CGST:', cgst);
console.log('SGST:', sgst);
console.log('Total:', taxableValue + cgst + sgst);
console.log('');

// Invoice mapping: source_doc_no -> party ledger name
const invoiceParties = [
  { docNo: 'BJRR-001', date: '2026-04-07', party: 'Rahul Bhai - JVJ' },
  { docNo: 'BJRR-002', date: '2026-04-08', party: 'S P Jewellers' },
  { docNo: 'BJRR-003', date: '2026-04-13', party: 'SONI LAKHAMSHI UMARSHI & CO' },
  { docNo: 'BJRR-004', date: '2026-04-14', party: 'Rangnath Jewellers' },
  { docNo: 'BJRR-005', date: '2026-04-15', party: 'Soni Anil Maganlal' },
  { docNo: 'BJRR-006', date: '2026-04-16', party: 'R C Jewellers' },
  { docNo: 'BJRR-007', date: '2026-04-17', party: 'Soni Prabhudas Khetsi' },
  { docNo: 'BJRR-008', date: '2026-04-17', party: 'KP Jewellers' },
  { docNo: 'BJRR-009', date: '2026-04-18', party: 'Velji Anandji' },
  { docNo: 'BJRR-010', date: '2026-04-18', party: 'Laxmi Jewellers' },
  { docNo: 'BJRR-011', date: '2026-04-29', party: 'Soni Kantilal Premji' }
];

console.log('=== Posting 11 Corrected Invoices (CGST+SGST) ===');
console.log('');

invoiceParties.forEach((inv, index) => {
  const partyLedger = db.prepare('SELECT id FROM ledgers WHERE name = ?').get(inv.party);
  if (!partyLedger) {
    console.error(`✗ Party ledger not found: ${inv.party}`);
    return;
  }

  const voucherData = {
    type: 'SE',
    date: inv.date,
    amount: total,
    narration: `BJRR Subscription - Invoice #${inv.docNo}`,
    source_doc_type: 'Tax Invoice',
    source_doc_no: inv.docNo,
    status: 'POSTED',
    request_id: `bjrr-corrected-${String(index + 1).padStart(3, '0')}`,
    tax_rate: 18
  };

  const linesData = [
    {
      ledger_id: partyLedger.id,
      debit: total,
      credit: 0
    },
    {
      ledger_id: 22, // BJRR Income
      debit: 0,
      credit: taxableValue
    },
    {
      ledger_id: 13, // Output CGST
      debit: 0,
      credit: cgst
    },
    {
      ledger_id: 14, // Output SGST
      debit: 0,
      credit: sgst
    }
  ];

  try {
    const id = engine.postVoucher(voucherData, linesData);
    console.log(`✓ Posted ${inv.docNo} (${inv.party}) → Voucher ID: ${id}`);
  } catch (e) {
    console.error(`✗ Failed ${inv.docNo}: ${e.message}`);
  }
});

console.log('');
console.log('=== Reposting Complete ===');
