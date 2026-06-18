const { getDb, resolveCompany, getCompanyMeta } = require('../lib/db');

function main() {
    const company = resolveCompany();
    const db = getDb(company);
    const meta = getCompanyMeta(company);

    console.log(`Integrity Check — ${meta ? meta.name : company} (${company})`);
    console.log('-'.repeat(50));

    const integrity = db.prepare("PRAGMA integrity_check").all();
    console.log("Database Integrity:", JSON.stringify(integrity));
    
    const fks = db.prepare("PRAGMA foreign_key_check").all();
    if (fks.length > 0) {
        console.error("Foreign Key Check FAILED:", fks);
    } else {
        console.log("Foreign Key Check: OK");
    }
    
    console.log("\nChecking for unbalanced vouchers...");
    const unbalanced = db.prepare(`
        SELECT v.id, v.voucher_no, SUM(l.debit) as d, SUM(l.credit) as c 
        FROM vouchers v 
        JOIN lines l ON v.id = l.voucher_id 
        GROUP BY v.id 
        HAVING ABS(SUM(l.debit) - SUM(l.credit)) > 0.001
    `).all();
    
    if (unbalanced.length > 0) {
        console.error("❌ Found unbalanced vouchers:", JSON.stringify(unbalanced, null, 2));
    } else {
        console.log("✅ All vouchers are balanced.");
    }

    // Quick stats
    const voucherCount = db.prepare("SELECT COUNT(*) as c FROM vouchers").get().c;
    const ledgerCount = db.prepare("SELECT COUNT(*) as c FROM ledgers").get().c;
    console.log(`\nStats: ${voucherCount} vouchers | ${ledgerCount} ledgers`);
}

if (require.main === module) {
    main();
}
