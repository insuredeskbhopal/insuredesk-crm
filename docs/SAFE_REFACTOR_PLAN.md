# Safe Refactor Plan

## Principle

Architecture changes must be boring, small, and reversible. The current UI should remain visually unchanged while the codebase becomes easier to grow.

## Phase 1: Documentation Only

Create and maintain:

- `docs/CSS_ARCHITECTURE.md`
- `docs/COMPONENT_ARCHITECTURE.md`
- `docs/REPORTING_ARCHITECTURE.md`
- `docs/SAFE_REFACTOR_PLAN.md`

No runtime behavior changes belong in this phase.

## Phase 2: Folder Structure Only

Create empty domain folders and placeholder files where useful. Do not move logic yet.

```text
app/components/layout/
app/components/upload/
app/components/records/
app/components/analytics/
app/components/customers/
app/components/policies/
app/components/shared/

app/styles/
app/lib/reporting/
app/lib/records/
app/lib/pdf/
app/lib/db/
app/lib/export/
app/lib/utils/
```

Run `npm run build`.

## Phase 3: Shared Utility Extraction

Move only pure helper functions into:

- `app/lib/utils/`
- `app/lib/reporting/`
- `app/lib/records/`
- `app/lib/export/`

Rules:

- No UI changes.
- No API behavior changes.
- Keep current function behavior.
- Add small comments only where they reduce risk.
- Run `npm run build` after each utility group.

## Phase 4: Shared UI Components

Extract low-risk shared components first:

- `Button.tsx`
- `SearchBox.tsx`
- `EmptyState.tsx`
- `AlertCard.tsx`
- `PdfLink.tsx`
- `MoneyValue.tsx`
- `DateValue.tsx`
- `StatusPill.tsx`

Rules:

- Keep class names.
- Keep JSX output nearly identical.
- Do not redesign.
- Run `npm run build`.

## Phase 5: Layout Components

Extract:

- `AppShell.tsx`
- `TopBar.tsx`
- `SideNav.tsx`
- `PageHeader.tsx`

Rules:

- Sidebar/header spacing must remain identical.
- Active navigation must still work.
- Route behavior must not change.
- Run `npm run build`.

## Phase 6: Analytics Components And Reporting Logic

Extract analytics components after shared and layout components are stable.

Create reporting utilities:

- `overview.ts`
- `renewals.ts`
- `customers.ts`
- `insurers.ts`
- `locations.ts`
- `quality.ts`
- `filters.ts`
- `totals.ts`
- `export-report.ts`

Rules:

- Every KPI/card/chart row should use the same drill-down system.
- Do not hardcode report filtering inside JSX.
- Report functions should return consistent report objects.
- Run `npm run build`.

## Phase 7: Records Components

Extract records components only after analytics is stable.

Rules:

- `RecordsTable` is high risk.
- Preserve sticky columns and horizontal scroll.
- Do not change column widths unless fixing a clear bug.
- Run `npm run build`.

## Phase 8: Customer Components

Extract:

- `CustomerDirectory.tsx`
- `CustomerProfile.tsx`
- `CustomerSummaryCards.tsx`
- `CustomerPolicyList.tsx`

Rules:

- Customer name click must still open customer profile.
- Customer policy list must still link to policy detail.
- Run `npm run build`.

## Phase 9: Policy Components

Extract:

- `PolicyDetail.tsx`
- `LinkedPolicyCard.tsx`
- `PolicyTable.tsx`
- `PolicyPdfAction.tsx`

Rules:

- Policy number click must still open detail.
- PDF icon must still open or download the correct PDF.
- Run `npm run build`.

## Phase 10: Upload Components

Extract upload components last.

Rules:

- Upload flow is business critical.
- Do not change extraction behavior.
- Do not change save behavior.
- Do not change PDF validation behavior.
- Run `npm run build`.

## Phase 11: CSS Split

Split CSS only after components are stable.

Order:

1. Tokens
2. Alerts
3. Navigation
4. Upload
5. Analytics
6. Customers and policies
7. Records and tables

Rules:

- Move selectors only.
- Preserve visual output.
- Keep imports centralized.
- Run `npm run build` after each CSS move.

## Manual Validation Checklist

- Home page opens.
- Upload works.
- PDF extraction still works.
- Record save works.
- Records table opens.
- Analytics opens.
- KPI click opens drill-down.
- Customer profile opens.
- Policy detail opens.
- PDF opens or downloads.
- Export JSON works.
