# Modal Layout Guidelines

- **Overlay Alignment**: All modal cards, dialog overlays, and popup blocks must be perfectly centered both vertically and horizontally.
- **Backdrop Styling**: The background page behind any active overlay must be visually blurred using backdrop blur classes (e.g., `backdrop-blur-sm` or `backdrop-blur-md` in Tailwind) and overlay masks to ensure the active card is visually separated and stands out.

# Motor Policy Extraction Guidelines

- **No Modifications to Motor Logic**: Under no circumstances should you edit or modify any motor policy PDF extraction logic, schema definition, or helper logic (e.g., in `src/lib/policies/pdf/utils/motor.cjs`, motor schemas, or motor parsers). Any parsing updates or training request for other lines of business (like Fire, Burglary, Fidelity, or Workmen's Compensation) must be implemented completely separately, without touching the motor parser code path.

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


