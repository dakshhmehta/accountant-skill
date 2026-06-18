const { getDb, resolveCompany, getCompanyMeta } = require('../lib/db');

function main() {
    const company = resolveCompany();
    const db = getDb(company);
    const meta = getCompanyMeta(company);

    const ledgerName = process.argv[2];
    if (!ledgerName) {
        console.error("Usage: node ledger-query.js <ledger_name> [--company <slug>]");
        process.exit(1);
    }
    
    console.log(`Company: ${meta ? meta.name : company} (${company})`);
    
    const ledger = db.prepare("SELECT * FROM ledgers WHERE name = ?").get(ledgerName);
    if (!ledger) {
        console.error(`Ledger "${ledgerName}" not found.`);
        process.exit(1);
    }
    
    const lines = db.prepare(`
        SELECT v.date, v.voucher_no, v.narration, l.debit, l.credit
        FROM lines l
        JOIN vouchers v ON l.voucher_id = v.id
        WHERE l.ledger_id = ? AND v.status = 'POSTED'
        ORDER BY v.date ASC, v.id ASC
    `).all(ledger.id);
    
    console.log(`\n=== LEDGER: ${ledgerName} (${ledger.type}) ===`);
    let running = 0;
    lines.forEach(l => {
        running += (l.debit || 0) - (l.credit || 0);
        console.log(`${l.date} | ${l.voucher_no.padEnd(10)} | Dr: ${String(l.debit || 0).padStart(8)} | Cr: ${String(l.credit || 0).padStart(8)} | Bal: ${running.toFixed(2).padStart(10)} | ${l.narration || ''}`);
    });
    console.log(`\nClosing Balance: ${running.toFixed(2)}`);
}

if (require.main === module) {
    main();
}
