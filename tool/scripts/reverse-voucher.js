const { getDb, resolveCompany, getCompanyMeta } = require('../lib/db');
const { createPostingEngine } = require('../lib/posting-engine');

function reverseVoucher(db, voucherNo) {
    const engine = createPostingEngine(db);

    const voucher = db.prepare("SELECT * FROM vouchers WHERE voucher_no = ?").get(voucherNo);
    if (!voucher) throw new Error(`Voucher "${voucherNo}" not found`);
    
    const lines = db.prepare("SELECT * FROM lines WHERE voucher_id = ?").all(voucher.id);
    
    const reversedLines = lines.map(line => ({
        ledger_id: line.ledger_id,
        debit: line.credit,
        credit: line.debit
    }));

    const reversedVoucher = {
        ...voucher,
        id: undefined,
        voucher_no: null,
        status: 'POSTED',
        narration: `Reversal of ${voucher.voucher_no}: ${voucher.narration || ''}`
    };

    return engine.postVoucher(reversedVoucher, reversedLines);
}

function main() {
    const company = resolveCompany();
    const db = getDb(company);
    const meta = getCompanyMeta(company);

    const voucherNo = process.argv[2];
    if (!voucherNo) {
        console.error("Usage: node reverse-voucher.js <voucher_no> [--company <slug>]");
        process.exit(1);
    }

    console.log(`Company: ${meta ? meta.name : company} (${company})`);

    try {
        const id = reverseVoucher(db, voucherNo);
        console.log(`✓ Reversed ${voucherNo}. Reversal Voucher ID: ${id}`);
    } catch (e) {
        console.error("Reversal failed:", e.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { reverseVoucher };
