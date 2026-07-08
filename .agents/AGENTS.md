# Modal Layout Guidelines

- **Overlay Alignment**: All modal cards, dialog overlays, and popup blocks must be perfectly centered both vertically and horizontally.
- **Backdrop Styling**: The background page behind any active overlay must be visually blurred using backdrop blur classes (e.g., `backdrop-blur-sm` or `backdrop-blur-md` in Tailwind) and overlay masks to ensure the active card is visually separated and stands out.

# Motor Policy Extraction Guidelines

- **No Modifications to Motor Logic**: Under no circumstances should you edit or modify any motor policy PDF extraction logic, schema definition, or helper logic (e.g., in `src/lib/policies/pdf/utils/motor.cjs`, motor schemas, or motor parsers). Any parsing updates or training request for other lines of business (like Fire, Burglary, Fidelity, or Workmen's Compensation) must be implemented completely separately, without touching the motor parser code path.

# Investigation First Rule

Before modifying anything:

1. Identify every file involved.
2. Trace the execution flow end to end.
3. Explain: files to inspect, files likely to change, why each needs modification, possible risks.
4. Stop. Do not modify anything until this investigation is complete.

Never jump directly into editing.

---

# Ponytail, lazy senior dev mode

You are a lazy senior developer. Lazy means efficient, not careless. The best code is the code never written.

Before writing any code, stop at the first rung that holds:

1. Does this need to be built at all? (YAGNI)
2. Does it already exist in this codebase? Reuse the helper, util, or pattern that's already here, don't re-write it.
3. Does the standard library already do this? Use it.
4. Does a native platform feature cover it? Use it.
5. Does an already-installed dependency solve it? Use it.
6. Can this be one line? Make it one line.
7. Only then: write the minimum code that works.

The ladder runs after you understand the problem, not instead of it: read the task and the code it touches, trace the real flow end to end, then climb.

Bug fix = root cause, not symptom: a report names a symptom. Grep every caller of the function you touch and fix the shared function once — one guard there is a smaller diff than one per caller, and patching only the path the ticket names leaves a sibling caller still broken.

Rules:

- No abstractions that weren't explicitly requested.
- No new dependency if it can be avoided.
- No boilerplate nobody asked for.
- Deletion over addition. Boring over clever. Fewest files possible.
- Shortest working diff wins, but only once you understand the problem. The smallest change in the wrong place is a bug.

# BimaHeadquarter Development Constitution

This is a long-term production CRM. The goal is zero duplicate components, zero duplicate logic, zero accidental regressions.

## Golden Rule (Every Task, No Exceptions)

Before writing a single line of code:
1. Understand the complete execution flow — trace where the feature starts, where data comes from, every component involved, every dependency.
2. Search the entire codebase for an existing solution (components, hooks, utils, styles, APIs, schemas, constants).
3. Reuse > Extend > Compose > Create. Creating new is the last resort.
4. Prefer configuration over new files. Mode/props change behavior — not separate components.
5. Write the smallest possible diff.
6. Preserve all existing behavior. Regression is never acceptable.
7. Verify: no duplicate code, UI, or business logic was introduced.
8. If creating anything new, justify explicitly why existing code cannot be reused.

## Core Rules

- **Understand before changing.** Never modify code you don't fully understand.
- **Search first.** Before creating any component, modal, card, table, form, hook, util, helper, validator, schema, context, constant, API, service, or style — search if it exists. If it does, extend it.
- **Single source of truth.** Shared UI (cards, modals, forms, tables, badges, detail views) must use ONE reusable component. Never duplicate UI. Configuration changes behavior, not separate components.
- **Configuration over components.** One `PolicyCard` with props beats `MotorCard`, `HealthCard`, `LifeCard`. One `CustomerModal` with a `mode` prop beats Add/Edit/View variants.
- **No duplicate logic.** If the same logic exists twice, extract it. One implementation, multiple usages.
- **No hardcoded values.** Status, colors, icons, labels, policy types, LOB, roles, routes — use constants.
- **No versioned components.** Never create `PolicyCard2`, `PolicyCardNew`, `CustomerModalV2`. Improve the original.
- **Smallest change.** Never reformat unrelated files, rename variables without reason, move files without reason, or change imports unnecessarily.
- **Never break existing features.** New features must preserve existing UI, APIs, behavior, shortcuts, permissions, and workflows.
- **Respect current architecture.** No new patterns, folder structures, or state management unless explicitly requested.
- **Forms are dynamic.** Large forms use field config (`fieldConfig = { motor: [...], health: [...] }`), not separate implementations.
- **Tables are dynamic.** Use column config, cell renderers, visibility/permission rules. Never duplicate tables.
- **Performance.** No duplicate fetches, renders, unnecessary state, deep prop drilling, or expensive computations in render. Memoize where appropriate.
- **Keep state local.** Only lift state when truly needed. No unnecessary Context or global state.
- **No duplicate CSS.** If a style exists, reuse it. Extract shared styles. Desktop styles must never break while fixing mobile.
- **Mobile safety.** Desktop is source of truth. Mobile fixes must never alter desktop appearance. Always isolate responsive changes.
- **API safety.** No duplicate endpoints. Search existing routes first. Extend existing handlers.
- **Database safety.** Never modify schema, rename columns, migrate data, or change existing records unless explicitly requested. Backward compatibility first.
- **File safety.** Never create a new file when an existing one can be extended. Split only when it clearly improves maintainability.
- **Delete before add.** Ask: can existing code solve this? Can this be configured? Can two components become one? Deletion is preferred.
- **Preserve business logic.** Insurance calculations, renewals, claims, policy extraction, OCR, customer workflows, permissions — never change unless explicitly requested.
- **Production ready only.** No TODOs, no placeholders, no mock implementations, no temporary fixes.
- **Approval before high-risk changes.** Never perform without approval: database changes, mass refactoring, folder restructuring, package installation, dependency replacement, auth changes, env var changes, build config changes, large UI redesigns.

## End-of-Task Validation Checklist

After every implementation, verify:
- [ ] No duplicate code introduced
- [ ] No duplicate components created
- [ ] Existing behavior unchanged
- [ ] Mobile works, desktop unchanged
- [ ] Build passes, lint passes
- [ ] Reused maximum existing code
- [ ] Smallest possible diff achieved

# Master Principle

BimaHeadquarter is a mature production CRM.

Every implementation must leave the codebase simpler than it was found.

Measure success by: fewer components, fewer files, fewer helpers, fewer duplicate styles, fewer duplicate APIs, fewer duplicate business rules, smaller diffs, zero regressions.

The highest quality implementation is the one that solves the problem by reusing and simplifying the existing system rather than expanding it.

---

# BimaHeadquarter Extended Production Rules

## CSS Rule
Before writing any CSS: search for an existing utility class or shared style first. Reuse existing component classes second. Create new CSS only if no reusable solution exists. Never duplicate spacing, colors, radius, shadows, or animations.

## Component Extension Rule
Never create a new component if an existing one can be extended with props, variants, configuration, render functions, or slots. Extend before creating.

## Modal Rule
There is one reusable modal system. Never create multiple modal implementations. All dialogs must reuse the existing modal wrapper — animations, backdrop, keyboard handling, focus management, and close behavior come from one place.

## Policy UI Rule
All policy detail views must use the same reusable component. Never create `MotorDetailCard`, `HealthDetailCard`, `WarehouseDetailCard`. Use one generic Policy Detail component configured by policy type.

## Extraction Isolation Rule
Each Line of Business must remain isolated. Changes to one LOB must never affect another. Motor extraction must never be modified while implementing Fire, Burglary, Fidelity, WC, Marine, or Engineering. Isolation is mandatory.

## Shared Business Logic Rule
Business rules must exist only once. Renewal calculation, status calculation, premium formatting, date formatting, currency formatting, claim status, customer display — never duplicate business rules.

## API Rule
Never create an endpoint that returns duplicated data. Prefer extending the existing API response over introducing another endpoint serving nearly identical information.

## Loading Rule
Every async action must reuse the existing loading pattern. Do not invent new spinners, loaders, skeletons, or progress indicators.

## Error Handling Rule
Reuse existing error components. Do not create unique error UIs for each page. Errors should feel identical across the CRM.

## Empty State Rule
Empty states must use the shared design language: same spacing, same illustration style, same typography, same CTA positioning. Consistency over customization.

## Icons Rule
Reuse existing icon mappings. Never import another icon for the same meaning. One icon per concept.

## Form Rule
If two forms share more than 70% of their fields, they must become one configurable form. Configuration determines fields, not separate implementations.

## Table Rule
Never create another table implementation. Use the shared table with column config, cell renderer, actions renderer, visibility config, and permission config.

## Search Before Install Rule
Before installing any package ask: Can the browser do this? Can JavaScript do this? Can React or Next.js do this? Does the project already contain something similar? Only install dependencies as the absolute final option.

## File Size Rule
Do not split files simply because they are large. Split only when responsibilities are clearly different, code becomes reusable, or readability clearly improves. Large but cohesive is better than fragmented.

## Naming Rule
Names must describe purpose. Never use: `Helper2`, `UtilsNew`, `Temp`, `Final`, `Latest`, `New`, `Old`, `Test`, `Copy`. Every name must remain meaningful years later.

## Comment Rule
Comments explain WHY, never WHAT obvious code already explains. Good comments survive refactoring.

## AI Output Rule
Before generating code ask: Can I delete code? Can I configure existing code? Can I reuse an existing component, helper, or API? Can I solve this by changing one shared function instead of five callers? If yes, do that instead.

## Scope Lock
Only implement exactly what was requested. Never improve unrelated code, refactor unrelated files, rename variables, clean formatting, or apply "while I'm here" fixes. If it wasn't requested, don't touch it.

## Approval Gate
If the solution requires creating more than 3 files, modifying more than 8 files, changing shared components, changing business logic, changing API contracts, or changing database structure — stop. Explain why. Wait for approval.

## Shared Component Protection
Before modifying any reusable component: search every place that uses it, list every consumer, ensure the change is backward compatible. Never break another screen to fix one screen.

## Existing Pattern Rule
Every new implementation must resemble existing code. Prefer consistency over personal preference. The CRM should look like it was written by one developer.

## Side Effect Rule
Every change must affect only the requested feature. Never introduce hidden behavior changes. If another feature changes as a side effect, it is a bug.

## Root Cause Rule
Never patch symptoms. Identify the shared source. Fix it once. Do not scatter fixes across callers.

## Build Preservation
Never change `package.json`, `next.config`, `tailwind.config`, `tsconfig`, `eslint`, `vercel`, or environment variables unless explicitly requested.

## Import Rule
Before creating a helper, search existing imports. If something already exists, reuse it. Avoid duplicate utility functions.

## Simplicity Test
Before submitting code ask: Is there a simpler solution? Can this use fewer files? Can this remove code? Can this reuse existing code? Can this become configuration? If yes, choose the simpler implementation.

## Zero Parallel Systems
Never create a second way of doing the same thing. One table, one modal, one form, one policy card, one API, one loader, one toast, one date formatter, one currency formatter, one permission checker. Everything must have one implementation.

## Final Review
Before finishing every task verify:
- [ ] No duplicate component
- [ ] No duplicate logic
- [ ] No duplicate CSS
- [ ] No duplicate API
- [ ] No new architecture introduced
- [ ] Smallest possible diff
- [ ] Existing behavior preserved
- [ ] Desktop unchanged
- [ ] Mobile unchanged
- [ ] Existing reusable code maximized
- [ ] Business logic untouched unless requested
- [ ] Production ready

---

## Change Verification
Before making any modification: identify what behavior is expected to remain unchanged, identify what behavior should change, verify only the requested behavior is affected. If any unrelated behavior changes, the implementation is incorrect.

## Existing Flow Protection
Before modifying a shared function: list every known flow that depends on it. Verify the change remains compatible with every existing flow. Never optimize one workflow at the expense of another.

## Data Safety
Never modify existing customer data, extracted policy data, stored documents, uploaded files, or historical records unless explicitly requested. New features must remain compatible with existing data.

## Backward Compatibility
Every change should be backward compatible by default. Never rename response fields, remove props, remove exports, remove constants, remove routes, or change existing APIs unless explicitly requested.

## Consistency
If the same feature exists elsewhere, the implementation should look and behave the same. Users should never wonder why one page works differently from another.

## Code Quality
Prefer: simple, predictable, readable, maintainable. Avoid: clever code, deep nesting, duplicate conditions, over-engineering, future abstractions. Write code another developer can understand in one reading.

## Merge Before Create
Whenever two implementations solve nearly the same problem, merge them into one configurable implementation instead of maintaining both.

## Documentation
When changing an important workflow, update the existing documentation if needed. Never create duplicate documentation.

## Feature Isolation
Every feature must remain isolated. A change inside Claims, Renewals, OCR, Customer, Dashboard, Reports, or Endorsements must never unexpectedly modify another module.

## Final Delivery
Every completed task must satisfy:
- [ ] Smallest possible diff
- [ ] Maximum reuse
- [ ] No regressions
- [ ] No duplicate code
- [ ] No duplicate components
- [ ] No duplicate business logic
- [ ] No unnecessary files
- [ ] Production ready
- [ ] Backward compatible
- [ ] Easy for the next developer to understand

---

# Renewal Module Rules

* **Renewals are NOT policy records.**
* A renewal is a workflow/task linked to an existing policy, not a new policy issuance.
* Renewal records must never be stored in the primary policy table.
* Renewals should appear only in the **Renewal Module/Section** until the policy is actually issued.
* Only after successful policy issuance should a new policy record be created.

# Dashboard Calculation Rules

Never include renewal records in business production calculations.

Exclude renewals from:
* EOD (End of Day)
* MTD (Month to Date)
* YTD (Year to Date)
* Revenue
* Premium Collection
* Policy Count
* Company Production
* Employee Production
* Branch Performance
* Commission Reports
* Sales Analytics
* Charts
* Leaderboards

Renewals should have their own dashboard showing:
* Upcoming Renewals
* Overdue Renewals
* Renewal Pipeline
* Renewal Success Rate
* Renewal Premium
* Lost Renewals

# Data Protection Rules

**Data safety is the highest priority.**

Never:
* Delete existing user data.
* Overwrite uploaded documents.
* Replace policy PDFs.
* Replace claim documents.
* Remove attachments during updates.
* Delete records because a new upload exists.

Instead:
* Create a new version.
* Preserve every uploaded file.
* Keep complete history.
* Maintain audit logs.

# PDF Handling Rules

Uploaded PDFs are source documents.

Always:
* Store the original file unchanged.
* Never modify the original PDF.
* Never overwrite an uploaded document.
* Create extracted data separately.
* Allow re-extraction without replacing the original.
* Allow multiple PDFs for one policy.

The original uploaded PDF must always remain recoverable.

# Update Rules

Updating a policy should only modify fields that changed.

Never:
* Reset blank fields.
* Delete existing values.
* Remove attachments.
* Remove remarks.
* Remove claims.
* Remove endorsements.
* Remove renewal history.

Only update fields explicitly provided.

# Database Safety Rules

Never perform destructive operations unless explicitly confirmed.

Avoid:
* DELETE
* TRUNCATE
* DROP
* Mass UPDATE

Prefer:
* Soft Delete
* Archive
* Versioning
* Change Logs

# File Storage Rules

Every uploaded file must have:
* Unique filename
* Timestamp
* Original filename
* Upload user
* Upload date
* File checksum/hash

Never reuse filenames.

# Audit Trail Rules

Every modification must record:
* Who changed it
* When it changed
* Previous value
* New value
* IP/User
* Change reason (if applicable)

Nothing should become untraceable.

# Extraction Rules

PDF extraction must never overwrite manually entered data.

Priority:
1. Manual user data (highest)
2. Approved extracted data
3. Newly extracted data (pending review)

Show differences and let the user approve changes before applying them.

# Backup Rules

Before any update:
* Preserve current record.
* Preserve all attachments.
* Preserve extracted JSON.
* Preserve OCR output.

Allow rollback if needed.

# General Development Rules

* Never break existing working functionality.
* Never modify unrelated modules.
* Preserve backward compatibility.
* Do not refactor stable code unless explicitly requested.
* Make the smallest possible change.
* Prefer additive changes over replacing existing logic.
* Never assume missing data should be deleted.
* Null values must not overwrite existing values.
* Every major change should be reversible.

## Golden Rule

> **Data integrity is more important than new features. Every user upload, policy, document, attachment, remark, and history record must be preserved. Never delete or overwrite user data unless the user explicitly requests it. All updates must be incremental, auditable, and reversible.**

