#!/usr/bin/env node
/**
 * Seed chart of accounts for a company.
 * Idempotent — safe to run multiple times.
 * 
 * Usage (standalone):
 *   node scripts/seed-chart-of-accounts.js <slug>
 * 
 * Usage (module):
 *   const seed = require('./seed-chart-of-accounts');
 *   seed(db, meta); // db = better-sqlite3 connection, meta = { gst_registered, owner_state_code, ... }
 */
const { getDb, resolveCompany, getCompanyMeta } = require('../lib/db');

function seed(db, meta = {}) {
  const gstRegistered = meta.gst_registered !== false;

  const insertGroup = db.prepare('INSERT OR IGNORE INTO ledger_groups (name, parent_group_id) VALUES (?, ?)');
  const insertConfig = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
  const insertLedger = db.prepare('INSERT OR IGNORE INTO ledgers (name, type, normal_balance, parent_group_id, rcm_flag) VALUES (?, ?, ?, ?, ?)');

  const tx = db.transaction(() => {
    // === Config ===
    if (meta.name) insertConfig.run('company_name', meta.name);
    insertConfig.run('fy_start', '2026-04-01');
    insertConfig.run('fy_end', '2027-03-31');
    if (meta.owner_state_code) insertConfig.run('owner_state_code', meta.owner_state_code);
    insertConfig.run('base_currency', 'INR');

    // === Top-level groups ===
    const topGroups = ['Assets', 'Liabilities', 'Equity', 'Income', 'Expenses'];
    for (const g of topGroups) insertGroup.run(g, null);

    const getGroupId = db.prepare('SELECT id FROM ledger_groups WHERE name = ?');
    const assetsId = getGroupId.get('Assets').id;
    const liabId = getGroupId.get('Liabilities').id;
    const incId = getGroupId.get('Income').id;
    const expId = getGroupId.get('Expenses').id;
    const equityId = getGroupId.get('Equity').id;

    // === Sub-groups ===
    const subs = [
      ['Cash & Bank', assetsId],
      ['Current Assets', assetsId],
      ['Current Liabilities', liabId],
      ['Direct Income', incId],
      ['Indirect Expenses', expId],
    ];
    for (const s of subs) insertGroup.run(s[0], s[1]);

    const cashBankId = getGroupId.get('Cash & Bank').id;
    const currLiabId = getGroupId.get('Current Liabilities').id;
    const directIncId = getGroupId.get('Direct Income').id;
    const indirectExpId = getGroupId.get('Indirect Expenses').id;

    // === Core ledgers ===
    const coreLedgers = [
      ['Cash', 'Asset', 'Debit', cashBankId],
      ['DCB Bank', 'Asset', 'Debit', cashBankId],
      ['Credit Card - RD', 'Liability', 'Credit', currLiabId],
      ['Partner Capital', 'Equity', 'Credit', equityId],
      ['Domain Hosting Income', 'Income', 'Credit', directIncId],
      ['Laravel Projects Income', 'Income', 'Credit', directIncId],
      ['ERP Income', 'Income', 'Credit', directIncId],
      ['Website Income', 'Income', 'Credit', directIncId],
      ['Payroll Expenses', 'Expense', 'Debit', indirectExpId],
      ['Hosting Expenses', 'Expense', 'Debit', indirectExpId],
    ];
    for (const l of coreLedgers) insertLedger.run(l[0], l[1], l[2], l[3], 0);

    if (!gstRegistered) return;

    // === GST groups ===
    const currAssetId = getGroupId.get('Current Assets').id;
    insertGroup.run('GST Payable', currLiabId);
    insertGroup.run('GST ITC', currAssetId);
    insertGroup.run('RCM Liability', currLiabId);

    const gstPayableId = getGroupId.get('GST Payable').id;
    const gstItcId = getGroupId.get('GST ITC').id;
    const rcmLiabId = getGroupId.get('RCM Liability').id;

    // Output GST
    const outputGst = [
      ['Output CGST', 'Liability', 'Credit', gstPayableId],
      ['Output SGST', 'Liability', 'Credit', gstPayableId],
      ['Output IGST', 'Liability', 'Credit', gstPayableId],
    ];
    for (const l of outputGst) insertLedger.run(l[0], l[1], l[2], l[3], 0);

    // Input GST (ITC on purchases)
    const inputGst = [
      ['Input CGST', 'Asset', 'Debit', gstItcId],
      ['Input SGST', 'Asset', 'Debit', gstItcId],
      ['Input IGST', 'Asset', 'Debit', gstItcId],
    ];
    for (const l of inputGst) insertLedger.run(l[0], l[1], l[2], l[3], 0);

    // RCM (import of services)
    const rcm = [
      ['RCM CGST Payable', 'Liability', 'Credit', rcmLiabId],
      ['RCM SGST Payable', 'Liability', 'Credit', rcmLiabId],
      ['RCM IGST Payable', 'Liability', 'Credit', rcmLiabId],
      ['RCM ITC CGST', 'Asset', 'Debit', gstItcId],
      ['RCM ITC SGST', 'Asset', 'Debit', gstItcId],
      ['RCM ITC IGST', 'Asset', 'Debit', gstItcId],
    ];
    for (const l of rcm) insertLedger.run(l[0], l[1], l[2], l[3], 1);
  });

  tx();
}

function main() {
  const slug = process.argv[2] || resolveCompany();
  const db = getDb(slug);
  const meta = getCompanyMeta(slug) || {};
  seed(db, meta);
  console.log(`✓ Chart of accounts seeded for: ${meta.name || slug} (${slug})`);
}

if (require.main === module) main();
module.exports = seed;
