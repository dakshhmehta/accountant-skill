#!/usr/bin/env node
/**
 * Remove a company — deletes .db file, registry entry, and cached connection.
 * ⛔ Destructive. Requires --force flag.
 * ⛔ Master-only. User mode restricted.
 * 
 * Usage:
 *   node scripts/remove-company.js <slug> --force
 *   node scripts/remove-company.js <slug> --force --company <slug>
 */
const { removeCompany, listCompanies } = require('../lib/db');

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/remove-company.js <slug> --force');
  const companies = listCompanies();
  console.error('\nAvailable companies:');
  companies.forEach(c => console.error(`  ${c.slug.padEnd(18)} ${c.name}`));
  process.exit(1);
}

const force = process.argv.includes('--force');
if (!force) {
  console.error('⛔ This is a destructive operation.');
  console.error(`   Company: ${slug}`);
  console.error('   Re-run with --force to confirm deletion.');
  process.exit(1);
}

try {
  const result = removeCompany(slug, { force: true });
  console.log(`✓ Company removed: ${result.name} (${result.slug})`);
  console.log('  Database file deleted.');
  console.log('  Registry entry removed.');
} catch (e) {
  console.error('✕ Failed:', e.message);
  process.exit(1);
}
