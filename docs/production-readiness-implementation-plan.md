# BHQ CRM production-readiness implementation plan

Date: 9 October 2026. Status: proposed for review; application changes are not authorized by creating this document.

## Objective and boundaries

Resolve demonstrated security and reliability gaps, verify critical CRM workflows, and reduce measured unnecessary server work with the smallest effective changes. This is targeted hardening, not a rewrite or redesign.

- Preserve customer/policy data, staff authentication, tenant boundaries, connected WhatsApp sessions, account ownership and individual sender preferences.
- Keep motor PDF extraction logic, schemas and helpers untouched. Any justified non-motor training fix must follow the exact insurer/category isolation rules in `AGENTS.md`.
- Do not add a database, dependency, service, index or schema change without proving that existing mechanisms are insufficient.
- Trace every caller before changing a shared function. Keep each independent fix reviewable and reversible.
- Use isolated fixtures/staging for failure injection, messages, PDF uploads, restoration and concurrency tests. Do not restart/disconnect production sessions or load-test production during diagnosis.
- Public entry points remain `/login`; do not expose internal CRM login routes. Any necessary dialog uses the existing body portal, centered layout and blurred viewport backdrop.
- Record for every modification: reproduced problem, necessity, exact files/behavior, dependent workflows, expected load impact, verification results and rollback.

## Current evidence

The last completed full run has 758 tests: 734 passed and 24 failed. The failed test names were already failing before the recent performance pass. The focused changed-behavior suite passes 59 tests; the isolated production build passes; full lint has zero errors and 50 warnings. These results do not prove every production workflow works.

The recent load work already coalesces account reads, uses compact background snapshots, pauses hidden-tab reads, shares pending policy-count calculations and removes unnecessary non-Super-Admin lead aggregates. Leave those working changes intact unless new measurements expose a regression. Details and local evidence are in [the server load audit](server-load-audit.md).

The following are directly observed code gaps:

1. `refreshUserClaims` returns original JWT claims when its database lookup fails.
2. The staff login handler has no application-level attempt limiter. Hosting/WAF protections have not been verified.
3. The WhatsApp worker atomically claims `SENDING` rows but has no observed automatic recovery for an interrupted claim.
4. Individual queue retry resets a row to `PENDING` without restricting its current status; an active or already-sent row can therefore be selected for retry.

Backup scripts exist, but restore success, deployment gates, production alerting and realistic load capacity remain unverified. Absence of verification must not be presented as proof that infrastructure protections do not exist.

## Phase 1 — Baseline and failure classification

**Why:** Changing code to satisfy stale source assertions can damage working behavior. Genuine workflow failures must be separated from fixture/environment problems and timing failures.

**Work:**

1. Record the exact revision, working diff, runtime/tool versions and test commands. Preserve the existing local evidence rather than treating an older committed checkout as an equivalent baseline.
2. Reproduce the 24 failures individually and in the full suite. Classify each as application defect, inaccurate assertion/fixture, missing environment/fixture, or intermittent timing/concurrency failure.
3. Trace the affected endpoints and callers. Create one short issue record per root cause, including intended behavior and a minimal reproduction.
4. Establish staging with separate data, credentials, storage and gateway sessions. Use anonymized/minimal data and controlled recipients. Inspect deployment/migration configuration without applying changes.

**Files initially affected:** documentation/evidence only; existing failing tests and production files are candidates, not a pre-approved edit list.

**Dependent functionality:** client login and policy linking/saves, claims, birthday access, dashboard/reporting, attendance, PDF extraction, modal behavior and record columns.

**Verification:** a reproducible baseline and an explicit disposition for every failure. A fixture correction must retain the intended assertions; do not remove, skip or weaken failing tests to conceal a defect.

**Exit:** each proposed functional change has demonstrated need and a bounded scope. No production data changes.

## Phase 2 — Authentication failure handling

**Problem:** `src/lib/auth/index.js` accepts original signed claims when a fresh user lookup fails. A valid signature does not establish that the user's role, account or organization is still authorized.

