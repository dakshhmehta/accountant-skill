const { createValidators } = require('./validators');

/**
 * Create a posting engine bound to a specific database connection.
 * @param {import('better-sqlite3').Database} db
 * @param {object} [validators] - optional validators instance (auto-created from db if omitted)
 */
function createPostingEngine(db, validators) {
  const v = validators || createValidators(db);

  const stmts = {
    insertVoucher: db.prepare(`
      INSERT INTO vouchers (voucher_no, type, date, amount, narration, source_doc_type, source_doc_no, status, request_id)
      VALUES (@voucher_no, @type, @date, @amount, @narration, @source_doc_type, @source_doc_no, @status, @request_id)
    `),
    insertLine: db.prepare(`
      INSERT INTO lines (voucher_id, ledger_id, debit, credit)
      VALUES (@voucher_id, @ledger_id, @debit, @credit)
    `),
    insertAuditLog: db.prepare(`
      INSERT INTO audit_log (event_type, entity_id, before_json, after_json)
      VALUES (@event_type, @entity_id, @before_json, @after_json)
    `),
  };

  function generateVoucherNo(type) {
    const res = db.prepare("SELECT COALESCE(MAX(CAST(SUBSTR(voucher_no, INSTR(voucher_no, '-')+1) AS INTEGER)), 0) as count FROM vouchers WHERE type = ?").get(type);
    const num = res.count + 1;
    return `${type}-${String(num).padStart(4, '0')}`;
  }

  function postVoucher(voucherData, linesData) {
    v.validateCompleteness(voucherData, linesData);
    v.validateDoubleEntry(linesData);
    v.validatePeriodOpen(voucherData.date);
    v.validateDuplicate(voucherData);

    const transaction = db.transaction(() => {
      const voucherNo = voucherData.voucher_no || generateVoucherNo(voucherData.type);

      const voucherInsert = stmts.insertVoucher.run({
        voucher_no: voucherNo,
        type: voucherData.type,
        date: voucherData.date,
        amount: voucherData.amount,
        narration: voucherData.narration || null,
        source_doc_type: voucherData.source_doc_type || null,
        source_doc_no: voucherData.source_doc_no || null,
        status: voucherData.status || 'POSTED',
        request_id: voucherData.request_id || null
      });

      const voucherId = voucherInsert.lastInsertRowid;

      for (let line of linesData) {
        stmts.insertLine.run({
          voucher_id: voucherId,
          ledger_id: line.ledger_id,
          debit: line.debit || 0,
          credit: line.credit || 0
        });
      }

      stmts.insertAuditLog.run({
        event_type: 'VOUCHER_POSTED',
        entity_id: voucherId,
        before_json: null,
        after_json: JSON.stringify({ voucher: voucherData, lines: linesData })
      });

      return voucherId;
    });

    return transaction();
  }

  return {
    generateVoucherNo,
    postVoucher,
  };
}

// Backward-compatible lazy singleton
let _cachedEngine = null;
function getDefaultEngine() {
  if (!_cachedEngine) {
    const { resolveCompany, getDb } = require('./db');
    _cachedEngine = createPostingEngine(getDb(resolveCompany()));
  }
  return _cachedEngine;
}

module.exports = {
  createPostingEngine,
  get generateVoucherNo() { return getDefaultEngine().generateVoucherNo; },
  get postVoucher() { return getDefaultEngine().postVoucher; },
};
