const fs = require('fs');
const { getDb, resolveCompany, getCompanyMeta } = require('../lib/db');
const { createPostingEngine } = require('../lib/posting-engine');
const { reverseVoucher } = require('./reverse-voucher');

function main() {
    const company = resolveCompany();
    const db = getDb(company);
    const meta = getCompanyMeta(company);
    const engine = createPostingEngine(db);

    const voucherNo = process.argv[2];
    const newPayloadPath = process.argv[3];
    
    if (!voucherNo || !newPayloadPath) {
        console.error("Usage: node rectify-entry.js <original_voucher_no> <new_payload.json> [--company <slug>]");
        process.exit(1);
    }

    console.log(`Company: ${meta ? meta.name : company} (${company})`);
    
    // 1. Reverse the original
    const revId = reverseVoucher(db, voucherNo);
    console.log(`✓ Reversed original voucher ${voucherNo}. Reversal ID: ${revId}`);
    
    // 2. Post the new entry
    const payload = JSON.parse(fs.readFileSync(newPayloadPath, 'utf8'));
    payload.voucher.status = 'POSTED';
    
    try {
        const id = engine.postVoucher(payload.voucher, payload.lines);
        console.log(`✓ Posted corrected voucher ID: ${id}`);
    } catch (e) {
        console.error("Correction failed:", e.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
