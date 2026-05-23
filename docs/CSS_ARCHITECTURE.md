# CSS Architecture

## Goal

Keep the current UI visually unchanged while making the stylesheet easier to maintain as the insurance ERP grows. The refactor phase is about moving existing selectors into clearer domain files, not redesigning components, changing spacing, changing colors, or changing behavior.

## Why Split The Current Dashboard CSS

The current dashboard stylesheet carries multiple product domains in one place: analytics, records, customers, uploads, policy detail, reports, alerts, tables, and navigation. That worked while the app was smaller, but it will become harder to safely change once renewal workflows, AI insights, role-based screens, dark mode, and interactive charts are added.

Splitting by domain gives each part of the product a clear home. It also reduces accidental side effects, makes review easier, and lets future work happen in smaller steps with build verification after each move.

## Future Structure

```text
app/styles/
  tokens.css
  layout.css
  navigation.css
  dashboard.css
  analytics.css
  records.css
  customers.css
  policies.css
  upload.css
  tables.css
  alerts.css
  responsive.css
```

## File Ownership

`tokens.css` owns design variables only: colors, shadows, borders, motion, radii, spacing, and future semantic tokens.

`layout.css` should own app shell structure, page wrappers, fixed header/sidebar spacing, panel rhythm, and major workspace layout.

`navigation.css` should own top navigation, side navigation, active states, nav buttons, and user controls.

`dashboard.css` should own dashboard-specific overview sections that do not belong to a deeper feature domain.

`analytics.css` should own KPI cards, report panels, chart rows, donut reports, drill-down report sections, and analytics report state classes.

`records.css` should own policy records screens, records actions, saved-data panels, and records search areas.

`customers.css` should own customer directory, customer profile, customer search, and customer summary views.

`policies.css` should own policy detail views, linked-policy presentation, policy metadata groups, and policy document actions.

`upload.css` should own PDF intake, upload queue, extraction preview, manual correction fields, and upload workflow states.

`tables.css` should own shared table behavior, sticky headers, sticky columns, column widths, compact table variants, and table scroll containers.

`alerts.css` should own alert cards, dismiss controls, error/success/warning states, empty states, and system feedback.

`responsive.css` should own breakpoint overrides after domain files are split. Existing responsive behavior should be moved carefully and only after the related base selectors are stable.

## Migration Rules

- Move selectors only; do not redesign during the refactor phase.
- Split one domain file at a time.
- Run `npm run build` after every split.
- Do not rename classes unless a selector cannot be safely separated without it.
- Do not change colors, spacing, typography, shadows, borders, or interaction behavior during the refactor phase.
- Keep imports centralized so CSS load order stays predictable.
- Preserve current selector order when moving rules unless a domain file requires local grouping to keep existing cascade behavior.
- When shared selectors affect multiple domains, leave them in the shared file until ownership is clear.
- Treat responsive overrides as part of the selector they modify until `responsive.css` is introduced deliberately.

## Risk Checklist

- Sticky table columns: confirm horizontal scroll, sticky headers, sticky left columns, and PDF/action columns still align after table selectors move.
- Fixed sidebar/header spacing: confirm page content does not slide under navigation or lose top spacing.
- Analytics scroll containers: confirm report cards, chart rows, drill-down tables, and nested report sections keep their current height and overflow behavior.
- Responsive breakpoints: confirm mobile/tablet layouts still match the current behavior after each domain split.
- Shared button/card classes: confirm global button styles, secondary actions, report cards, metric cards, panels, and PDF links do not change visually.
- Import order: confirm tokens load first, then global base styles, then domain styles in the intended cascade order.
- Build safety: run `npm run build` after each movement and fix only refactor-related regressions.

