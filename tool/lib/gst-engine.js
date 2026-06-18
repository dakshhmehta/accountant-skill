/**
 * Create GST engine bound to a specific database connection.
 * @param {import('better-sqlite3').Database} db
 */
function createGstEngine(db) {
  function getTaxLedgerId(name) {
    const l = db.prepare("SELECT id FROM ledgers WHERE name = ?").get(name);
    if (!l) {
      const insert = db.prepare(`
        INSERT INTO ledgers (name, type, normal_balance) 
        VALUES (?, 'Liability', 'Credit')
      `).run(name);
      return insert.lastInsertRowid;
    }
    return l.id;
  }

  function determineGST(baseAmount, taxRate, partyState, companyState, isPurchase, reverseChargeFlag = false, partyGSTIN = null) {
    const taxLines = [];
    if (!taxRate || taxRate === 0) return taxLines;

    const taxAmount = (baseAmount * taxRate) / 100;

    // RULE: If party has no valid GSTIN, always use CGST/SGST (intrastate)
    const hasGSTIN = partyGSTIN && partyGSTIN.trim().length > 0;
    let isInterstate = false;

    if (hasGSTIN) {
      isInterstate = partyState && companyState && (partyState.toLowerCase() !== companyState.toLowerCase());
    }

    const prefix = isPurchase ? 'Input' : 'Output';

    if (isInterstate) {
      taxLines.push({
        ledger_id: getTaxLedgerId(`${prefix} IGST`),
        debit: isPurchase ? taxAmount : 0,
        credit: !isPurchase ? taxAmount : 0,
        _gst_type: 'IGST'
      });
    } else {
      taxLines.push({
        ledger_id: getTaxLedgerId(`${prefix} CGST`),
        debit: isPurchase ? taxAmount / 2 : 0,
        credit: !isPurchase ? taxAmount / 2 : 0,
        _gst_type: 'CGST'
      });
      taxLines.push({
        ledger_id: getTaxLedgerId(`${prefix} SGST`),
        debit: isPurchase ? taxAmount / 2 : 0,
        credit: !isPurchase ? taxAmount / 2 : 0,
        _gst_type: 'SGST'
      });
    }

    return taxLines;
  }

  function runMissedGSTRules(voucherData, linesData, partyLedger, companyState) {
    const flags = {
      warnings: [],
      errors: [],
      hardStops: []
    };

    const hasTaxLines = linesData.some(l => {
      const ledger = db.prepare("SELECT name FROM ledgers WHERE id = ?").get(l.ledger_id);
      return ledger && ledger.name.includes('GST');
    });

    const isPurchase = ['PE', 'CP', 'BP'].includes(voucherData.type);
    const isSales = ['SE', 'CR', 'BR'].includes(voucherData.type);

    if (isPurchase && !hasTaxLines && partyLedger && partyLedger.registration_type !== 'unregistered') {
      flags.warnings.push("Possible Missed GST: Vendor expense without GST component.");
    }

    if (isSales && !hasTaxLines && voucherData.tax_rate > 0) {
      flags.warnings.push("Output GST Missing: Taxable sales without output GST.");
    }

    if (partyLedger && partyLedger.state_code && companyState) {
      const isInterstate = partyLedger.state_code.toLowerCase() !== companyState.toLowerCase();

      const hasIGST = linesData.some(l => {
        const led = db.prepare("SELECT name FROM ledgers WHERE id = ?").get(l.ledger_id);
        return led && led.name.includes('IGST');
      });

      const hasCGST = linesData.some(l => {
        const led = db.prepare("SELECT name FROM ledgers WHERE id = ?").get(l.ledger_id);
        return led && (led.name.includes('CGST') || led.name.includes('SGST'));
      });

      if (isInterstate && hasCGST) {
        flags.hardStops.push("Wrong tax jurisdiction: Interstate transaction using CGST/SGST.");
      }
      if (!isInterstate && hasIGST) {
        flags.hardStops.push("Wrong tax jurisdiction: Intrastate transaction using IGST.");
      }
    }

    if (partyLedger && partyLedger.registration_type === 'regular' && !partyLedger.gstin) {
      flags.warnings.push("GST master incomplete: GSTIN absent for registered party.");
    }

    if (voucherData.type === 'JE' && hasTaxLines && !voucherData._review_flag_passed) {
      flags.warnings.push("Review required: Manual JE touches GST ledgers.");
      flags.hardStops.push("Manual journal directly manipulates GST ledgers without review.");
    }

    if (!voucherData.tax_rate && partyLedger && partyLedger.default_supply_type === 'taxable') {
      flags.hardStops.push("GST rate absent for taxable supply.");
    }

    return flags;
  }

  return {
    determineGST,
    runMissedGSTRules,
  };
}

// Backward-compatible lazy singleton
let _cachedGstEngine = null;
function getDefaultGstEngine() {
  if (!_cachedGstEngine) {
    const { resolveCompany, getDb } = require('./db');
    _cachedGstEngine = createGstEngine(getDb(resolveCompany()));
  }
  return _cachedGstEngine;
}

module.exports = {
  createGstEngine,
  get determineGST() { return getDefaultGstEngine().determineGST; },
  get runMissedGSTRules() { return getDefaultGstEngine().runMissedGSTRules; },
};
