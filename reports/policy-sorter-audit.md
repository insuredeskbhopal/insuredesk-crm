# Policy Sorter Audit Report

This report documents the audit of the existing insurance extraction pipeline, company detection logic, and policy classification mechanisms in the codebase.

## Files Inspected

The following modules were audited to understand the extraction intelligence and reuse existing components:

1. **[extractor.cjs](file:///c:/Users/abhis/insuredesk-crm/lib/policies/pdf/extractor.cjs)**: The primary CommonJS module standardizing policy PDF and text extraction. It parses documents via `pdf-parse`, delegates format analysis to `understandDocument`, resolves schemas, and runs company-specific parsers.
2. **[text.js](file:///c:/Users/abhis/insuredesk-crm/lib/policies/pdf/text.js)**: Responsible for extracting the raw text layer of PDFs and falling back to Tesseract OCR when no text layer is found.
3. **[understandDocument.js](file:///c:/Users/abhis/insuredesk-crm/lib/policies/understanding/understandDocument.js)**: The main orchestrator for text-based document understanding. Computes a confidence score based on matched sections, tables, and labels.
4. **[classifyDocument.js](file:///c:/Users/abhis/insuredesk-crm/lib/policies/understanding/classifyDocument.js)**: Rule-based document classification that maps document layout text to format signatures.
5. **[company-detector.js](file:///c:/Users/abhis/insuredesk-crm/lib/policies/company-detector.js)**: Checks for carrier evidence using token analysis on text segments.
6. **[insurance-companies.cjs](file:///c:/Users/abhis/insuredesk-crm/lib/master/insurance-companies.cjs)**: Contains the canonical master list of 9 active insurance companies along with their known aliases. Implements the master company normalization utility.
7. **[classifier.js](file:///c:/Users/abhis/insuredesk-crm/lib/policies/classifier.js)**: Classifies text against database-seeded policy types matching keywords, aliases, and field definitions.
8. **[defaults.js](file:///c:/Users/abhis/insuredesk-crm/lib/policies/defaults.js)**: Seed database models containing default categories, companies, and policy types.

## Detection Functions Found

The following functions have been identified as reusable for identifying carriers and policy types without modifying the core extraction logic:

- **`normalizeInsuranceCompanyName(value, fallbackText)`** (in `lib/master/insurance-companies.cjs`):
  Resolves a raw company name string (e.g., from fields or text) to one of the 9 canonical names in `INSURANCE_COMPANY_MASTER` using direct lookup and keyword matches.
- **`classifyDocument(text)`** (in `lib/policies/understanding/classifyDocument.js`):
  Matches regex signals on the raw text to identify the company, category, and document format layout.
- **`understandDocument(text)`** (in `lib/policies/understanding/understandDocument.js`):
  Combines classification, layout detection, and important labels to resolve company/policy type and calculate a confidence score.
- **`extractPolicyFromText(text, sourceFile)`** (in `lib/policies/pdf/extractor.cjs`):
  Extracts full structured metadata from the text, returning standard keys such as `insuranceCompany`, `companyName`, `policyType`, and `documentCategory`.

## Schemas Found

The following schemas in `lib/policies/schemas/` define extraction fields and structures:

- `tata_aig_motor.json`
- `new_india_motor.json`
- `iffco_motor.json`
- `hdfc_motor.json`
- `generali_motor.json`
- `icici_warehouse.json`
- `iffco_warehouse.json`
- `generic_policy.json`

## Policy Types Found

The system categorizes policies into major categories and types. Keywords and aliases in `defaults.js` map to:

1. **Motor**: Car Insurance, Bike Insurance, Commercial Vehicle.
2. **Warehouse**: MSME Suraksha Kavach, Fire & Burglary warehouse.
3. **Fire**: Fire Policy (Standard Fire & Special Perils).
4. **Marine**: Marine Policy (Marine Cargo).
5. **Health**: Individual Health, Family Floater, Group Mediclaim.
6. **Life**: Loan Insurance, Life Assured (Term).
7. **Fidelity**: Fidelity Guarantee.
8. **Commercial**: MSME Package, Commercial Asset.
9. **Liability**: Public Liability, Professional Indemnity, Workmen's Compensation.
10. **Burglary**: Burglary Policy.
11. **Shop**: Shopkeeper Package.
12. **Office**: Office Protector.
13. **Engineering**: Contractor's All Risk, Erection All Risk.
14. **Miscellaneous**: Fallback classification.

## Conclusion

We will build the sorter script to reuse `extractPolicyFromText` (from `lib/policies/pdf/extractor.cjs`) and `normalizeInsuranceCompanyName` (from `lib/master/insurance-companies.cjs`) to accurately classify and route PDFs to their structured folders under `organized-policies/`.
