const db = require('../lib/db');
const engine = require('../lib/posting-engine');

// JK Chem Invoice
// Domain: jkchemicalind.com - ₹1,460
// Google Workspace - ₹3,240
// Total: ₹4,700 (incl. GST)
// GSTIN: 24AAWFJ6908LIZN (Gujarat)
// Company: Romin Interactive, Gujarat
// Intrastate = CGST 9% + SGST 9%

const totalWithGST = 4700;
const taxableValue = parseFloat((totalWithGST / 1.18).toFixed(2)); // 3983.05
const cgst = parseFloat((taxableValue * 0.09).toFixed(2)); // 358.47
const sgst = parseFloat((totalWithGST - taxableValue - cgst).toFixed(2)); // 358.48

console.log('Taxable Value:', taxableValue);
console.log('CGST:', cgst);
console.log('SGST:', sgst);
console.log('Total:', taxableValue + cgst + sgst);

const voucherData = {
    type: 'SE',
    date: '2026-05-02',
    amount: totalWithGST,
    narration: 'Domain Hosting & Google Workspace - Invoice to JK Chem Industries LLP',
    source_doc_type: 'Tax Invoice',
    source_doc_no: 'INV-JKCHEM-001',
    status: 'POSTED',
    request_id: 'inv-jkchem-001',
    tax_rate: 18
};

const linesData = [
    {
        ledger_id: 40, // JK Chem Industries LLP
        debit: totalWithGST,
        credit: 0
    },
    {
        ledger_id: 5, // Domain Hosting Income
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
    console.log('Successfully posted voucher ID:', id);
} catch (e) {
    console.error('Posting failed:', e.message);
}
