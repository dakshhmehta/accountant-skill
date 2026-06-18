const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DBS_DIR = path.resolve(__dirname, '..', 'dbs');
const ACTIVE_FILE = path.resolve(__dirname, '..', '.active-company');
const REGISTRY_FILE = path.resolve(DBS_DIR, 'registry.json');

// Legacy single-db path (backward compat)
const LEGACY_DB = path.resolve(__dirname, '..', 'accounting.db');

// Cache of open connections keyed by company slug
const connections = new Map();

function ensureDbsDir() {
  if (!fs.existsSync(DBS_DIR)) {
    fs.mkdirSync(DBS_DIR, { recursive: true });
  }
  if (!fs.existsSync(REGISTRY_FILE)) {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify({ companies: {} }, null, 2));
  }
}

function getDbPath(slug) {
  ensureDbsDir();
  return path.resolve(DBS_DIR, `${slug}.db`);
}

function openDb(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = FULL');
  db.pragma('busy_timeout = 5000');
  db.pragma('temp_store = MEMORY');
  return db;
}

/**
 * Get a database connection for a specific company.
 * Connections are cached per slug.
 */
function getDb(slug) {
  if (!slug) throw new Error('Company slug is required. Use --company <slug> or set ACCOUNTING_COMPANY env var.');

  if (connections.has(slug)) return connections.get(slug);

  const dbPath = getDbPath(slug);
  const db = openDb(dbPath);
  connections.set(slug, db);
  return db;
}

/**
 * Resolve the active company slug from multiple sources:
 * 1. --company CLI argument
 * 2. ACCOUNTING_COMPANY environment variable
 * 3. .active-company file
 * 
 * Call this at the top of each script:
 *   const company = resolveCompany();
 *   const db = getDb(company);
 */
function resolveCompany() {
  // 1. Parse --company from CLI args
  const companyIdx = process.argv.indexOf('--company');
  if (companyIdx !== -1 && companyIdx + 1 < process.argv.length) {
    const slug = process.argv[companyIdx + 1];
    return slug;
  }

  // 2. Environment variable
  if (process.env.ACCOUNTING_COMPANY) {
    return process.env.ACCOUNTING_COMPANY;
  }

  // 3. Active company file
  if (fs.existsSync(ACTIVE_FILE)) {
    const slug = fs.readFileSync(ACTIVE_FILE, 'utf8').trim();
    if (slug) return slug;
  }

  // 4. Legacy: if accounting.db exists in tool root, migrate it
  if (fs.existsSync(LEGACY_DB)) {
    const legacySlug = 'default';
    setActiveCompany(legacySlug);
    // Move legacy db to dbs/
    ensureDbsDir();
    const targetPath = getDbPath(legacySlug);
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(LEGACY_DB, targetPath);
      fs.unlinkSync(LEGACY_DB);
    }
    return legacySlug;
  }

  throw new Error(
    'No company selected. Use --company <slug>, set ACCOUNTING_COMPANY env var, ' +
    'or run: node scripts/set-company.js <slug>'
  );
}

/**
 * Set the active company for session-level default.
 */
function setActiveCompany(slug) {
  fs.writeFileSync(ACTIVE_FILE, slug + '\n');
}

/**
 * Get active company slug without opening a db connection.
 */
function getActiveCompany() {
  if (fs.existsSync(ACTIVE_FILE)) {
    return fs.readFileSync(ACTIVE_FILE, 'utf8').trim();
  }
  if (process.env.ACCOUNTING_COMPANY) {
    return process.env.ACCOUNTING_COMPANY;
  }
  return null;
}

/**
 * List all available companies from dbs/ directory.
 */
function listCompanies() {
  ensureDbsDir();
  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  const files = fs.readdirSync(DBS_DIR).filter(f => f.endsWith('.db')).map(f => f.replace('.db', ''));

  const companies = [];
  for (const slug of files) {
    const meta = registry.companies[slug] || {};
    companies.push({
      slug,
      name: meta.name || slug,
      fy: meta.fy || null,
      gstin: meta.gstin || null,
      gst_registered: meta.gst_registered !== false,
    });
  }
  return companies;
}

/**
 * Register a company in the registry.
 */
function registerCompany(slug, meta = {}) {
  ensureDbsDir();
  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  registry.companies[slug] = {
    ...meta,
    slug,
    created: meta.created || new Date().toISOString(),
  };
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

/**
 * Get company metadata from registry.
 */
function getCompanyMeta(slug) {
  ensureDbsDir();
  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  return registry.companies[slug] || null;
}

/**
 * Remove a company — deletes .db file, registry entry, and cached connection.
 * ⛔ Destructive. Requires --force flag.
 * Returns { removed: true, slug, name } or throws.
 */
function removeCompany(slug, opts = {}) {
  ensureDbsDir();
  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  const meta = registry.companies[slug];
  if (!meta) {
    throw new Error(`Company "${slug}" not found in registry.`);
  }
  if (!opts.force) {
    throw new Error(`removeCompany requires --force. Company: ${meta.name} (${slug}). This is destructive.`);
  }

  // Close cached connection
  if (connections.has(slug)) {
    connections.get(slug).close();
    connections.delete(slug);
  }

  // Delete .db file
  const dbPath = getDbPath(slug);
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  // Delete WAL/SHM files if present
  for (const suffix of ['-wal', '-shm']) {
    const walPath = dbPath + suffix;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  }

  // Remove from registry
  delete registry.companies[slug];
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));

  // Clear active company if it was the removed one
  const active = getActiveCompany();
  if (active === slug) {
    try { fs.unlinkSync(ACTIVE_FILE); } catch (_) {}
  }

  return { removed: true, slug, name: meta.name || slug };
}

// Lazy auto-resolve singleton for backward compatibility
// Scripts that do `require('./db')` get a db connection + all named exports patched on top
let _legacyDb = null;
function getLegacyDb() {
  if (!_legacyDb) {
    const slug = resolveCompany();
    _legacyDb = getDb(slug);
    // Patch named exports onto the db object for scripts that destructure
    _legacyDb.getDb = getDb;
    _legacyDb.getDbPath = getDbPath;
    _legacyDb.resolveCompany = resolveCompany;
    _legacyDb.setActiveCompany = setActiveCompany;
    _legacyDb.getActiveCompany = getActiveCompany;
    _legacyDb.listCompanies = listCompanies;
    _legacyDb.registerCompany = registerCompany;
    _legacyDb.removeCompany = removeCompany;
    _legacyDb.getCompanyMeta = getCompanyMeta;
    _legacyDb.openDb = openDb;
  }
  return _legacyDb;
}

// Export named functions directly (for destructured imports)
module.exports = {
  getDb,
  getDbPath,
  resolveCompany,
  setActiveCompany,
  getActiveCompany,
  listCompanies,
  registerCompany,
  removeCompany,
  getCompanyMeta,
  openDb,
  // Proxy: when accessed as a db-like object (e.g., db.prepare), delegates to legacy db
  get prepare() { return getLegacyDb().prepare.bind(getLegacyDb()); },
  get exec() { return getLegacyDb().exec.bind(getLegacyDb()); },
  get transaction() { return getLegacyDb().transaction.bind(getLegacyDb()); },
  get pragma() { return getLegacyDb().pragma.bind(getLegacyDb()); },
  get name() { try { return getLegacyDb().name; } catch(e) { return undefined; } },
};
