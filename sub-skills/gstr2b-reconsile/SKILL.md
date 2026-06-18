# gstr2b-reconsile

> Minimal GST reconciliation instruction skill. No scripts. Agent-driven.

## Purpose

Reconcile GST Portal JSON (GSTR-2B, GSTR-3B, GSTR-1, GSTR-2A) against books in the `accountant` DB. For each line item from the JSON, search books and give a verdict. User decides what action to take.

This skill does NOT auto-correct, auto-post, or modify books. Read-only.

---

## When to Use

User uploads a GST Portal JSON file and asks to reconcile. Or user says "reconcile this GST file with books."

---

## Phase 1: Intake

### 1.1 Read the JSON file

Accept the file path. Read and parse.

### 1.2 Normalize root

GST Portal JSON sometimes wraps data inside a `data` key:

```json
{ "data": { "gstin": "...", "docdata": {...} }, "chksum": "..." }
```

Use `json.data` if it exists, otherwise use the root object.

### 1.3 Detect JSON type

| Keys present | Type |
|---|---|
| `itcsumm`, `docdata`, `cpsumm` | GSTR-2B |
| `sup_details`, `itc_elg`, `tx_pmt` | GSTR-3B |
| `b2b`, `b2cl`, `b2cs` (at root/data level, no itcsumm) | GSTR-1 |
| None of the above | Unknown → ask user |

### 1.4 Extract metadata

| Field | Meaning |
|---|---|
| `gstin` | Taxpayer GSTIN |
| `rtnprd` | Return period (MMYYYY, e.g. `052026` = May 2026) |
| `gendt` | Generation date |

Convert `rtnprd` to human label: `052026` → `May 2026`.

---

## Phase 2: Parse GST Portal Data

### For GSTR-2B (Purchase ITC Reconciliation)

Parse invoice-level data from `docdata.b2b[]`.

Each supplier object has `inv[]` array. Flatten every invoice to a row:

| Field | Path |
|---|---|
| Supplier GSTIN | `ctin` |
| Supplier Name | `trdnm` |
| Invoice Number | `inum` |
| Invoice Date | `dt` |
| Invoice Value | `val` |
| Taxable Value | `txval` |
| IGST | `igst` |
| CGST | `cgst` |
| SGST | `sgst` |
| Cess | `cess` |
| Reverse Charge | `rev` (Y/N) |
| ITC Available | `itcavl` (Y/N) |
| Place of Supply | `pos` |
| Document Type | `typ` |

Also parse ITC summary from `itcsumm.itcavl` for overview.

**Skip for now:** Amendments (`b2ba`), credit/debit notes (`cdn`), ISD, imports. Cover them when needed.

### For GSTR-3B (Return Summary Reconciliation)

Parse summary sections. Compare at aggregate level (not invoice-level):

| Section | Compare with |
|---|---|
| `sup_details.osup_det` | Books sales register (Output CGST/SGST/IGST totals) |
| `sup_details.isup_rev` | Books RCM entries |
| `itc_elg.itc_avl` | Books Input GST ledger totals |
| `itc_elg.itc_net` | Books net ITC after reversals |
| `tx_pmt` | GST payment entries in books |

### For GSTR-1 (Sales Outward Reconciliation)

Parse `b2b[]`, `b2cl[]`, `b2cs[]`, `cdnr[]`. Compare against sales register in books. Match each outward invoice.

---

## Phase 3: Fetch Books Data

Use the `accountant` skill's DB (`skills/accountant/tool/accounting.db`).

### For each GST Portal invoice, search books:

**Where to look:**
- `vouchers.source_doc_no` — invoice number may be stored here
- `vouchers.narration` — invoice number may be mentioned in narration
- `vouchers.type` — filter by relevant types (`PE`, `BP` for purchases; `SE` for sales)

**How to reconstruct invoice data from books:**

A purchase invoice in books is stored across multiple `lines` rows under one `voucher_id`:

```
Expense/Purchase ledger → line.debit  = Taxable Value
Input IGST ledger       → line.debit  = IGST
Input CGST ledger       → line.debit  = CGST
Input SGST ledger       → line.debit  = SGST
Party/Vendor ledger     → line.credit = Total Payable
```

