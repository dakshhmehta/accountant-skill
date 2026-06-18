const { getDb, resolveCompany, getCompanyMeta } = require('../lib/db');

function closePeriod(db) {
    const stmt = db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('period_status', 'CLOSED')");
    stmt.run();
    return 'CLOSED';
}

function main() {
    const company = resolveCompany();
    const db = getDb(company);
    const meta = getCompanyMeta(company);

    console.log(`Closing period for: ${meta ? meta.name : company} (${company})`);
    
    const status = closePeriod(db);
    console.log(`✓ Period locked. Status set to ${status}.`);
    console.log('⚠ No further postings will be allowed until reopened.');
}

if (require.main === module) {
    main();
}
