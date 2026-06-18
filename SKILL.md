---
name: accountant-skill
description: "Full double-entry accounting engine with GST compliance. Core knowledge base for journal entries, chart of accounts, ledger management, period closing, audit controls, rectification, and financial reporting. Use when recording transactions, generating reports, managing ledgers, or performing any accounting operation. Powered by better-sqlite3 with ACID-compliant database. For Tally XML import/export, see the tally-import-export skill."
metadata:
---

# Accountant Agent Skill Mastery Guide

Welcome to the Accountant Agent Skill repository! This document serves as the master index for the AI accountant's core knowledge base. It details the purpose of each foundation file, the execution tools, installation instructions, and the initial onboarding flow an agent should use when setting up a new business.

---

## 📚 Core Knowledge Base Files

### 1. `audit_rule.md`
- **What it is for:** Defines preventive, detective, and corrective audit controls.
- **How to use it:** Use as the ultimate gatekeeper before posting any transaction. Enforces the "Maker-Checker" protocol where the agent drafts and the human confirms.
- **What it contains:** Three layers of controls, Golden Audit Checks, anomaly detection, and validation requirements (e.g., preventing unbalanced journals).
- **Why it's important:** Prevents financial data corruption, fraud, and ensures mathematical accuracy before any database write occurs.

### 2. `closing.md`
- **What it is for:** Defines the operational workflows for period-end closures (Monthly, Quarterly, and Yearly).
- **How to use it:** Use to guide the agent through reconciliation checklists before locking a financial period.
- **What it contains:** Step-by-step procedures for capturing, reconciling, adjusting, reviewing, reporting, and locking. Explains how temporary accounts close to retained earnings at year-end.
- **Why it's important:** Certifies financial truth for a given period and legally locks historical records to prevent backdated manipulations.

### 3. `coa.md` (Chart of Accounts)
- **What it is for:** The foundational classification system for all financial buckets.
- **How to use it:** Use to classify every ledger into one of the 5 primary types: Assets, Liabilities, Equity, Income, or Expenses.
- **What it contains:** Definitions of the 5 primary types, normal balance rules (Debit vs. Credit), and the foundational accounting equation (Assets = Liabilities + Equity).
- **Why it's important:** Proper classification dictates how transactions behave and how financial reports are ultimately structured.

### 4. `db.md` & `db_tool.md`
- **What it is for:** Defines the architectural bridge between accounting theory and the actual `better-sqlite3` execution engine.
- **How to use it:** Guides the agent on how to call specific `scripts/` (syscalls) rather than improvising raw SQL.
- **What it contains:** The architecture of the `tool/` directory, schema definitions, transactional requirements (WAL mode), and detailed instructions on how the posting engine works.
- **Why it's important:** Ensures deterministic, low-tool-call operations that safely persist financial data in an ACID-compliant database.

### 5. `general_ledger.md`
- **What it is for:** Explains the hierarchy of Ledgers and Ledger Groups.
- **How to use it:** Use to understand how journal entries accumulate into running balances over time.
- **What it contains:** The distinction between postable ledgers (where transactions happen) and non-postable ledger groups (used only for organization).
- **Why it's important:** Prevents the agent from accidentally posting transactions to summary folders, ensuring granular transaction tracking.

### 6. `journal_entry.md`
- **What it is for:** Teaches the agent how to translate business events into formal double-entry accounting records.
- **How to use it:** Use to map natural language intents to specific Voucher Types (e.g., CR, BP, SE, PE) and apply Debit/Credit logic.
- **What it contains:** The anatomy of a journal entry, voucher type definitions, and examples of translating human speech into balanced journals.
- **Why it's important:** It guarantees that every financial event adheres to the fundamental rule: Total Debits must equal Total Credits.

### 7. `rectification.md`
- **What it is for:** Transaction correction logic for handling mistakes.
- **How to use it:** Use to determine if a mistake can be edited (if still a Draft) or must be reversed/adjusted (if already Posted).
- **What it contains:** Rules for reversing vouchers, adjusting entries, and enforcing the two-stage posting model (Draft -> Preview -> Confirm -> Post).
- **Why it's important:** Enforces an append-only, immutable audit trail. History is never silently overwritten.