Query approach:
1. Search `vouchers` + `lines` + `ledgers` joined on `voucher_id` and `ledger_id`
2. Look for the party ledger (credit side) → get supplier name and GSTIN from `ledgers` table
3. Look for GST tax ledgers (Input/Output CGST/SGST/IGST) → get tax amounts
4. Look for expense/income ledger (non-GST, non-party) → get taxable value

**Search for match:**
1. Look for `source_doc_no` matching the invoice number (exact or normalized)
2. Look for invoice number appearing in `narration`
3. If found, extract: taxable value, IGST, CGST, SGST, invoice value, supplier name, supplier GSTIN
4. If NOT found in either field → verdict MISSING

---

## Phase 4: Normalize Before Matching

### GSTIN
- Uppercase, trim spaces
- Compare normalized forms

### Invoice Number
- Uppercase
- Remove spaces, `/`, `-`, `.`
- Example: `INV-001/26` → `INV00126`

### Amounts
- Round to 2 decimals
- Tolerance: ≤ ₹1.00 = rounding (acceptable), ₹1.01–₹10.00 = minor mismatch (WARN), > ₹10.00 = material mismatch (WARN)

---

## Phase 5: Verdict Each Item

For each invoice from GST Portal, produce one verdict:

### ✅ MATCHED
Invoice found in books with matching supplier, invoice number, and amounts within tolerance.

### ⚠️ WARN
Invoice found but has issues. One of:
- **Value mismatch:** Taxable value or GST differs > ₹1.00
- **Tax type mismatch:** IGST in books but CGST/SGST in portal (or vice versa)
- **ITC mismatch:** Portal says ITC unavailable but books treat as eligible
- **Date mismatch:** Invoice date in portal differs significantly from books posting date
- **GSTIN mismatch:** Same invoice number but different supplier GSTIN
- **Duplicate:** Same invoice appears multiple times

### ❌ MISSING
Invoice exists in GST Portal but NOT found in books (checked `source_doc_no` and `narration`).

---

## Phase 6: Reverse Check

After matching portal → books, also check the reverse: books invoices NOT in portal.

Query all purchase vouchers for the period. For each, check if it appears in the GST Portal JSON. If not:

- Flag as **MISSING_IN_PORTAL**
- Possible reasons: supplier not filed GSTR-1, wrong GSTIN, RCM, unregistered supplier

---

## Phase 7: Final Report

Output a structured report:

```
GST Reconciliation Report
═══════════════════════════
GSTIN:     24XXXXXXXXXXZ6
Period:    May 2026
JSON Type: GSTR-2B
Generated: 14-06-2026

Portal Summary:
  Total Documents:  XX
  Total ITC:        ₹X,XXX.XX

Reconciliation:
  ✅ MATCHED:  XX
  ⚠️ WARN:     XX
  ❌ MISSING:  XX

─── MISSING ITEMS ───
#1 | Supplier: ABC Pvt Ltd | Inv: INV-001 | ₹5,000
    → Not found in books. Check if purchase needs to be booked.

─── WARNINGS ───
#2 | Supplier: XYZ Corp | Inv: INV-002 | Portal: ₹10,000 | Books: ₹9,500
    → Taxable value mismatch: ₹500. Verify invoice copy.

─── MATCHED ───
#3 to #15: All matched within tolerance.

─── BOOKS NOT IN PORTAL ───
#16 | Supplier: Local Vendor | Inv: BILL-123 | ₹2,500
    → Not in GSTR-2B. Hold ITC until supplier files return.
```

---

## Rules

1. **Read-only.** Never modify books, never post entries.
2. **Verdict, don't fix.** Report mismatches. User decides action.
3. **Search both fields.** Check `source_doc_no` AND `narration`.
4. **Narrate clearly.** Each verdict line must explain WHY in plain language.
5. **Skip what's not needed.** No RCM, no IRN, no amendments for now.
6. **Gujarat context.** Most transactions intrastate (CGST/SGST). IGST only for out-of-state suppliers.
7. **Single company.** Works against current accountant DB only.

---

## Future

- GSTR-1 sales reconciliation → separate skill (planned next month)
- Amendment handling → when needed
- CDN/Credit Note matching → when needed
- Multi-company support → when needed
