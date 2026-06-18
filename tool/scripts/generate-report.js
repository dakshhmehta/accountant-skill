const { getDb, resolveCompany, getCompanyMeta } = require('../lib/db');

function generateTrialBalance(db, company, meta) {
    const rows = db.prepare(`
        SELECT 
            l.name,
            l.type,
            SUM(li.debit) as total_debit,
            SUM(li.credit) as total_credit,
            (SUM(li.debit) - SUM(li.credit)) as net_balance
        FROM ledgers l
        JOIN lines li ON l.id = li.ledger_id
        JOIN vouchers v ON li.voucher_id = v.id
        WHERE v.status = 'POSTED'
        GROUP BY l.id
    `).all();

    console.log(`\n=== TRIAL BALANCE — ${meta ? meta.name : company} ===`);
    let totalDr = 0, totalCr = 0;
    
    rows.forEach(r => {
        const bal = r.net_balance;
        const dispDr = bal > 0 ? bal : 0;
        const dispCr = bal < 0 ? Math.abs(bal) : 0;
        console.log(`${r.name.padEnd(25)} | Dr: ${dispDr.toFixed(2).padStart(10)} | Cr: ${dispCr.toFixed(2).padStart(10)}`);
        totalDr += dispDr;
        totalCr += dispCr;
    });

    console.log('-'.repeat(55));
    console.log(`${'TOTAL'.padEnd(25)} | Dr: ${totalDr.toFixed(2).padStart(10)} | Cr: ${totalCr.toFixed(2).padStart(10)}`);
}

function main() {
    const company = resolveCompany();
    const db = getDb(company);
    const meta = getCompanyMeta(company);
    const type = process.argv[2] || 'trial-balance';
    
    console.log(`Company: ${meta ? meta.name : company} (${company})`);
    
    if (type === 'trial-balance') {
        generateTrialBalance(db, company, meta);
    } else {
        console.log(`Report type ${type} not fully implemented yet.`);
    }
}

if (require.main === module) {
    main();
}
