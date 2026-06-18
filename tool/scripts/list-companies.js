#!/usr/bin/env node
/**
 * List all registered companies.
 * Usage:
 *   node scripts/list-companies.js
 *   node scripts/list-companies.js --json
 */
const { listCompanies, getActiveCompany } = require('../lib/db');

const companies = listCompanies();
const active = getActiveCompany();
const asJson = process.argv.includes('--json');

if (asJson) {
  console.log(JSON.stringify({ active, companies }, null, 2));
  process.exit(0);
}

if (companies.length === 0) {
  console.log('No companies registered. Use: node scripts/set-company.js <slug> --name "Company Name"');
  process.exit(0);
}

console.log('Companies:');
console.log('-'.repeat(75));
for (const c of companies) {
  const marker = c.slug === active ? ' ★ ACTIVE' : '';
  const gstLabel = c.gstin ? 'GST ✓' : (c.gst_registered === false ? 'Non-GST' : '—');
  console.log(`  ${c.slug.padEnd(20)} ${c.name.padEnd(25)} FY: ${(c.fy || 'N/A').padEnd(8)} ${gstLabel}${marker}`);
}
console.log('-'.repeat(75));
console.log(`Total: ${companies.length} company(s)`);

if (!active) {
  console.log('\n⚠ No active company set. Run: node scripts/set-company.js <slug>');
}
