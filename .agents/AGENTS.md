# Modal Layout Guidelines

- **Overlay Alignment**: All modal cards, dialog overlays, and popup blocks must be perfectly centered both vertically and horizontally.
- **Backdrop Styling**: The background page behind any active overlay must be visually blurred using backdrop blur classes (e.g., `backdrop-blur-sm` or `backdrop-blur-md` in Tailwind) and overlay masks to ensure the active card is visually separated and stands out.

# Motor Policy Extraction Guidelines

- **No Modifications to Motor Logic**: Under no circumstances should you edit or modify any motor policy PDF extraction logic, schema definition, or helper logic (e.g., in `src/lib/policies/pdf/utils/motor.cjs`, motor schemas, or motor parsers). Any parsing updates or training request for other lines of business (like Fire, Burglary, Fidelity, or Workmen's Compensation) must be implemented completely separately, without touching the motor parser code path.