**Required change:** prevent a failed required account validation from authorizing protected work. Distinguish temporary validation-service failure from an invalid/expired token, so a database interruption does not unnecessarily clear a valid cookie or redirect everyone to login. Preserve the existing bounded cache policy initially; evaluate its revocation interval explicitly rather than silently removing caching and increasing database load.

**Files/callers to inspect:** `src/lib/auth/index.js`, `src/lib/auth/session.js`, `src/lib/auth/middleware.ts`, `src/lib/client-portal/session.js`, `src/middleware.ts`, and every import/call of `verifyJWT` or shared session guards. Modify only callers that need to propagate the temporary-failure contract. Edge middleware's signature check is not a substitute for backend authorization.

**Impact:** protected reads/writes may temporarily return a service-unavailable response when required account validation cannot complete. Staff/client login, server-rendered pages, API guards, role changes and account deactivation can be affected. Do not alter token durations, cookie settings or public routing as part of this fix without another demonstrated need.

**Verification:** valid and invalid tokens; database failure before/after cache expiry; deleted users; role/organization changes; staff/client separation; legitimate login and recovery after database availability returns. Verify no protected mutation occurs under failed required validation, no retry storm is introduced, and a temporary outage is not incorrectly treated as invalid credentials.

**Rollback:** revert only this change through the reviewed release process. Because rollback could restore a security gap, use a restricted/maintenance state for affected actions when necessary rather than silently re-enabling unsafe authorization.

## Phase 3 — Login attempt protection

**Problem to establish:** the inspected staff login route lacks application-level throttling; external controls may already provide protection.

**Work:** inspect actual hosting/WAF rules, staff/client authentication endpoints and existing limiting mechanisms. Exercise limits in staging. If protection is adequate, document it and add verification rather than another limiter. Otherwise implement the smallest effective control at the appropriate layer, preferring existing platform features.

**Candidate scope:** `src/app/api/auth/login/route.js`; related client credential endpoints only if they share a demonstrated gap; hosting configuration only if that is the chosen control. The file-backed review limiter must not be assumed to provide safe distributed authentication limiting.

**Impact:** repeated failed credential attempts can receive a temporary restriction. Legitimate employees sharing an office IP, mobile clients, corrected passwords and recovery flows must continue to work. Avoid permanent account locks or a limit based only on one office IP; keep responses from revealing whether an account exists. Distributed coordination must work across instances if enforcement occurs in the application.

**Verification:** failed-attempt bursts; normal successful login; multiple staff behind one IP; temporary-block expiry; instance concurrency; trusted proxy/IP handling; limit-store failure behavior. Measure any additional database work. Do not log passwords, MPINs or tokens.

**Rollback:** revert/tune the isolated rule without changing account records or credentials. Preserve an effective abuse-control mechanism if a replacement proves faulty.

## Phase 4 — WhatsApp retry safety and interrupted-send recovery

### 4A. Restrict manual retry first

**Problem:** `POST` in `src/app/api/operations/whatsapp/queue/route.js` resets individual rows regardless of current status. A stale UI or concurrent request can reset an active send or replay an already-sent message.

**Required change:** define supported retry states and enforce them atomically in the shared endpoint. Reuse current initiating-user/admin, organization, sender and attachment-payload validation. A stale or unsupported retry must return a clear conflict instead of restarting delivery. Inspect UI retry controls and every endpoint caller; update presentation only if necessary to match the enforced state rules.

**Impact:** users cannot retry active/already-sent rows through a stale control. Retrying an eligible failed message remains available. Explicitly sending a new message remains a separate action. Existing sender preferences, session connections and historic audit references remain unchanged.

**Verification:** `SENT` and active `SENDING` rejection; two simultaneous retries; concurrent worker claim versus retry; foreign organization/user denial; valid failed retry; attachment audit rejection; original account retained after a preference change.

### 4B. Handle abandoned claims conservatively

**Problem:** a process interruption after an atomic claim can leave a row at `SENDING`. An interruption after gateway delivery but before the database update creates uncertain delivery, where automatic resend may duplicate the message.

