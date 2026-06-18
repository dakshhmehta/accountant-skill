const fs = require('fs');
const { getDb, resolveCompany, getCompanyMeta } = require('../lib/db');
const { createPostingEngine } = require('../lib/posting-engine');
const { createGstEngine } = require('../lib/gst-engine');

function main() {
    const company = resolveCompany();
    const db = getDb(company);
    const meta = getCompanyMeta(company);
    const engine = createPostingEngine(db);
    const gstEngine = createGstEngine(db);

    const payloadPath = process.argv[2];
    if (!payloadPath) {
        console.error("Usage: node post-voucher.js <payload.json> [--company <slug>]");
        process.exit(1);
    }
    const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
    
    console.log(`Company: ${meta ? meta.name : company} (${company})`);
    if (meta?.gst_registered === false) console.log(`⚠ Non-GST company — GST compliance checks skipped`);
    
    if (payload.voucher.status !== 'CONFIRMED' && payload.voucher.status !== 'POSTED') {
        console.error("Maker-Checker Rule Enforced: Voucher must be CONFIRMED before posting.");
        process.exit(1);
    }

    // Secondary GST checks at post time (only for GST-registered companies)
    if (meta?.gst_registered !== false) {
      const partyLine = payload.lines[0];
      const partyLedger = db.prepare("SELECT * FROM ledgers WHERE id = ?").get(partyLine?.ledger_id);
      const companyStateConfig = db.prepare("SELECT value FROM config WHERE key = 'owner_state_code'").get();
      const companyState = companyStateConfig ? companyStateConfig.value : 'Gujarat';

      const flags = gstEngine.runMissedGSTRules(payload.voucher, payload.lines, partyLedger, companyState);
      if (flags.hardStops.length > 0) {
        console.error(`GST Hard Stop Execution Blocked: ${flags.hardStops.join(' | ')}`);
        process.exit(1);
      }
    }

    payload.voucher.status = 'POSTED';
    
    try {
        const id = engine.postVoucher(payload.voucher, payload.lines);
        console.log(`✓ Posted voucher ID: ${id} to ${company}`);
    } catch (e) {
        console.error("Posting failed:", e.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
