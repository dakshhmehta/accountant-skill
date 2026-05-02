const db = require('../lib/db');

function setup() {
    console.log('Setting up Romin Interactive...\n');

    // 1. Set Company Config
    const insertConfig = db.prepare(`INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)`);
    insertConfig.run('company_name', 'Romin Interactive');
    insertConfig.run('fy_start', '2026-04-01');
    insertConfig.run('fy_end', '2027-03-31');
    insertConfig.run('owner_state_code', 'Gujarat');
    insertConfig.run('base_currency', 'INR');
    console.log('✓ Company config set');

    // 2. Create Ledger Groups
    const insertGroup = db.prepare(`INSERT OR IGNORE INTO ledger_groups (name, parent_group_id) VALUES (?, ?)`);
    const groups = [
        ['Assets', null],
        ['Liabilities', null],
        ['Equity', null],
        ['Income', null],
        ['Expenses', null],
        ['Cash & Bank', 1],      // Under Assets
        ['Current Assets', 1],   // Under Assets
        ['Current Liabilities', 2], // Under Liabilities
        ['Direct Income', 4],    // Under Income
        ['Indirect Expenses', 5] // Under Expenses
    ];

    groups.forEach(g => {
        try {
            insertGroup.run(g[0], g[1]);
        } catch (e) {
            // Group may already exist
        }
    });
    console.log('✓ Ledger groups created');

    // Get group IDs
    const getGroup = db.prepare(`SELECT id FROM ledger_groups WHERE name = ?`);
    const cashBankGroup = getGroup.get('Cash & Bank').id;
    const currentLiabGroup = getGroup.get('Current Liabilities').id;
    const directIncomeGroup = getGroup.get('Direct Income').id;
    const indirectExpGroup = getGroup.get('Indirect Expenses').id;
    const equityGroup = getGroup.get('Equity').id;

    // 3. Create Ledgers
    const insertLedger = db.prepare(`
        INSERT OR IGNORE INTO ledgers (name, type, normal_balance, parent_group_id)
        VALUES (?, ?, ?, ?)
    `);

    const ledgers = [
        // Assets
        ['Cash', 'Asset', 'Debit', cashBankGroup],
        ['DCB Bank', 'Asset', 'Debit', cashBankGroup],

        // Liabilities
        ['Credit Card - RD', 'Liability', 'Credit', currentLiabGroup],

        // Equity
        ['Partner Capital', 'Equity', 'Credit', equityGroup],

        // Income
        ['Domain Hosting Income', 'Income', 'Credit', directIncomeGroup],
        ['Laravel Projects Income', 'Income', 'Credit', directIncomeGroup],
        ['ERP Income', 'Income', 'Credit', directIncomeGroup],
        ['Website Income', 'Income', 'Credit', directIncomeGroup],

        // Expenses
        ['Payroll Expenses', 'Expense', 'Debit', indirectExpGroup],
        ['Hosting Expenses', 'Expense', 'Debit', indirectExpGroup]
    ];

    ledgers.forEach(l => {
        try {
            insertLedger.run(l[0], l[1], l[2], l[3]);
        } catch (e) {
            console.error(`Failed to create ledger ${l[0]}:`, e.message);
        }
    });
    console.log('✓ Ledgers created');

    // 4. Verify
    const allLedgers = db.prepare(`SELECT name, type, normal_balance FROM ledgers ORDER BY type, name`).all();
    console.log('\n=== Chart of Accounts ===');
    allLedgers.forEach(l => {
        console.log(`  ${l.name} (${l.type}, ${l.normal_balance})`);
    });

    console.log('\n✓ Setup complete for Romin Interactive');
}

setup();
