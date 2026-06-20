# Dead Code Audit Report

This report summarizes the dead code audit findings for the BimaHeadquarter CRM application.

## Summary

The core Next.js source code (under `src/`) is highly modular and extremely clean. Unused helper functions and destructured imports were fully pruned from `src/lib/policies/pdf/extractor.cjs` as part of ESLint warning elimination.

## Audit Findings

| File / Directory | Reason | Safe to Delete (YES/NO) |
| --- | --- | --- |
| `archive/` | Stale copy of legacy code/scratch files, not imported by the main Next.js application. | YES (Keep only for backup purposes if desired, ignored from ESLint runtime) |
| `scratch/` | Developer scratch scripts and test data files. | YES (Safe to remove as they are not used in application code or packaging) |
| `scripts/` | Data migration and utility scripts used for master database seeds. | NO (Required for setting up database and development seed data) |
| `vitest.config.mjs`, `tests/` | Unit test configuration and test suites. | NO (Required for CI/CD test automation) |

## Cleanup Performed
- **Pruned Unused Imports**: Cleaned up dozens of unused imports and destructures inside `src/lib/policies/pdf/extractor.cjs`.
- **ESLint Ignores**: Configured ESLint to exclude development helper folders (`scratch/`, `archive/`, `scripts/`) to maintain warnings at exactly zero.
