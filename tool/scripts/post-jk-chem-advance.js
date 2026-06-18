const db = require('../lib/db');
const engine = require('../lib/posting-engine');

// JK Chem advance payment received April 23, 2026
// Invoice raised later on May 2 (SE-0015)
// This BR clears the party balance

const voucherData = {
    type: 'BR',
    date: '2026-04-23',
    amount: 4700,
    narration: 'Advance received from JK Chem Industries LLP for domain hosting and workspace',
    source_doc_type: 'Bank Receipt',
    source_doc_no: 'ADV-JKCHEM-001',
    status: 'POSTED',
    request_id: 'br-jkchem-adv-001'
};

const linesData = [
    {
        ledger_id: 2, // DCB Bank
        debit: 4700,
        credit: 0
    },
    {
        ledger_id: 40, // JK Chem Industries LLP
        debit: 0,
        credit: 4700
    }
];

try {
    const id = engine.postVoucher(voucherData, linesData);
    console.log('Successfully posted BR voucher ID:', id);
    console.log('JK Chem advance received: ₹4,700 on April 23, 2026');
} catch (e) {
    console.error('Posting failed:', e.message);
}
