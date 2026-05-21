# Tally XML Examples

Reference templates for generating Tally Primitive XML for GST-compliant vouchers. Use these when importing data into Tally via XML Import.

---

## Sale Bill — GST Sales Invoice (Intrastate)

**Use case:** Creating a taxable sales invoice with GST (CGST + SGST) for intrastate supply of services.

### Template

```xml
<ENVELOPE>
 <HEADER>
 <TALLYREQUEST>Import Data</TALLYREQUEST>
 </HEADER>

 <BODY>
 <IMPORTDATA>

 <REQUESTDESC>
 <REPORTNAME>Vouchers</REPORTNAME>

 <STATICVARIABLES>
 <SVCURRENTCOMPANY>[Company Name]</SVCURRENTCOMPANY>
 </STATICVARIABLES>
 </REQUESTDESC>

 <REQUESTDATA>

 <TALLYMESSAGE xmlns:UDF="TallyUDF">

 <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">

 <DATE>[YYYYMMDD]</DATE>

 <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>

 <VOUCHERNUMBER>[SI-XXXXX/2026]</VOUCHERNUMBER>

 <!-- PARTY INFORMATION -->
 <PARTYNAME>[Party Name]</PARTYNAME>
 <PARTYLEDGERNAME>[Party Ledger Name]</PARTYLEDGERNAME>

 <CMPGSTIN>[Seller GSTIN]</CMPGSTIN>
 <CMPGSTREGISTRATIONTYPE>Regular</CMPGSTREGISTRATIONTYPE>

 <STATENAME>[Seller State]</STATENAME>
 <PLACEOFSUPPLY>[Place of Supply]</PLACEOFSUPPLY>

 <PARTYGSTIN>[Buyer GSTIN — leave empty if unregistered]</PARTYGSTIN>

 <GSTREGISTRATION TAXTYPE="GST" TAXREGISTRATION="[Seller GSTIN]">
 [Seller State] Registration
 </GSTREGISTRATION>

 <PARTYMAILINGNAME>[Party Name]</PARTYMAILINGNAME>

 <BASICBUYERNAME>[Party Name]</BASICBUYERNAME>
 <BASICBASEPARTYNAME>[Party Name]</BASICBASEPARTYNAME>

 <CONSIGNEEMAILINGNAME>[Party Name]</CONSIGNEEMAILINGNAME>
 <CONSIGNEESTATENAME>[Buyer State]</CONSIGNEESTATENAME>
 <CONSIGNEECOUNTRYNAME>India</CONSIGNEECOUNTRYNAME>

 <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
 <VATDEALERTYPE>Regular</VATDEALERTYPE>

 <COUNTRYOFRESIDENCE>India</COUNTRYOFRESIDENCE>

 <NUMBERINGSTYLE>Manual</NUMBERINGSTYLE>

 <ISINVOICE>Yes</ISINVOICE>

 <!-- 1. PARTY LEDGER (Receivable) — Amount is NEGATIVE -->
 <LEDGERENTRIES.LIST>
 <LEDGERNAME>[Party Ledger Name]</LEDGERNAME>
 <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
 <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
 <AMOUNT>-[Total Invoice Amount]</AMOUNT>
 </LEDGERENTRIES.LIST>

 <!-- 2. INCOME/SALES LEDGER (Taxable) -->
 <LEDGERENTRIES.LIST>
 <LEDGERNAME>[Income Ledger Name]</LEDGERNAME>
 <ISPARTYLEDGER>No</ISPARTYLEDGER>
 <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
 <GSTOVRDNTAXABILITY>Taxable</GSTOVRDNTAXABILITY>
 <GSTOVRDNTYPEOFSUPPLY>Services</GSTOVRDNTYPEOFSUPPLY>
 <GSTSOURCETYPE>Ledger</GSTSOURCETYPE>
 <GSTLEDGERSOURCE>[Income Ledger Name]</GSTLEDGERSOURCE>

 <!-- SAC / HSN CODE -->
 <GSTHSNNAME>[SAC/HSN Code]</GSTHSNNAME>
 <GSTHSNINFERAPPLICABILITY>No</GSTHSNINFERAPPLICABILITY>

 <AMOUNT>[Base Amount]</AMOUNT>
 <VATEXPAMOUNT>[Base Amount]</VATEXPAMOUNT>

 <!-- GST RATE DECLARATION (within income ledger) -->
 <RATEDETAILS.LIST>
 <GSTRATEDUTYHEAD>CGST</GSTRATEDUTYHEAD>
 <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
 <GSTRATE>[CGST Rate %]</GSTRATE>
 </RATEDETAILS.LIST>
 <RATEDETAILS.LIST>
 <GSTRATEDUTYHEAD>SGST/UTGST</GSTRATEDUTYHEAD>
 <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
 <GSTRATE>[SGST Rate %]</GSTRATE>
 </RATEDETAILS.LIST>

 <!-- COST CENTRE ALLOCATION -->
 <CATEGORYALLOCATIONS.LIST>
 <CATEGORY>Primary Cost Category</CATEGORY>
 <COSTCENTREALLOCATIONS.LIST>
 <NAME>Main Location</NAME>
 <AMOUNT>[Base Amount]</AMOUNT>
 </COSTCENTREALLOCATIONS.LIST>
 </CATEGORYALLOCATIONS.LIST>

 </LEDGERENTRIES.LIST>

 <!-- 3. OUTPUT CGST LEDGER -->
 <LEDGERENTRIES.LIST>
 <LEDGERNAME>[Output CGST Ledger Name]</LEDGERNAME>
 <ISPARTYLEDGER>No</ISPARTYLEDGER>
 <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
 <AMOUNT>[CGST Amount]</AMOUNT>
 <RATEOFINVOICETAX.LIST TYPE="Number">
 <RATEOFINVOICETAX>[CGST Rate %]</RATEOFINVOICETAX>
 </RATEOFINVOICETAX.LIST>
 <ROUNDTYPE>Normal Rounding</ROUNDTYPE>
 </LEDGERENTRIES.LIST>

 <!-- 4. OUTPUT SGST LEDGER -->
 <LEDGERENTRIES.LIST>
 <LEDGERNAME>[Output SGST Ledger Name]</LEDGERNAME>
 <ISPARTYLEDGER>No</ISPARTYLEDGER>
 <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
 <AMOUNT>[SGST Amount]</AMOUNT>
 <RATEOFINVOICETAX.LIST TYPE="Number">
 <RATEOFINVOICETAX>[SGST Rate %]</RATEOFINVOICETAX>
 </RATEOFINVOICETAX.LIST>
 <ROUNDTYPE>Normal Rounding</ROUNDTYPE>
 </LEDGERENTRIES.LIST>

 </VOUCHER>

 </TALLYMESSAGE>

 </REQUESTDATA>

 </IMPORTDATA>
 </BODY>

</ENVELOPE>
```

