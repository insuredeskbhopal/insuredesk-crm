# InsureDesk CRM

Production Next.js App Router application for InsureDesk IMF Pvt. Ltd. and the Bima Headquarter public website.

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/` | Next.js application, APIs, business logic, and UI |
| `prisma/` | Database schema and migrations |
| `public/` | Public static assets |
| `tests/` | Automated tests and policy fixtures |
| `scripts/` | Maintained operational, migration, import, and seed scripts |
| `scratch/` | Local one-time diagnostics; ignored by Git and not application runtime code |
| `docker/` | Container configuration |
| `whatsapp-gateway/` | Standalone WhatsApp gateway service |
| `rto-data/` | RTO master reference dataset used by policy extraction |
| `storage/` | Local uploads and working documents; ignored by Git |
| `docs/` | Architecture, setup, archived task notes, and deferred SEO material |
| `reports/` | Generated business reports and operational audits |
| `artifacts/` | Generated policy-processing output |
| `graphify-out/` | Generated codebase knowledge graph |

See [docs/README.md](docs/README.md) for the documentation index.

## Protected policy extraction code

Motor and policy PDF extraction logic lives under `src/lib/policies/`. Do not relocate or modify its parsers, schemas, routing, or extraction helpers as part of repository housekeeping. Extraction changes require dedicated fixtures and regression tests.

## Root files

Framework and tool configuration remains at the repository root because Next.js, TypeScript, ESLint, Tailwind, Vitest, Prisma, Vercel, npm, and deployment tooling discover these files there.
