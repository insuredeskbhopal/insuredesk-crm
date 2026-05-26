# BIMAHEADQUARTER Stabilization Report

## What Changed

- Split dashboard-owned styling from root global CSS.
- Added clean cache scripts: `clean`, `dev:clean`, and `build:clean`.
- Removed the stale duplicate ESM PDF extractor.
- Stopped sending raw `sourceText` and `raw` payloads to the browser.
- Replaced `JSON.stringify(record)` search with metadata-only search indexing.
- Removed database mutation from `GET /api/records`.
- Added upload count, byte-size, MIME, and PDF-signature validation.
- Added destructive delete confirmation and optional admin-token guarding.
- Added optional admin-token guarding for PDF downloads.
- Added ESLint, Prettier, Vitest, and focused unit tests.

## Migration Strategy

1. Stop all local dev/build processes.
2. Run `npm run clean`.
3. Run `npm install`.
4. Run `npm run lint`.
5. Run `npm test`.
6. Run `npm run build`.
7. For production, set `ADMIN_API_TOKEN` before exposing PDF download or delete endpoints.
8. Optional upload limits:
   - `MAX_UPLOAD_FILES`
   - `MAX_UPLOAD_BYTES`

## Cleanup Checklist

- Remove stale `.vite/`, `.next/`, and `dist/` artifacts from any deployment bundle.
- Do not run `npm run build` while `npm run dev` is active.
- Use `npm run dev:clean` after CSS/build manifest corruption.
- Review existing records that contain `sourceText`; new records no longer store it.
- Decide whether historical `sourceText` should be purged from JSON data.
- Move PDFs to object storage before production-scale usage.

## Technical Debt

- `app/ui/dashboard.js` is still too large and should be split into components.
- `app/ui/dashboard.css` is scoped by import but still uses global class names.
- No real authentication/session model exists yet.
- Delete confirmation is a guardrail, not full authorization.
- PDF parsing is regex-based and should be made provider/version aware.
- Records are still JSON-heavy; a normalized relational schema is the long-term fix.
- Tables are not virtualized yet.

## Optimization Summary

- Frontend no longer receives raw PDF source text.
- Search now indexes known metadata fields only.
- Tests pin down search and validation behavior.
- CSS ownership is less centralized, reducing root-layout CSS fragility.

## Security Summary

- Uploads now validate file count, size, MIME, and `%PDF-` signature.
- Delete-all requires `x-confirm-delete: DELETE_ALL_POLICY_RECORDS`.
- If `ADMIN_API_TOKEN` is set, destructive delete and PDF download require `x-admin-token`.
- PDF responses include basic hardening headers.

## Recommended Roadmap

1. Add real auth and role-based access control.
2. Normalize policy metadata into columns with DB indexes.
3. Move PDF bytes to object storage and keep signed download URLs.
4. Add pagination and server-side filtering.
5. Split dashboard into `Sidebar`, `TopNavigation`, `UploadPanel`, `RecordsTable`, `ClientProfilePanel`, and modal components.
6. Add API integration tests with a test database.
7. Add upload stress tests and parser fixtures for each insurer document format.
