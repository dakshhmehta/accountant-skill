# Accountant Skill — Custom Changes Log

**Purpose:** Track all modifications made to the original accountant skill.
**Original files remain untouched.** All custom logic is documented here for audit and rollback.

---

## Change Log

### 2026-05-02 — GSTIN-Based Tax Jurisdiction Rule

**Rule:** When an invoice is created, if a ledger has no valid GSTIN number, always use CGST/SGST.

**Files Modified:**
1. `tool/lib/gst-engine.js`
   - Added `partyGSTIN` parameter to `determineGST()` function
   - New logic: Check `partyGSTIN` before evaluating interstate status
   - If no GSTIN → force intrastate (CGST/SGST)
   - If GSTIN exists → compare state codes for interstate/intrastate

2. `tool/scripts/preview-voucher.js`
   - Updated `determineGST()` call to pass `partyLedger?.gstin` as 6th parameter

3. `SKILL.md`
   - Added new section: **"GST Rules"**
   - Documented GSTIN-based jurisdiction rule with examples

**Rationale:** Without a valid GSTIN, the party cannot claim interstate GST benefits, so the transaction defaults to intrastate treatment.

**Rollback:** Revert to original `determineGST(baseAmount, taxRate, partyState, companyState, isPurchase, reverseChargeFlag)` signature.

---

## How to Use This Log

- Each change gets a dated entry with file paths, what changed, and why
- If reverting a change, add a "Rollback" entry referencing the original change
- Keep original files clean — modifications go in separate files when possible

### 2026-05-02 — Teem Sub-Agent Created

**What:** Created dedicated accounting sub-agent "Teem" to handle all accounting interactions.

**Files Created:**
1. `../teem/SKILL.md` — Complete agent configuration
2. `../teem/AGENT.md` — Sub-agent registration
3. `../teem/spawn.js` — Spawn helper script

**Teem Specifications:**
- On-demand only, no background execution
- Preview → Approval → Commit workflow
- Weekly review: Sunday/Monday, offer once
- Input parsers: Telegram messages + CSV (semicolon)
- Company scope: Romin Interactive only
- Authority: Human final approval required (APPROVE/POST/CONFIRM)

**Integration:**
- Loads accountant skill pack
- Isolated sessions, no cross-contamination
- 24-hour expiry for draft vouchers

---

*Last updated: 2026-05-02*