### 8. `report_manual.md`
- **What it is for:** Defines the output reporting layer of the accounting system.
- **How to use it:** Use to generate the 12 core reports (Trial Balance, P&L, Balance Sheet, Cash Flow, etc.) dynamically from the ledger.
- **What it contains:** Definitions, generation logic, and example layouts for every critical financial report.
- **Why it's important:** Provides the human owner with visibility into the financial health, liquidity, and profitability of the business.

### 9. `source_document.md`
- **What it is for:** Defines the required evidence that must exist before a transaction is recorded.
- **How to use it:** Use to map physical/digital documents (Invoices, Receipts, Bank Statements) to system Voucher Types.
- **What it contains:** Document definitions and the "Document First, Entry Second" rule.
- **Why it's important:** Ensures that the agent does not fabricate entries without underlying business proof.

### 10. Tally XML → See `tally-import-export` Skill
Tally XML generation and import/export has been moved to a dedicated **tally-import-export** skill. Use that skill for all Tally XML work — sale/purchase invoices, credit/debit notes, payments, receipts, journals.

### 11. `transaction_language.md`
- **What it is for:** NLP keyword mappings.
- **How to use it:** Use as a dictionary to parse user intent and colloquials into formal accounting commands.
- **What it contains:** Extensive lists of keywords, phrases, and Indian/Global colloquialisms mapped to specific voucher types.
- **Why it's important:** Enables seamless, conversational human-agent interaction without requiring the user to speak in strict accounting terms.

---

## 📋 GST Rules

### GSTIN-Based Tax Jurisdiction Rule

When creating an invoice (Sales Entry / SE), the system determines whether to apply **CGST+SGST** (intrastate) or **IGST** (interstate) based on the following priority:

1. **If the party ledger has NO valid GSTIN** → **Always use CGST/SGST** (intrastate)
2. **If the party ledger HAS a valid GSTIN** → Check state codes:
   - Same state as company → CGST/SGST
   - Different state → IGST

This rule is enforced in `tool/lib/gst-engine.js` via the `determineGST()` function. The `partyGSTIN` parameter is checked first before evaluating interstate status.

**Why:** Without a valid GSTIN, the party cannot claim interstate GST benefits, so the transaction defaults to intrastate treatment.

## 🛠 Installation & Setup

The actual execution logic resides in the `tool/` directory, powered by Node.js and `better-sqlite3`.

To set up the database and toolset:

```bash
# 1. Navigate to the tool directory
cd tool/

# 2. Install dependencies (better-sqlite3)
npm install

# 3. Register a company (creates dbs/<slug>.db + metadata)
node scripts/set-company.js <slug> --name "Company Name" --fy apr-mar --gstin 24AAAAA0000A1Z5

# 4. Initialize the database schema for that company
node scripts/migrate-schema.js

# 5. Verify database integrity
node scripts/integrity-check.js
```

## 🏢 Multi-Company Architecture

The system supports multiple independent companies, each with its own database.

### Database Layout
```
tool/dbs/
├── <company_slug>.db       # Per-company SQLite database
├── registry.json            # Company metadata (name, FY, GSTIN)
└── .active-company          # Session-level default company
```

### Selecting a Company
Three mechanisms, in priority order:

| Priority | Method | Example |
|----------|--------|---------|
| 1 (highest) | `--company` CLI flag | `node scripts/post-voucher.js payload.json --company acme` |
| 2 | `ACCOUNTING_COMPANY` env var | `ACCOUNTING_COMPANY=acme node scripts/preview-voucher.js` |
| 3 (default) | `.active-company` state file | `node scripts/set-company.js acme` |

### Company Management Scripts

**Register & activate a company:**
```bash
node scripts/set-company.js <slug> --name "Legal Name" --fy apr-mar --gstin GSTIN
```

**List all companies:**
```bash
node scripts/list-companies.js
```

### Per-Command Usage
All generic scripts accept `--company <slug>`:
```bash
node scripts/post-voucher.js payload.json --company romin
node scripts/preview-voucher.js payload.json --company romin
node scripts/generate-report.js --company romin
node scripts/integrity-check.js --company romin
node scripts/ledger-query.js "Cash" --company romin
node scripts/gst-general-ledger.js --company romin
node scripts/export-general-ledger.js --company romin
node scripts/close-period.js --company romin
node scripts/db-maintenance.js --company romin
node scripts/reverse-voucher.js SE-0001 --company romin
node scripts/rectify-entry.js SE-0001 corrected.json --company romin
```

