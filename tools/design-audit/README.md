# Insuredesk CRM — Isolated AI Design & Vibe-Code Audit Suite

This directory provides a **read-only, zero-production-overhead** design quality and AI-slop detection workflow isolated from the root Next.js / React 19 application and Prisma/API backend.

## Architecture & Isolation Guarantees

- **Zero root dependency impact**: All Node packages live in `tools/design-audit/package.json` (`node_modules` gitignored) and Python packages live in `tools/design-audit/.venv-vibecheck` (gitignored). Root `package.json`, `next.config.mjs`, `tsconfig.json`, database, and production bundles are untouched.
- **Strictly read-only**: Does not edit source files (`src/**`, `BHQ/**`), modify database records, alter authentication, or bypass middleware.
- **Ephemeral local target**: When run in default `--mode=all` without `--url=...`, launches an ephemeral `next start` server on `127.0.0.1` from the existing `.next/` build, inspects only unauthenticated public/login routes (`/`, `/login`, `/crm/admin/login`, `/services`, `/faq`, `/download-app`), and terminates cleanly.

## Integrated Tools

| Tool | Version / Upstream | License | Integration Method |
|---|---|---|---|
| **Impeccable** | `impeccable@4.11.1` (`pbakaus/impeccable`) | Apache-2.0 | Isolated CLI (`detect --json --no-config`) on static `src/app` + live desktop/mobile URLs |
| **Slop Detect** | `slop-detect-core@0.9.1` / `slop-detect@0.9.1` (`ravidsrk/slop-detect`) | MIT | Chromium `playwright-core` evaluation of 45 design patterns, copy axis, craft floor, and 390px mobile reflow |
| **VibeCheck** | `ashish-jabble/vibe-check` | MIT | Isolated Python 3.14 `.venv-vibecheck` running `VibeCodingAnalyzer` on captured DOM/CSS/JS bundles |
| **Vibe Code Detector** | `paladini/vibe-code-detector` | MIT | Pure DOM heuristic engine (`adapters/vibe-code-detector.mjs`) executed in Chromium + JSDOM |
| **PixelSlop** | `pixelslop@0.3.8` (`gabelul/pixelslop`) | Apache-2.0 | `collectSourcePatterns` + live desktop/tablet/mobile UX evidence scoped to `tools/design-audit/reports/pixelslop/` |

> **Compatibility Note (`o-k-a-y/vibecheck`)**: The unrelated Rust repository `o-k-a-y/vibecheck` distributes no prebuilt Windows binaries and requires `cargo`/`rustc`, which is not installed on this host. It is intentionally omitted instead of installing a Rust toolchain.

## Usage

```powershell
# Full read-only audit (static source + ephemeral live browser scan)
npm --prefix tools/design-audit run audit

# Static-only scan (no browser or Next server required)
npm --prefix tools/design-audit run audit:static

# Live scan against an already-running local server
node tools/design-audit/audit.mjs --mode=live --url=http://127.0.0.1:3000
```

Outputs are generated into `tools/design-audit/reports/` (`latest-audit.json` and `latest-audit.md`), which are gitignored.