### Field Guide

| Field | Description | Example |
|-------|-------------|---------|
| `SVCURRENTCOMPANY` | Tally company name | `Romin Interactive (Prop: Romin Joshi)` |
| `VCHTYPE` | Voucher type | `Sales` |
| `DATE` | Invoice date (YYYYMMDD) | `20260521` |
| `VOUCHERNUMBER` | Manual invoice number | `SI-00021/2026` |
| `PARTYNAME` / `PARTYLEDGERNAME` | Buyer name (must match Tally ledger) | `Docura Baby Care` |
| `CMPGSTIN` | Seller GSTIN (company) | `24AIOPJ9078R1Z6` |
| `PARTYGSTIN` | Buyer GSTIN (empty if unregistered) | `` |
| `STATENAME` / `PLACEOFSUPPLY` | Supply location | `Gujarat` |
| `Party LEDGER AMOUNT` | **Negative** = receivable from party | `-41300.00` |
| `Income LEDGER AMOUNT` | **Positive** = income | `35000.00` |
| `GSTHSNNAME` | SAC (Services) or HSN (Goods) code | `998315` |
| `GSTRATE` | Tax rate % per component | `9` (for 9% CGST) |
| `CGST AMOUNT` | Calculated: Base × CGST rate% | `3150.00` |
| `SGST AMOUNT` | Calculated: Base × SGST rate% | `3150.00` |

### Calculation Example (Docura Baby Care)

| Component | Formula | Amount |
|-----------|---------|--------|
| Base (Taxable Value) | Given | ₹35,000.00 |
| CGST @ 9% | 35,000 × 9% | ₹3,150.00 |
| SGST @ 9% | 35,000 × 9% | ₹3,150.00 |
| **Total Invoice** | Base + CGST + SGST | **₹41,300.00** |

### GST Rate Configuration Rules

- **Intrastate** (same state): CGST + SGST split equally
  - `RATEDETAILS.LIST` entries: CGST at X%, SGST/UTGST at X%
- **Interstate** (different state): IGST at combined rate
  - Replace SGST ledger with IGST ledger
  - Single `RATEDETAILS.LIST` with IGST
- **Unregistered buyer** (no GSTIN): Default to intrastate (CGST+SGST)
- **Default GST rate**: 18% (9% CGST + 9% SGST)
- **SAC for Services**: `9983xx` range (998315 = Software/IT services)

### Notes
- Party ledger `AMOUNT` is always negative (debtor/receivable)
- Income/sales ledger `AMOUNT` is always positive
- GST ledgers have positive amounts (output liability)
- Each `RATEDETAILS.LIST` block declares one tax component (CGST/SGST/IGST)
- Cost centre allocation is mandatory for income ledger in some Tally configurations
- `NUMBERINGSTYLE=Manual` when using custom invoice numbers
