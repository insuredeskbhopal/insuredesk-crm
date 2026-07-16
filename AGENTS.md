# Modal Layout Guidelines

- **Overlay Alignment**: All modal cards, dialog overlays, and popup blocks must be perfectly centered both vertically and horizontally.
- **Backdrop Styling**: The background page behind any active overlay must be visually blurred using backdrop blur classes (e.g., `backdrop-blur-sm` or `backdrop-blur-md` in Tailwind) and overlay masks to ensure the active card is visually separated and stands out.

# Motor Policy Extraction Guidelines

- **No Modifications to Motor Logic**: Under no circumstances should you edit or modify any motor policy PDF extraction logic, schema definition, or helper logic (e.g., in `src/lib/policies/pdf/utils/motor.cjs`, motor schemas, or motor parsers). Any parsing updates or training request for other lines of business (like Fire, Burglary, Fidelity, or Workmen's Compensation) must be implemented completely separately, without touching the motor parser code path.

# PDF Training Isolation Guidelines (Strict)

- **Exact Training Scope**: Every PDF training change must be isolated to one exact `(insurance company, policy category)` pair, such as `(ICICI Lombard, Fire)` or `(Tata AIG, Warehouse)`.
- **Bidirectional Category Isolation**: Training Motor must not affect Fire, Warehouse, Health, Marine, or any other category, and training any non-motor category must not affect Motor or another non-motor category for the same insurer.
- **Insurer Isolation**: Training one insurer must not change extraction behavior for any other insurer.
- **Scoped Training Modules Only**: Add training under `src/lib/policies/pdf/training/<insurer>/<category>.cjs`. A training module may use only neutral helpers such as text, regex, dates, locations, and amounts. It must not import another training scope, an insurer parser, a motor helper, or a motor schema.
- **Training Diff Boundary**: A training task may edit only its exact scoped module, scoped fixtures/tests, and the registry when registering a new scope. It may import existing neutral helpers but must not modify shared helpers, the base extractor, another scope, or another insurer as part of that training task.
- **Immutable Scope Identity**: Training modules must not change `insuranceCompany`, `companyName`, `documentCategory`, `documentFormat`, or `sourceDocumentType`. Scope selection belongs exclusively to the training registry.
- **Regression Proof Required**: Every training change must include tests for its own scope plus isolation tests proving it is not selected for another category of the same insurer or the same category of another insurer.

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

# Public vs CRM Path Guidelines (Strict Security)

- **Hide CRM Routes**: Under no circumstances should any link, CTA button, form, or redirection in the public-facing area of the website expose or point to the internal CRM routes (such as `/crm/*` or `/crm/admin/login`).
- **Public Login Access**: Public/client entry points must always point to `/login` (or equivalent clean public routes). Staff know the secret `/crm/admin/login` path manually.
