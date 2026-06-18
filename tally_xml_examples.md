# Tally XML Examples

Reference templates for generating Tally Primitive XML for GST-compliant vouchers. Each template is a standalone `.xml` file in this directory.

---

## Sale Bill — GST Sales Invoice (Intrastate)

**File:** `tally-examples/sale_bill.xml`

**Use case:** Creating a taxable sales invoice with GST (CGST + SGST) for intrastate supply of services.

**Source:** Documented from a working import — Docura Baby Care, Website Development Income, SAC 998315.

### Field Reference

| Field | Description | Example |
|-------|-------------|---------|
| `SVCURRENTCOMPANY` | Tally company name | `Romin Interactive (Prop: Romin Joshi)` |
| `VCHTYPE` | Voucher type | `Sales` |
| `DATE` | Invoice date (YYYYMMDD) | `20260521` |
| `VOUCHERNUMBER` | Manual invoice number | `SI-00021/2026` |
| `PARTYNAME` / `PARTYLEDGERNAME` | Buyer ledger name | `Docura Baby Care` |
| `CMPGSTIN` | Seller GSTIN | `24AIOPJ9078R1Z6` |
| `PARTYGSTIN` | Buyer GSTIN (empty if unregistered) | `` |
| `STATENAME` / `PLACEOFSUPPLY` | Supply location | `Gujarat` |
| Party `AMOUNT` | **Negative** = receivable | `-41300.00` |
| Income `AMOUNT` | **Positive** = income | `35000.00` |
| `GSTHSNNAME` | SAC (Services) or HSN (Goods) | `998315` |
| `GSTRATE` | Tax rate per component | `9` (for 9%) |

### Calculation (Docura Example)

| Component | Amount |
|-----------|--------|
| Base | ₹35,000.00 |
| CGST @ 9% | ₹3,150.00 |
| SGST @ 9% | ₹3,150.00 |
| **Total** | **₹41,300.00** |

### GST Rate Rules

- **Intrastate** (same state) → CGST + SGST split equally
- **Interstate** (different state) → IGST at combined rate
- **No buyer GSTIN** → defaults to intrastate (CGST+SGST)
- **Default rate:** 18% (9% + 9%)

### Key Structural Notes

- Party ledger `AMOUNT` is always negative (debtor/receivable)
- Income ledger `AMOUNT` is always positive
- `RATEDETAILS.LIST` blocks go inside the income ledger entry (not at top level)
- Cost centre allocation is mandatory for income ledger in some Tally configs
- `NUMBERINGSTYLE=Manual` for custom invoice numbers

---

## Coming Soon

- Purchase Bill (GST)
- Credit Note
- Debit Note
- Payment / Receipt
