const fs = require('fs');
const validators = require('../lib/validators');

function main() {
    const payloadPath = process.argv[2];
    if (!payloadPath) {
        console.error("Usage: node preview-voucher.js <payload.json>");
        process.exit(1);
    }
    const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

    console.log("=== PREVIEW VOUCHER ===");
    console.log(`Type: ${payload.voucher.type}`);
    console.log(`Amount: ${payload.voucher.amount}`);
    
    try {
        validators.validateCompleteness(payload.voucher, payload.lines);
        validators.validateDoubleEntry(payload.lines);
        validators.validatePeriodOpen(payload.voucher.date);
        
        console.log("\nJournal Entry:");
        payload.lines.forEach(line => {
            console.log(`Ledger ID: ${line.ledger_id} | Dr: ${line.debit || 0} | Cr: ${line.credit || 0}`);
        });

        console.log("\nValidation Passed! This entry is safe to confirm.");
    } catch (e) {
        console.error("\nValidation Failed:", e.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
