# Reporting Architecture

## Goal

Move analytics report behavior into a reusable reporting layer so every KPI, chart row, customer report, insurer report, location report, and quality report can use the same drill-down model.

The visual UI should not change during reporting extraction.

## Target Structure

```text
app/lib/reporting/
  overview.ts
  renewals.ts
  customers.ts
  insurers.ts
  locations.ts
  quality.ts
  filters.ts
  totals.ts
  export-report.ts
```

## Report Contract

Each report function should eventually return the same shape:

```ts
{
  title: string;
  filter: unknown;
  totalRecords: number;
  totalPremium: number;
  totalSumInsured: number;
  records: PolicyRecord[];
  chartData: unknown[];
}
```

## Reporting Rules

- Do not hardcode report filtering inside JSX.
- Keep all drill-down record filtering in reporting utilities.
- Use one drill-down system for KPI cards, chart legends, bar rows, report rows, and quality checks.
- Keep export behavior separate from display components.
- Keep totals separate from chart grouping logic.
- Keep date and renewal logic isolated from UI components.
- Preserve current labels and counts during extraction.

## Domain Files

`overview.ts` should own total policies, total premium, total sum insured, active clients, policies with PDF, and missing PDF.

`renewals.ts` should own expired policies and upcoming renewal buckets.

`customers.ts` should own customer grouping, top customers, and customer-level totals.

`insurers.ts` should own insurance company grouping and insurer-level totals.

`locations.ts` should own district, tehsil, and location-based grouping.

`quality.ts` should own missing PDF, missing policy number, missing premium, missing expiry, missing contact, and future data-cleanup checks.

`filters.ts` should own reusable report filters and drill-down predicates.

`totals.ts` should own reusable premium, sum insured, count, and money parsing helpers.

`export-report.ts` should own report export formatting and JSON export helpers.

## Risk Checklist

- KPI click should still open the same records in drill-down.
- Chart legend click should still open matching records.
- Bar row click should still open matching records.
- Customer report click should still open customer profile when expected.
- Export JSON should export the currently selected drill-down records.
- Renewal date parsing should not change.
- Money parsing should not change.

