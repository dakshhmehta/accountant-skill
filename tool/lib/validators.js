/**
 * Create validators bound to a specific database connection.
 * @param {import('better-sqlite3').Database} db
 */
function createValidators(db) {
  function validateCompleteness(voucherData, linesData) {
    if (!voucherData.date || !voucherData.amount || !voucherData.type) {
      throw new Error("Missing required voucher fields: date, amount, type");
    }
    if (!linesData || linesData.length < 2) {
      throw new Error("A voucher must have at least two lines.");
    }
    for (let line of linesData) {
      if (!line.ledger_id) {
        throw new Error("All lines must specify a ledger_id");
      }
    }
  }

  function validateDoubleEntry(linesData) {
    let sumDebit = 0;
    let sumCredit = 0;
    for (let line of linesData) {
      sumDebit += (line.debit || 0);
      sumCredit += (line.credit || 0);
    }
    if (Math.abs(sumDebit - sumCredit) > 0.001) {
      throw new Error(`Unbalanced entry. Total Debits (${sumDebit}) != Total Credits (${sumCredit})`);
    }
  }

  function validatePeriodOpen(date) {
    const periodStatus = db.prepare("SELECT value FROM config WHERE key = 'period_status'").get();
    if (periodStatus && periodStatus.value === 'CLOSED') {
      throw new Error("Cannot post into a closed period.");
    }
  }

  function validateDuplicate(voucherData) {
    if (voucherData.request_id) {
      const existing = db.prepare("SELECT id FROM vouchers WHERE request_id = ?").get(voucherData.request_id);
      if (existing) {
        throw new Error(`Duplicate request: voucher with request_id ${voucherData.request_id} already exists.`);
      }
    }
  }

  return {
    validateCompleteness,
    validateDoubleEntry,
    validatePeriodOpen,
    validateDuplicate,
  };
}

// Backward-compatible singleton: lazy-init on first use
let _cachedDb = null;
let _cachedValidators = null;

function getDefaultValidators() {
  if (!_cachedValidators) {
    const { resolveCompany, getDb } = require('./db');
    _cachedDb = getDb(resolveCompany());
    _cachedValidators = createValidators(_cachedDb);
  }
  return _cachedValidators;
}

// Export factory AND backward-compatible accessors
module.exports = {
  createValidators,
  get validateCompleteness() { return getDefaultValidators().validateCompleteness; },
  get validateDoubleEntry() { return getDefaultValidators().validateDoubleEntry; },
  get validatePeriodOpen() { return getDefaultValidators().validatePeriodOpen; },
  get validateDuplicate() { return getDefaultValidators().validateDuplicate; },
};
