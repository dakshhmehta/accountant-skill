#!/usr/bin/env node
/**
 * Set the active company for the current session.
 * Usage:
 *   node scripts/set-company.js <slug>
 *   node scripts/set-company.js <slug> --name "Company Name" --fy apr-mar --gstin 22AAAAA0000A1Z5
 *   node scripts/set-company.js <slug> --name "Company Name" --no-gst   (non-GST company)
 */
const { setActiveCompany, registerCompany, getCompanyMeta, getDb, listCompanies } = require('../lib/db');
const { migrate } = require('./migrate-schema');
const seed = require('./seed-chart-of-accounts');

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/set-company.js <slug> [--name "Name"] [--fy apr-mar] [--gstin GSTIN | --no-gst]');
  process.exit(1);
}

// Parse optional metadata flags
let meta = {};
const nameIdx = process.argv.indexOf('--name');
if (nameIdx !== -1 && nameIdx + 1 < process.argv.length) meta.name = process.argv[nameIdx + 1];

const fyIdx = process.argv.indexOf('--fy');
if (fyIdx !== -1 && fyIdx + 1 < process.argv.length) meta.fy = process.argv[fyIdx + 1];

const gstinIdx = process.argv.indexOf('--gstin');
if (gstinIdx !== -1 && gstinIdx + 1 < process.argv.length) {
  meta.gstin = process.argv[gstinIdx + 1];
  meta.gst_registered = true;
}

if (process.argv.includes('--no-gst')) {
  meta.gst_registered = false;
}

// Check if slug already exists (for new registrations with metadata)
const existing = getCompanyMeta(slug);
const isNew = Object.keys(meta).length > 0;
const force = process.argv.includes('--force');

if (isNew && existing && !force) {
  console.error(`⚠ Slug "${slug}" already exists: ${existing.name}`);
  console.error('  Use --force to overwrite, or choose a different slug.');
  process.exit(1);
}

// Register if metadata provided
if (isNew) {
  registerCompany(slug, meta);
  const status = meta.gst_registered ? '✓ GST Registered' : '⚠ Non-GST (GST compliance skipped)';
  console.log(`Registered: ${meta.name || slug} (${slug}) — ${status}`);
}

// Set as active
setActiveCompany(slug);

// Merge CLI flags with existing registry meta (registry wins on conflict, flags fill gaps)
const company = getCompanyMeta(slug) || {};
const mergedMeta = { ...meta, ...company, ...meta }; // meta (CLI flags) override for explicit settings

// Ensure DB schema and chart of accounts (idempotent)
const db = getDb(slug);
migrate(db);
seed(db, mergedMeta);

if (mergedMeta && mergedMeta.name) {
  console.log(`✓ Active company set to: ${mergedMeta.name} (${slug})`);
  if (mergedMeta.fy) console.log(`  FY: ${mergedMeta.fy}`);
  if (mergedMeta.gstin || mergedMeta.gst_registered) {
    console.log(`  GSTIN: ${mergedMeta.gstin || 'N/A'}`);
    console.log(`  GST: Registered — compliance checks enforced`);
  } else if (mergedMeta.gst_registered === false) {
    console.log(`  GST: Not registered — GST compliance checks will be skipped`);
  }
} else {
  console.log(`✓ Active company set to: ${slug} (metadata not yet registered)`);
  console.log(`  Tip: re-run with --name, --fy, and --gstin or --no-gst to register`);
}
