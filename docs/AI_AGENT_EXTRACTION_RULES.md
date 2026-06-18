# AI Agent Extraction Rules

## Purpose

Define strict, non-negotiable rules for any AI coding agent working on this repository. The goal: absolutely no mock, simulated, or hardcoded extraction data. All extraction, validation, and save flows must run against real uploaded PDFs and the real runtime systems.

## Strict Rules (summary)

1. Do not create mock extraction results.
2. Do not simulate PDF extraction or OCR.
3. Do not return sample JSON as real output.
4. Do not hardcode policy data, company names, policy numbers, customer names, premium values, vehicle details, or dates.
5. Do not create fake records for testing production flow.
6. Do not bypass OCR, parser, schema resolver, or extraction engine.
7. Do not mark fields as extracted unless sourced from actual uploaded PDF content (text, table, OCR, or parsed structure).
8. Do not use fallback values or silently fill missing fields to make the UI look complete.
9. Do not assume values based on insurer, policy type, vehicle type, file name, or previous records.
10. Do not change the UI to hide backend failures.
11. Do not claim extraction or production readiness unless verified with real uploads and end-to-end save flow.
12. Do not remove or weaken validation to make saving easier.

## Required Development Flow (must be followed for any change that touches extraction)

Uploaded PDF → Real text extraction → Real OCR fallback if needed → Real insurer detection → Real policy type detection → Real schema resolution → Real field extraction → Real validation → Real review/save flow → Real database persistence

## Traceability

- Every extracted field must be traceable to its source: PDF text, table data, OCR output, or parsed document structure. Record the origin (file, page, OCR confidence, parser node) when persisting extraction results.
- If a field is not found, expose the failure in extraction metadata and in the UI review state instead of inventing values.

## Testing Requirements

- Tests MUST use real PDF files (no synthetic or sample-only files).
- Tests must exercise the real API route(s), real frontend upload flow, real validation, and real database save.
- Integration tests must include at least one end-to-end test that uploads a PDF, runs extraction, opens the review UI, and saves to the database.
- Test artifacts must include the exact PDF file used and the actual extracted output (raw extraction + parsed fields).

## Agent Deliverables (every PR by an AI agent touching extraction must include)

- Files changed (list of file paths and a short rationale).
- Logic changed (summary of algorithm/behavior changes).
- Real test performed (exact steps executed).
- Real PDF(s) used (attached path or test fixture reference).
- Actual extracted output (raw extraction output and parsed fields JSON).
- Fields passed (list of fields successfully extracted and traceability metadata).
- Fields failed (list of missing/incorrect fields and failure reason).
- Remaining issues and recommended next steps.

## Enforced fields (minimum motor policy extraction set)

- Insured Name
- Policy Number
- Policy Type
- Premium
- Start Date
- Expiry Date
- Duration
- Insurance Company
- Cover Type
- Vehicle Number
- Registration Number
- Make / Model
- Manufacturing Year
- Registration Date
- Engine Number
- Chassis Number
- Seating Capacity
- RTO Location
- Total Premium
- Net Premium
- TP + Driver + Owner Premium
- OD Premium

## Final rule

No mock. No simulation. No fake success. No hardcoded completion. Real PDF extraction only.

## Enforcement

- Reviewers must reject PRs that include sample outputs, hardcoded extraction results, or tests that do not run end-to-end with real PDFs.
- CI should include a smoke integration test that runs at least one documented end-to-end PDF extraction and save. If CI cannot access a real DB or runtime, the PR must include explicit manual verification steps and artifacts.

## Contact / Questions

If an agent is unsure about an edge case or needs a temporary test harness, open an issue describing the need and get approval from a human reviewer before using any simulated data.
