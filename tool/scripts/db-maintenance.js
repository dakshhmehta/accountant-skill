const { getDb, resolveCompany, getCompanyMeta } = require('../lib/db');

function main() {
    const company = resolveCompany();
    const db = getDb(company);
    const meta = getCompanyMeta(company);

    console.log(`Database Maintenance — ${meta ? meta.name : company} (${company})`);
    
    db.exec("VACUUM");
    console.log("✓ VACUUM completed.");
    
    db.exec("ANALYZE");
    console.log("✓ ANALYZE completed.");
    
    const wal = db.prepare("PRAGMA wal_checkpoint(FULL)").get();
    console.log("✓ WAL Checkpoint:", JSON.stringify(wal));
}

if (require.main === module) {
    main();
}
