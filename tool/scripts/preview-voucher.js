const fs = require('fs');
const { getDb, resolveCompany, getCompanyMeta } = require('../lib/db');
const { createValidators } = require('../lib/validators');
const { createGstEngine } = require('../lib/gst-engine');

function main() {
    const company = resolveCompany();
    const db = getDb(company);
    const meta = getCompanyMeta(company);
    const validators = createValidators(db);
    const gstEngine = createGstEngine(db);

    const payloadPath = process.argv[2];
    if (!payloadPath) {
        console.error("Usage: node preview-voucher.js <payload.json> [--company <slug>]");
        process.exit(1);
    }
    const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

    console.log("=== PREVIEW VOUCHER ===");
    console.log(`Company: ${meta ? meta.name : company} (${company})`);
    if (meta?.gstin) console.log(`GSTIN: ${meta.gstin}`);
    if (meta?.gst_registered === false) console.log(`⚠ Non-GST company — GST compliance checks skipped`);
    console.log(`Type: ${payload.voucher.type}`);
    console.log(`Amount: ${payload.voucher.amount}`);
    console.log(`Number: ${payload.voucher.number || 'Auto'}`);
    console.log(`Date: ${payload.voucher.date}`);
    console.log(`Narration: ${payload.voucher.narration || 'N/A'}`);
    
    const partyLine = payload.lines[0];
    const partyLedger = db.prepare("SELECT * FROM ledgers WHERE id = ?").get(partyLine?.ledger_id);
    
    const companyStateConfig = db.prepare("SELECT value FROM config WHERE key = 'owner_state_code'").get();
    const companyState = companyStateConfig ? companyStateConfig.value : 'Gujarat';

    // Auto-generate tax lines if applicable (only for GST-registered companies)
    if (payload.voucher.tax_rate && meta?.gst_registered !== false) {
        const isPurchase = ['PE', 'CP', 'BP'].includes(payload.voucher.type);
        const taxLines = gstEngine.determineGST(
            payload.voucher.amount, 
            payload.voucher.tax_rate, 
            partyLedger?.state_code || companyState, 
            companyState, 
            isPurchase,
            false,
            partyLedger?.gstin
        );
        payload.lines = [...payload.lines, ...taxLines];
    }
    
    // Run Missed GST Rules (only for GST-registered companies)
    const flags = meta?.gst_registered !== false
      ? gstEngine.runMissedGSTRules(payload.voucher, payload.lines, partyLedger, companyState)
      : { warnings: [], errors: [], hardStops: [] };

    try {
        validators.validateCompleteness(payload.voucher, payload.lines);
        validators.validateDoubleEntry(payload.lines);
        validators.validatePeriodOpen(payload.voucher.date);
        
        if (flags.hardStops.length > 0) {
            throw new Error(`GST Hard Stop: ${flags.hardStops.join(' | ')}`);
        }

        console.log("\nProposed Journal Entry:");
        let totalDr = 0, totalCr = 0;
        payload.lines.forEach(line => {
            const l = db.prepare("SELECT name FROM ledgers WHERE id = ?").get(line.ledger_id);
            const name = l ? l.name : `LedgerID:${line.ledger_id}`;
            totalDr += line.debit || 0;
            totalCr += line.credit || 0;
            console.log(`  ${name.padEnd(25)} | Dr: ${String(line.debit || 0).padStart(10)} | Cr: ${String(line.credit || 0).padStart(10)}`);
        });
        console.log(`  ${''.padEnd(25)} | ${'─'.repeat(27)}`);
        console.log(`  ${'TOTAL'.padEnd(25)} | Dr: ${String(totalDr.toFixed(2)).padStart(10)} | Cr: ${String(totalCr.toFixed(2)).padStart(10)}`);

        if (flags.warnings.length > 0) {
            console.log("\n⚠️  GST Warnings:");
            flags.warnings.forEach(w => console.log(`  - ${w}`));
        }

        // DOUBLE-CHECK CONFIRMATION
        console.log(`\n═══════════════════════════════════════════`);
        console.log(`⚠️  CONFIRM: Post this entry to ${meta ? meta.name : company}?`);
        console.log(`   Type: ${payload.voucher.type} | Amount: ₹${payload.voucher.amount}`);
        console.log(`   Type "yes", "go", "approved", or "do it" to confirm.`);
        console.log(`═══════════════════════════════════════════`);

        console.log("\n✅ Validation Passed! Entry is balanced and ready.");
    } catch (e) {
        console.error("\n❌ Validation Failed:", e.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
