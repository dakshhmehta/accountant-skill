const fs = require('fs');
const engine = require('../lib/posting-engine');

function main() {
    const payloadPath = process.argv[2];
    if (!payloadPath) {
        console.error("Usage: node post-voucher.js <payload.json>");
        process.exit(1);
    }
    const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
    
    if (payload.voucher.status !== 'CONFIRMED' && payload.voucher.status !== 'POSTED') {
        console.error("Maker-Checker Rule Enforced: Voucher must be CONFIRMED before posting.");
        process.exit(1);
    }

    try {
        const id = engine.postVoucher(payload.voucher, payload.lines);
        console.log(`Successfully posted voucher ID: ${id}`);
    } catch (e) {
        console.error("Posting failed:", e.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
