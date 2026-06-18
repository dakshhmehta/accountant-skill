const { getDb, resolveCompany, getCompanyMeta } = require('../lib/db');

function main() {
    const company = resolveCompany();
    const db = getDb(company);
    const meta = getCompanyMeta(company);

    console.log(`Reconciliation — ${meta ? meta.name : company} (${company})`);
    console.log("Reconciliation logic: fetch bank ledger entries and compare against imported statements.");
    console.log("(To be implemented with bank statement import.)");
}

if (require.main === module) {
    main();
}