**Files/callers to inspect:** `src/lib/whatsapp/queue-manager.js`, `src/lib/whatsapp/dispatch.js`, `src/lib/whatsapp/whatsapp-client.js`, `src/app/api/cron/whatsapp-worker/route.js`, manual automation/birthday callers, the gateway's acknowledgement capabilities, and queue tests. The current queue model already has `updatedAt`, `attempts`, `errorMessage` and message-reference fields.

**Required design before editing:** establish bounded send duration, worker scheduling/overlap, acknowledgement semantics and how an abandoned attempt can be distinguished from a live one. An old timestamp alone does not prove that a worker stopped. Prefer existing fields and atomic comparisons if sufficient. Propose an additive claim/lease field only if a concrete concurrency requirement cannot be met otherwise; document deployment order and compatibility before migration.

**Behavior:** confirmed non-delivery may use bounded retry through the existing sender. Uncertain delivery goes to explicit review/reconciliation; do not blindly reset all stale rows. Gateway disconnection, permission revocation and missing sender must never cause fallback to another number. Do not promise exactly-once delivery without a verified end-to-end idempotency mechanism.

**Impact:** queue lifecycle and operations visibility after failure/restart. Existing completed messages, accounts and personal preferences are not rewritten. Failure classification may require clearer queue text; it does not justify a page redesign or a gateway restart in production during testing.

**Verification:** interruption before send, during request, after acknowledgement and before final DB update; slow live worker; overlapping workers; database update failure; gateway timeout; unauthorized/disconnected sender; preference change after enqueue. Assert no active claim is stolen and no uncertain message is automatically resent. Measure bounded recovery work.

**Rollback:** stop the newly added recovery path and return to the previous worker version without resending uncertain rows. Preserve safe retry restrictions, audit records and any compatible additive fields; no destructive schema rollback.

## Phase 5 — Fix confirmed existing workflow defects

**Why:** passing the hardening tests does not resolve the existing 24 failures.

For each Phase 1 issue, propose and implement the smallest root-cause fix in the shared function actually responsible. Inspect sibling callers and tenant permissions. Separate client policy/linking work from reporting, attendance and PDF work so each change can be reviewed and rolled back independently.

**Reporting:** determine whether category/query assertions are stale or whether calculations are incorrect. Verify tenant scope, date/time boundaries, filters, pagination and totals against known fixtures. Do not rewrite SQL or add indexes without query evidence.

**PDF extraction:** reproduce the intermittent case with its existing fixture, identify whether the problem is data, timeout, OCR concurrency or extraction. Preserve motor behavior and all other scopes. A justified non-motor training change edits only its exact insurer/category module, fixtures/tests and registration if required. Include same-insurer/different-category and different-insurer/same-category isolation checks. Do not increase global timeouts or OCR work to conceal the root cause.

**Verification/exit:** all known release-blocking behavior has a passing regression test and staging scenario. Every remaining failure has an investigated, documented reason and release disposition; a green suite must not be achieved through arbitrary expectation changes. If a prohibited motor modification would be required, report the finding and leave that code untouched.

**Rollback:** one defect/change at a time. Never roll back customer data to revert application code; investigate any required data repair separately.

## Phase 6 — Backups, release gates and operational visibility

**Backup verification:** inspect `scripts/backup-database.ps1`, actual scheduling/retention, provider backups and access controls. Confirm backups cover database records, uploaded PDFs and gateway session credentials with appropriately restricted access. Restore into isolated targets; do not start a restored WhatsApp session alongside its production counterpart. Check representative policy/customer relationships and document access. Record achieved recovery time and recovery point; do not invent targets before business requirements are agreed.

**Release gates:** inspect the actual deployment configuration and migration history. Add only missing controls: lint/build, tests for touched behavior, critical workflow regression checks and schema compatibility verification. Check migration prerequisites before releasing code that depends on columns. Separate CRM deployment from gateway deployment. Never run a cleanup/build against the running development server's output directory.

**Monitoring:** inspect existing provider logs and alerts first. Add only missing low-overhead signals for failed protected actions, queue failures/stuck claims, PDF/OCR failures, database latency/pool exhaustion, CPU/RAM and critical route latency. Reuse request correlation where available. Exclude credentials, QR/auth material, message bodies and customer documents from telemetry. Avoid high-frequency health checks that repeatedly scan tables.