### Posting Engine Architecture

```
db.js (factory)
  ├── getDb(slug)         → opens/returns dbs/<slug>.db
  ├── resolveCompany()    → parses --company > env > .active-company
  └── backward compat     → const db = require('./lib/db') still works

posting-engine.js (factory)
  └── createPostingEngine(db) → prepared statements bound to that db

validators.js (factory)
  └── createValidators(db) → validation functions bound to that db

gst-engine.js (factory)
  └── createGstEngine(db) → GST logic bound to that db
```

Once initialized, the system uses the scripts in `tool/scripts/` (e.g., `post-voucher.js`, `generate-report.js`) as the primary interface for all ledger operations.

### Export General Ledger

Generate a full General Ledger with running balances for CA audit or month-end closing:

```bash
# All-time dump (default)
node scripts/export-general-ledger.js

# Filter by date range
node scripts/export-general-ledger.js --from 2026-05-01 --to 2026-05-31

# From a start date onward
node scripts/export-general-ledger.js --from 2026-06-01

# Redirect to CSV file
node scripts/export-general-ledger.js --from 2026-05-01 --to 2026-05-31 > may-2026-gl.csv
```

Output format (tab-separated): `Ledger Name | Date | Voucher No | Type | Narration | Debit | Credit | Running Balance`

---

## 🤝 Initial Onboarding: Company Setup & Interview

### User Triggers

The agent (CA) should recognize these user phrases as requests to set up a new company or start an interview:

- "Start a new accounting company"
- "Setup new books for company"
- "Setup accounts for new company"
- "Start interview" / "Start interview for company"
- "Start interview" (without company name — confirm active company first)

### Phase 0: Company Identity (Mandatory First Step)

Before any accounting questions, establish the company identity:

1. **Company Slug (always unique — ask user explicitly, do NOT auto-generate):**
   > "What short slug should we use for this company? (e.g., 'romin', 'acme' — used for the database file and all CLI commands. Must be unique across all companies.)"
   - If slug already exists → warn user and ask for a different one.

2. **Company Name (may not be unique across companies):**
   > "What is the legal name of the business?"

3. **GSTIN (optional):**
   > "Does the company have a GSTIN? If yes, please provide it."
   - If GSTIN IS provided → GST compliance rules enforced (CGST/SGST/IGST, GSTIN validation)
   - If GSTIN is NOT provided → company is NOT GST registered → GST compliance checks are skipped. Mark as unregistered.

After Phase 0, register the company:
```bash
node scripts/set-company.js <slug> --name "Legal Name" [--gstin GSTIN] [--fy apr-mar]
node scripts/migrate-schema.js
```

### Phase 1: The Interview (After Company Is Registered)

The agent MUST ask the following questions to properly initialize the books:

1. **Business Entity & Reporting Period:**
   > "What is your financial year (e.g., April to March or Jan to Dec)?"
   - If already provided via --fy flag, skip or confirm.

2. **Opening Balances (The Transition):**
   > "Are we starting fresh, or do you have an existing Trial Balance / Balance Sheet from a previous system that we need to import as opening balances?"

3. **Cash & Banks:**
   > "What are your primary bank accounts and cash registers? We need to set these up as your core Asset ledgers."

4. **Chart of Accounts (COA) Customization:**
   > "Do you have specific expense/income categories you want to track granularly, or should I initialize a standard Chart of Accounts for your industry?"

5. **Initial Capital (For New Businesses):**
   > "If this is a brand new business, how much initial owner's capital has been introduced, and into which bank or cash account was it deposited?"

6. **Outstanding Dues (Day One AR/AP):**
   > "Are there any pending payables to suppliers or receivables from customers that we need to record on day one to ensure accurate cash flow tracking?"

### Special Case: "Start Interview" Without Company Name

If the user says "start interview" without specifying a company:

1. Check if an active company is set (`node scripts/list-companies.js`)
2. Confirm: "You have <name> (<slug>) as the active company. Start interview for this company?"
3. If no active company → "No active company set. Which company should we work with? Here are the registered companies: <list>. Or would you like to set up a new one?"
4. Only proceed after explicit user confirmation.

### After Onboarding

Once all questions are answered, the agent will generate the Opening Entries (`OE`) and establish the initial Trial Balance.
