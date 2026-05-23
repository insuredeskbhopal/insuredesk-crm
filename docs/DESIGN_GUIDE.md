# InsurCRM Design Guide

This document is the source of truth for UI design changes in this project.
Use it before editing `app/ui/dashboard.css`, `app/globals.css`, or dashboard JSX.

## Design Goal

InsurCRM is an admin CRM and policy records workspace. The UI should feel clean,
professional, spacious, and easy to scan. Avoid marketing-style layouts, oversized
visuals, decorative gradients, or experimental styling.

## Theme Rule

Do not change the color theme unless explicitly requested.

Keep using the existing variables and neutral palette from `app/globals.css`:

- `--primary`
- `--secondary`
- `--on-surface`
- `--on-surface-variant`
- `--surface-lowest`
- `--surface-low`
- `--surface-container`
- `--outline`
- `--outline-variant`
- `--error`
- `--shadow`
- `--shadow-soft`

When improving layout, change spacing, grid structure, alignment, sizing, and
hierarchy first. Do not introduce new brand colors.

## Layout Principles

- Keep pages dense but readable.
- Prefer structured admin layouts over decorative cards.
- Keep page title, subtitle, and actions aligned in one clear header row.
- Only show page actions that apply to the current page.
- Keep panels full-width inside the content area.
- Avoid nested cards inside cards.
- Avoid large empty areas at the top of the page.
- Search should sit close to the content it filters.

## Spacing

Use a clean, breathable rhythm:

- Page inner padding: around `28px 0 36px`.
- Panel padding: around `22px`.
- Grid gaps: `16px` to `24px`.
- Form gaps: around `16px`.
- Table cell padding: around `12px 14px`.
- Inputs should feel comfortable, around `38px` tall.
- Buttons should feel comfortable, around `36px` tall.

Do not make the UI overly compact. Keep enough space for repeated admin use.

## Cards

Cards are allowed for customers, metrics, repeated summaries, and profile items.
Cards should be clean and useful, not decorative.

Card rules:

- Use `border-radius: 8px` or close to it.
- Use the existing white background and subtle border.
- Use `var(--shadow-soft)` for normal cards.
- Use small hover lift only when useful.
- Keep typography compact.
- Do not add colorful accent bars or new gradients unless requested.

Customer cards, when used, should include:

- Customer name as the strongest text.
- Policy count as metadata.
- District, tehsil, premium, and sum insured as compact stats.
- One clear `View Profile` action.

## Tables

Policy records are data-heavy and should remain table-first.

Table rules:

- Header should be sticky when the table scrolls vertically.
- Important identity columns may be sticky if it improves scanning.
- Columns should have stable widths.
- Numeric money columns should align right.
- Long text should wrap or truncate cleanly without breaking layout.
- Keep table controls above the table, not inside the table.

Do not replace the policy records table with cards unless explicitly requested.

## Forms

Forms should be compact and aligned.

- Use grid layouts for field groups.
- Labels stay uppercase and small.
- Inputs use existing border, radius, and focus style.
- Wide text fields should span the full row.
- Avoid excessive helper text inside the app UI.

## Buttons

Buttons should be functional and page-specific.

- Use icons from `lucide-react` when available.
- Do not show upload/save actions on pages where they do not apply.
- Destructive actions such as `Delete All` should remain visually clear.
- Keep button text short.

## Customer Management

Customer Management can use either:

1. A clean card grid for browsing customers.
2. A compact directory/table layout for admin scanning.

Whichever design is chosen, keep it consistent across all customer states:

- Search state
- Empty state
- Customer list state
- Customer profile state

Do not mix card and table patterns in the same customer list.

Current agreed customer flow:

- Customer list uses the compact directory/table-style layout.
- `View Profile` opens the selected client profile.
- Client profile shows linked policies in a normal compact table.
- Policy number is clickable.
- Clicking a policy number opens a separate policy detail view.
- Policy detail view must show both client details and full policy details.
- Use `Back to Profile` to return from policy detail to the client profile.
- Do not change this flow unless explicitly requested.

## Policy Records

Policy Records should prioritize scanability and horizontal data review.

Recommended structure:

1. Page title and subtitle.
2. Records panel header with export/delete actions.
3. Search input.
4. Scrollable records table.

Do not show bulk upload save/history controls on this page.

## Analytics & Reports

Analytics is for a non-technical MD/owner. Reports must explain the business
without requiring database knowledge.

Current agreed analytics flow:

- Show business KPI cards first.
- KPI cards should be compact, not oversized.
- Every KPI number must be clickable.
- Use mixed report visuals: KPI strip, pie/donut charts, bar charts, and report lists.
- Donut/pie legends must be clickable.
- Bar chart rows must be clickable.
- Report list rows must be clickable.
- Clicking any report item opens a drill-down section on the same page.
- Drill-down must show:
  - Report title
  - Filter explanation
  - Matching policy count
  - Matching premium
  - Matching sum insured
  - Matching policy records
  - JSON export
- Top customer rows open the customer profile.
- Report data should be calculated from the currently loaded policy records.
- Do not leave charts as static decoration; every number/graph should fetch or reveal the underlying data.

## Responsive Behavior

At narrower widths:

- Sidebar becomes stacked.
- Tables may scroll horizontally.
- Customer cards should collapse from 3 columns to 2 columns to 1 column.
- Directory rows should collapse into readable stacked rows.
- Text must not overlap controls.

## Do Not Do

- Do not change theme colors without explicit approval.
- Do not add gradient or decorative backgrounds.
- Do not add large hero sections.
- Do not add marketing copy.
- Do not redesign unrelated pages while fixing one page.
- Do not make text too large inside compact admin panels.
- Do not put cards inside other cards.

## Change Checklist

Before finishing a design change:

- Confirm the color theme is unchanged.
- Confirm the changed page still fits the admin CRM style.
- Confirm mobile/tablet behavior does not overlap.
- Run `npm.cmd run build`.
- If a dev server shows a webpack runtime error, run a clean restart:
  `npm.cmd run build:clean` or stop the dev server, clear `.next`, and restart.