**Impact:** deployment workflow, diagnostic visibility and isolated restore infrastructure. Any added monitoring has cost/overhead and must be measured. This phase does not change business rules.

**Verification:** successful isolated restore and smoke check; deliberate staging failure produces an actionable alert; deliberately broken build/test/migration compatibility prevents release; last-known-good application rollback works without data loss. Infrastructure configuration changes require their own exact documented scope.

## Phase 7 — Measured performance work

**Baseline first:** use existing provider metrics and staging timings to measure CPU, peak memory, database connections/query duration, API error rate, request counts and p50/p95 latency. Include realistic staff concurrency and data volume established from actual usage. Use sanitized data and bounded test duration. Do not generate synthetic live WhatsApp traffic or stress production OCR/database endpoints.

**Representative scenarios:** dashboard, policy/customer lists and saves, claims, filtered reports, PDF text/OCR uploads, Operations Hub, header-only WhatsApp selection, queue processing and hidden tabs. Include overlapping PDF/report usage because isolated page timings can hide resource contention.

**Optimization rule:** change only a demonstrated bottleneck. Candidate measures are reusing current caching, avoiding redundant reads, limiting payloads or optimizing a proven slow query. An index, background processing change, concurrency limit or cache policy change needs measured evidence and a correctness/security review before selection. Do not optimize attendance heartbeats or PDF parsing merely to reduce request counts.

**Impact:** specific measured paths only. Caching can affect freshness, indexing can affect write cost, and concurrency changes can affect waiting time; document those trade-offs for the chosen change. Keep authorization decisions out of unsafe shared caches.

**Verification:** compare the same dataset, concurrency and test conditions before/after; validate totals, permissions, freshness and output alongside speed. Record any trade-off. No accepted performance change may increase errors or break a critical workflow. Do not claim a CPU percentage improvement from request counts alone.

## Phase 8 — Integrated staging verification and controlled release

1. Run build/lint, the complete suite and relevant regression checks for the final combined revision. Report failures and warnings accurately.
2. Verify staff/admin/client access and tenant separation; login/logout and account deactivation; customer/policy linking, save/update and claims; report totals and filters; representative PDF extraction and document access; attendance/timezone behavior.
3. Verify Siya and Rahul independently select authorized senders, send to controlled recipients from different modules, change one preference, refresh/login again, and retain independent preferences. Revoke/disconnect only an isolated test account and confirm no fallback. Verify queued messages retain their assigned sender and system automation uses its separately configured account.
4. Verify session/QR handling and group selection on staging with dedicated gateway credentials. Do not pair or restore duplicate production sessions.
5. Run approved concurrency/failure scenarios; confirm alerts and rollback behavior. Preserve evidence against the exact release revision.
6. Present the final file/config/schema diff, verification results, remaining limitations, measured performance and rollback procedure for release review. Creating this plan does not authorize a push, migration or production deployment.
7. Once deployment is authorized, release independent changes in small steps and check authenticated smoke flows and provider metrics after each. Stop on new errors, authorization regression, duplicate/uncertain delivery or resource exhaustion. Do not use destructive data restoration as an application rollback.

## Completion criteria

- Demonstrated security gaps are closed with regression evidence and explicit outage behavior.
- Critical CRM scenarios pass; every previous failure is resolved correctly or has an investigated and explicitly accepted release disposition.
- Interrupted and uncertain message handling is safe, bounded and verified; no unauthorized/global sender fallback occurs.
- Backups can actually be restored, release gates work and critical operational failures are detectable.
- Representative load is measured; accepted changes reduce the identified work without incorrect data, freshness/permission regression or new resource exhaustion.
- No protected motor code, existing production data or connected WhatsApp session is changed incidentally.
- A final report distinguishes local, staging and production evidence. No blanket zero-load, zero-bug or exactly-once guarantee is claimed.

The implementation starts only after review of this plan. Final file lists and infrastructure choices are confirmed at each phase from its investigation; unknowns are not treated as authorization for broad changes.
