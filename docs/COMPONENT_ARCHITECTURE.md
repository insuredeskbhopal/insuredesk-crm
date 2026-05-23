# Component Architecture

## Goal

Split the current dashboard UI into domain-owned components without changing the rendered UI. This is an architecture path for safe growth, not a redesign plan.

## Current State

The dashboard has already grown into a multi-domain insurance workspace. It includes upload intake, saved records, customer management, policy detail, analytics, report drill-downs, alerts, navigation, and shared table behavior. Much of that still renders from dashboard-level files, which makes every change feel larger than it should.

## Target Structure

```text
app/components/
  layout/
    AppShell.tsx
    TopBar.tsx
    SideNav.tsx
    PageHeader.tsx

  upload/
    UploadZone.tsx
    UploadQueue.tsx
    PreviewPanel.tsx
    ManualCorrectionForm.tsx
    UploadActions.tsx

  records/
    RecordsPanel.tsx
    RecordsTable.tsx
    RecordsSearch.tsx
    RecordCard.tsx
    RecordActions.tsx

  analytics/
    AnalyticsPage.tsx
    KpiCard.tsx
    ReportPanel.tsx
    ReportRow.tsx
    DrilldownPanel.tsx
    ReportSummaryGrid.tsx
    ChartPlaceholder.tsx

  customers/
    CustomerDirectory.tsx
    CustomerProfile.tsx
    CustomerSummaryCards.tsx
    CustomerPolicyList.tsx

  policies/
    PolicyDetail.tsx
    LinkedPolicyCard.tsx
    PolicyTable.tsx
    PolicyPdfAction.tsx

  shared/
    Button.tsx
    SearchBox.tsx
    EmptyState.tsx
    AlertCard.tsx
    PdfLink.tsx
    MoneyValue.tsx
    DateValue.tsx
    StatusPill.tsx
```

## Extraction Rules

- Extract shared UI first, then layout, then analytics, then customers and policies, then records, then upload.
- Keep class names unchanged during extraction.
- Keep JSX output as close as possible to the current markup.
- Do not rename props during the first extraction unless it prevents confusion or runtime errors.
- Do not change route behavior, state behavior, database behavior, PDF behavior, or save behavior.
- Run `npm run build` after each domain extraction.
- If a component is tied to complex local state, document it and defer extraction.

## High-Risk Components

`RecordsTable` is high risk because sticky columns, horizontal scroll, column widths, and large data behavior can break visually.

Upload components are high risk because they touch PDF validation, extraction preview, queue state, save behavior, and manual correction.

Layout components are medium risk because sidebar/header spacing must remain identical.

Analytics components are medium risk because every KPI and chart row must preserve drill-down behavior.

## Safe First Components

The first shared components should be simple display wrappers:

- `PdfLink`
- `MoneyValue`
- `DateValue`
- `StatusPill`
- `EmptyState`
- `AlertCard`

These are safe only if they preserve the same class names and rendered output.

