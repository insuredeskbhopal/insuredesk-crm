# BHQ CRM — Phase 1 investigation findings

Date: 9 October 2026 (Asia/Kolkata). Scope: baseline and failure classification only. **Implementation has not begun.**

## 1. Findings and evidence limits

The investigation demonstrated these application risks with the actual handlers and synthetic, mocked persistence/gateway calls:

| Finding | Priority | Demonstrated impact |
|---|---|---|
| Individual WhatsApp retry accepts SENT and active SENDING rows | P1 | A sent row is replayed; a live worker and a second worker can send the same row twice. |
| Gateway acknowledgement followed by a failed SENT database update is treated as a send failure | P1 | The worker changes the row to RETRYING and sends it again, without retaining the first acknowledgement reference. |
| Abandoned SENDING claims are never selected by the worker | P1 | An old SENDING row remains stuck; automatically replaying it would be unsafe because its delivery outcome is unknown. |
| Authentication database-error fallback restores old signed privileges | P1 | A token carrying SUPER_ADMIN claims is accepted after the fresh user query fails, including after a cached MANAGER downgrade expires. |
| Direct Client ID selection can detach a policy from an attached OPEN request | P1, subject to confirming the existing workflow contract | A mocked AGENT update returns 200, clears the attached request ID, and makes zero request lookups. The existing test explicitly requires this action to be rejected. |
| Local nightly database backup task is unsuccessful and local dumps are stale | P1 operational | Last task result is a Windows refusal error; newest observed local dump is 23 June. Provider backups and restore capability are unverified. |
| Latest commit has a failed Railway deployment status | P1 release investigation | GitHub reports Railway failure and Vercel success for the same SHA. This is not proof that the running gateway is down. |
| Staff login has no observed application attempt limiter or configured Vercel custom firewall rules | P1 preventive security | Source and provider configuration confirm the gap. No brute-force traffic or compromised account was demonstrated. |
| No enforced test/release checks were found on main | P1 release reliability | main is unprotected, rulesets are empty, commit check runs are empty, Actions runs are empty, and Vercel native checks are empty. |
| Source assertions, incomplete mocks, eager WhatsApp imports and unresolved presentation contracts | P2 | Detailed per-test disposition below; these are not all production failures. |

**No P0 incident was demonstrated.** There is no evidence here of an active breach, confirmed customer duplicate delivery, confirmed data loss, or a total production outage. P1 means a reproduced security/data-integrity risk or an observed operational control failure. P2 means a narrower correctness, coverage or performance concern without demonstrated urgent production impact.

This is not a production certification. Mocked probes establish code behavior, not production database state or actual recipient delivery. No production CPU, memory, database latency, traffic-capacity or customer-delivery measurements were collected. “Zero additional server load,” “all modules stable” and “exactly-once delivery” would be unsupported claims.

## 2. Exact baseline and investigation boundary

### Revision and existing work

- Branch: main.
- HEAD: 4e036db2e7ff14b9a2c54d04c9c3d6512fd34dae.
- The current Vercel production deployment reports that SHA. Tests below exercise the **dirty local worktree**, which includes earlier uncommitted changes; they do not certify the deployed SHA by itself.
- At entry: 11 tracked files modified, 6 nonignored untracked files; tracked diff 1,041 insertions and 312 deletions.
- These changes predate Phase 1. None was reverted, committed, reformatted or modified during this investigation.
- SHA-256 manifest captured 1,143 tracked/nonignored files at 2026-10-09T09:48:48.906Z (15:18:48 IST).
- Installed versions: Node 24.16.0; Next.js 15.5.18; Vitest 4.1.7; Prisma and generated client 6.19.3; jose 6.2.3.
- Existing configuration: [vitest.config.mjs](<C:/Users/abhis/insuredesk-crm/vitest.config.mjs:1>). Test script is vitest run; build script is next build; postinstall generates the Prisma client. [package.json](<C:/Users/abhis/insuredesk-crm/package.json:5>).

Entry status, recorded verbatim:

~~~
 M src/app/api/operations/whatsapp/sessions/route.js
 M src/app/components/layout/SideNav.tsx
 M src/app/components/operations/WhatsAppSetupPage.js
 M src/app/components/operations/WhatsAppSetupPage.module.css
 M src/app/components/whatsapp/PrimaryWhatsAppSelector.js
 M src/app/lib/client-api.js
 M src/lib/records/tab-counts-cache.js
 M src/lib/reports/lead-generation.js
 M tests/lead-agent-report.test.js
 M tests/performance-optimization.test.js
 M tests/whatsapp-account-access.test.js
?? docs/production-readiness-implementation-plan.md
?? docs/server-load-audit.md
?? docs/whatsapp-auto-sync.md
?? src/app/lib/whatsapp-sync.js
?? tests/tab-counts-cache.test.js
?? tests/whatsapp-ui-sync.test.js
~~~

### Safe execution profile

The original test configuration, test files and assertions were retained. Child processes received a synthetic JWT secret, an invalid PostgreSQL endpoint at 127.0.0.1:1, synthetic gateway keys and a preload that rejects Node socket connections. Prisma's native engine does not use that JavaScript socket hook, so the invalid database URL was essential as a separate safeguard.

This prevented successful production database connections. It also exposed an existing unsafe test dependency: attendance tests import a function that calls attendance finalization before reading users. Running those tests against a real database could attempt attendance writes.

The guards do not make arbitrary future scripts safe. The runner here was used only for the inspected test suite and the isolated probes. Read-only provider API requests and the two explicitly identified gateway GET requests were performed separately.

Reproduction commands from the workspace root:

~~~powershell
git rev-parse HEAD
git status --porcelain
git diff --stat

# Do not repeat snapshot: it would overwrite the preserved entry manifest.
node scratch/phase1-runner.cjs full
node scratch/phase1-runner.cjs individual
node scratch/phase1-diagnostics2.cjs
node scratch/phase1-fixture-completion.cjs
node scratch/phase1-identity-probes.cjs
node scratch/phase1-extra-attendance.cjs
node scratch/phase1-verify-boundary.cjs
~~~

The full runner's underlying command is:

~~~
node node_modules/vitest/vitest.mjs run --reporter=json --outputFile=scratch/phase1-evidence/baseline-full.json
~~~

The individual runner records the exact anchored test-name expression, command array, exit code, assertion result, duration and failure stack for each F01–F24 in [individual-summary.json](<C:/Users/abhis/insuredesk-crm/scratch/phase1-evidence/individual-summary.json>). Each case also has its own Fnn.json and Fnn.log.

**Results:**

| Run | Result |
|---|---|
| Protected full suite, original configuration | 117 test files; 758 tests; 734 passed; 24 failed; exit 1 |
| Separate runs of the earlier 24 failing test identities | 23 failed; F16 passed |
| Authentication/queue observational probes | 7 passed; mocked gateway/persistence only |
| Payroll-calendar observational probe | 1 passed; mocked attendance finalization/persistence |
| Attached-request detachment observational probe | 1 passed, demonstrating the unsafe current behavior |
| Completed diagnostic fixtures | Original selected assertions passed for F03, F04, F05, F07 and F09; F06 remains a contract mismatch; F08 exposes the workflow defect after completing its fixture |

Individual runs use -t to select one case. Other cases appear as unselected/skipped in those reports because of the command filter; no test was edited to skip, deleted, weakened or excluded from the full run. Scratch diagnostic copies add logging and complete missing mock dependencies. Their original assertions remain intact. New observational tests assert current behavior to capture evidence; they are not regression tests proving a fix.

**The failure count stayed at 24, but the identity set changed.** The prior CPM failure F16 now passes. The second monthly-attendance test, E01, now fails at an unmocked database read. F19 also reaches the database-error boundary instead of its earlier Sunday assertion. This difference must not be concealed behind the identical totals.

Full-suite evidence: [baseline-full.json](<C:/Users/abhis/insuredesk-crm/scratch/phase1-evidence/baseline-full.json>), [baseline-full.log](<C:/Users/abhis/insuredesk-crm/scratch/phase1-evidence/baseline-full.log>). Entry hashes/status: [baseline-manifest.json](<C:/Users/abhis/insuredesk-crm/scratch/phase1-evidence/baseline-manifest.json>).

A build and broad lint run were not repeated in Phase 1. Earlier successful build/lint evidence is not represented as fresh Phase 1 verification. The existing local development server was left running.

## 3. Individual disposition of the 24 earlier failures

Each ID below maps to the exact full test name and reproduction command in individual-summary.json. Test assertion line references are from the untouched tests.

| ID | Test / individual result | Actual evidence and source | Classification / expected behavior |
|---|---|---|---|
| F01 | birthday-rbac.test.js:122; failed, 403 error-text mismatch | [account-access.js:7](<C:/Users/abhis/insuredesk-crm/src/lib/whatsapp/account-access.js:7>) rejects VIEWER in the shared write guard before the older birthday-specific message. | P2 assertion contract. VIEWER is denied as expected; no sending bypass. |
| F02 | birthday-rbac.test.js:144; same mismatch | Same shared write guard on the individual birthday action. | P2 assertion contract, distinct individual evidence F02.json. Preserve 403 and prove no enqueue/send call. |
| F03 | claims-pagination.test.js:53; 500 instead of 200 | Diagnostic exception: prisma.$queryRaw is not a function. Tenant aggregate query is [claims/route.js:40](<C:/Users/abhis/insuredesk-crm/src/app/api/claims/route.js:40>); fixture defines only claim methods at tests/claims-pagination.test.js:6. | P2 incomplete mock. Adding the SQL aggregate mock to a scratch copy passes the unchanged lightweight-row, counter, tenant and pagination assertions. |
| F04 | client-google-login.test.js:88; success false | Actual response: 401 Invalid Client ID or MPIN. [credentials.js:166](<C:/Users/abhis/insuredesk-crm/src/lib/client-portal/credentials.js:166>) requires a stored MPIN hash and password comparison. Original fixture supplies a phone ending in 3210, not a credential record. | P2 obsolete credential fixture. Supplying a synthetic stored hash passes original assertions. Do not restore phone-derived authentication. |
| F05 | client-id-request-workflow.test.js:331; 500 | Actual body: tx.clientAccount.findMany is not a function. [client-id-requests/route.js:520](<C:/Users/abhis/insuredesk-crm/src/app/api/client-id-requests/route.js:520>) lists same-phone identities; test mock at line 7 lacks findMany. | P2 incomplete mock. Completed scratch fixture passes all original four-policy attachment assertions. |
| F06 | client-id-request-workflow.test.js:361; 500 instead of 409 | Initial missing findMany is identical to F05. After supplying a different same-phone identity and a new-account result, actual response is 200 CREATE_NEW, with the correct requested identity. [route.js:528](<C:/Users/abhis/insuredesk-crm/src/app/api/client-id-requests/route.js:528>) links only exact matches, otherwise creates another identity. | P2 unresolved business contract. Current code does not silently link the wrong client; test additionally forbids creating another identity on the same phone. Confirm that rule before changing either behavior or expected outcome. |
| F07 | client-policy-save.test.js:71; 400 instead of 201 | Diagnostic exception: buildCanonicalFields is absent from the mocked records module. The route imports it at [policy-records/route.js:4](<C:/Users/abhis/insuredesk-crm/src/app/api/policy-records/route.js:4>); mock at test line 28 exports only normalizeRecord. | P2 incomplete partial mock. Restoring actual neutral record exports in a scratch copy passes the unchanged Client ID save assertions. No demonstrated production save failure. |
| F08 | client-policy-update.test.js:82; 404 instead of 409 | Initial fixture supplies one policy read; handler now rereads under the policy lock at [id/route.js:263](<C:/Users/abhis/insuredesk-crm/src/app/api/policy-records/[id]/route.js:263>). After completing that and the active-client fixture, actual handler returns 200 and clears the OPEN request without querying it. | P2 fixture defect plus P1 application workflow defect; detailed record in section 6. Do not relabel this as merely a stale test. |
| F09 | client-policy-update.test.js:104; isolated 400 instead of 200; earlier combined result 409 | Isolated diagnostic exception: parseCanonicalNumber is absent from the same partial records mock; used at [id/route.js:229](<C:/Users/abhis/insuredesk-crm/src/app/api/policy-records/[id]/route.js:229>). Completing neutral exports passes unchanged assertions. | P2 fixture incompleteness and isolation issue. vi.clearAllMocks at test line 32 clears calls, not queued mock implementations; F08's unused task response can leak into F09 and cause the combined 409. Reset mock implementations and seed each scenario explicitly. |
| F10 | dashboard-overview.test.js:14; missing literal uploadedFile.groupBy | Actual source is prisma.uploadedFile followed by a newline and .groupBy at [overview/route.js:377](<C:/Users/abhis/insuredesk-crm/src/app/api/dashboard/overview/route.js:377>). SQL aggregate queries also remain. | P2 formatting-sensitive assertion. This failure does not prove a table scan or a removed aggregate. Verify query calls, predicates and selected fields, not contiguous formatting. |
| F11 | dashboard-overview.test.js:47; missing Active Policies literal | Current dashboard uses changed labels/components, including the linked policy card at [DashboardOverview.js:173](<C:/Users/abhis/insuredesk-crm/src/app/components/dashboard/DashboardOverview.js:173>). | P2 presentation/coverage drift. Preserve operational metric correctness and the Bulk Upload ingestion boundary; do not redesign to satisfy a label assertion. Actual metric values still need behavioral fixtures. |
| F12 | dashboard-overview.test.js:68; missing Renewal pipeline literal | Current heading is Renewal Pipeline & Retention Graph at [DashboardOverview.js:818](<C:/Users/abhis/insuredesk-crm/src/app/components/dashboard/DashboardOverview.js:818>). Earlier style assertions pass before the heading fails. | P2 wording-sensitive assertion. Verify the current intended grouped hierarchy and rendered accessibility; no runtime layout failure was reproduced by this test. |
| F13 | dashboard-overview.test.js:89; destination-summary API literal absent | Current dashboard fetches overview and header-data at [DashboardOverview.js:1186](<C:/Users/abhis/insuredesk-crm/src/app/components/dashboard/DashboardOverview.js:1186>), then derives renewal metrics from headerCounts. | P2 data-contract drift, not just whitespace. Due10 is assigned to expiringToday and due20 to expiring7Days at lines 1195–1196. Reconcile these semantics with destination filters using shared fixtures before deciding whether code or test is wrong. Live numeric correctness is unverified. |
| F14 | dashboard-overview.test.js:126; missing tab=all link | The current renewal navigation is at [DashboardOverview.js:818](<C:/Users/abhis/insuredesk-crm/src/app/components/dashboard/DashboardOverview.js:818>); the test requires older specific metric destinations. | P2 navigation contract drift. Test each current metric against its destination filter/count, including missing all-state routing; do not delete expectations without establishing intended behavior. |
| F15 | dashboard-overview.test.js:149; report heading changed | [lead-generation/page.js:57](<C:/Users/abhis/insuredesk-crm/src/app/(dashboard)/dashboard/reports/lead-generation/page.js:57>) says Lead generation command center; SUPER_ADMIN guard remains at line 28 and creator link at line 198. | P2 wording-sensitive assertion. Keep role restriction, grouping and creator filter; test those behaviors separately from heading copy. |
| F16 | icici-lombard-cpm-marine-fidelity.test.js:14; **passed**, 9,023 ms | Actual fixture exists, 249,202 bytes; SHA-256 fcb4951e778ba8adaef145f56cb9dd3155f455ddcd6ca87cc7260c2b0189f73c. All CPM field assertions execute and pass. | Earlier failure not reproduced. Prior captured failure is a STACK_TRACE_ERROR, not a demonstrated wrong extracted field. Do not train or alter the extractor from that evidence. |
| F17 | lead-generation-separation.test.js:57; implementation absent from alias file | [test-message/route.js:2](<C:/Users/abhis/insuredesk-crm/src/app/api/operations/whatsapp/test-message/route.js:2>) re-exports POST from send. Signature construction remains at [send/route.js:165](<C:/Users/abhis/insuredesk-crm/src/app/api/operations/whatsapp/send/route.js:165>); dispatch at line 239. | P2 wrong source target / brittle assertion. Test alias delegation and actual signed outgoing payload, retaining authenticated sender routing. |
| F18 | modal-layout.test.js:50; zero Tailwind overlay matches | Setup uses [ModalPortal at line 1717](<C:/Users/abhis/insuredesk-crm/src/app/components/operations/WhatsAppSetupPage.js:1717>). [CSS line 1153](<C:/Users/abhis/insuredesk-crm/src/app/components/operations/WhatsAppSetupPage.module.css:1153>) has fixed inset 0, z-index 10050, flex centering and blur(7px). [ModalPortal.js:7](<C:/Users/abhis/insuredesk-crm/src/app/components/shared/ModalPortal.js:7>) targets document.body. | P2 test recognizes only the former Tailwind representation. Check DOM portal parent/computed layout/viewport coverage; do not replace valid CSS solely to satisfy its regex. No new visual browser run in Phase 1. |
| F19 | monthly-attendance.test.js:9; blocked real database read | Tests import actual calculator with no Prisma/finalization mocks. [monthly-attendance.js:28](<C:/Users/abhis/insuredesk-crm/src/lib/presence/monthly-attendance.js:28>) calls finalization; line 128 reads users. Safe probe returns 11 September–10 October, Sundays 13,20,27,4. | P2 unsafe environment dependency plus payroll/calendar mismatch. Test expects calendar September Sundays 6,13,20,27. Confirm payroll requirement; isolate persistence before rerunning normally. |
| F20 | performance-optimization.test.js:66; missing listener cleanup string | [WorkCenterPage.js:30](<C:/Users/abhis/insuredesk-crm/src/app/components/operations/WorkCenterPage.js:30>) loads on mount. There is no visibility listener or polling timer there to remove. | P2 obsolete structural assertion. No polling leak demonstrated. Evaluate request lifetime separately with a mount/unmount test; do not add unused listeners just to satisfy the test. |
| F21 | performance-optimization.test.js:80; no dynamic picker import | Static imports at [renewal customers/page.js:25](<C:/Users/abhis/insuredesk-crm/src/app/(dashboard)/dashboard/renewals/customers/page.js:25>) and [customers/id/page.js:37](<C:/Users/abhis/insuredesk-crm/src/app/(dashboard)/dashboard/renewals/customers/[id]/page.js:37>). | P2 actual eager-loading gap. Measure initial bundle/navigation before considering existing Next dynamic import. No production server-load reduction established. |
| F22 | performance-optimization.test.js:113; multiline dynamic expression mismatch | [client/portal/page.js:31](<C:/Users/abhis/insuredesk-crm/src/app/client/portal/page.js:31>) already dynamically imports the component. The source uses CRLF, assertion uses LF. Normalizing CRLF to LF makes this exact check true. | P2 newline-sensitive assertion. Retain deferred loading and startup cancellation checks; do not rewrite working code for line endings. |
| F23 | reporting-query-plan.test.js:104; five categories versus expected four | [business-intelligence.js:162](<C:/Users/abhis/insuredesk-crm/src/app/lib/reporting/business-intelligence.js:162>) adds Non-Motor Policy. The preceding three-query, month-range and tenant/filter assertions pass before the option list mismatch. | P2 report-option contract drift. Verify Non-Motor classification/filtering is intended and distinct from Other; preserve existing reports and category-specific extraction. |
| F24 | warehouse-record-columns.test.js:39; whatsappGroupName absent | [dashboard.js:175](<C:/Users/abhis/insuredesk-crm/src/app/ui/dashboard.js:175>) defines a condensed warehouse column set; several older fields required by the test are absent. | P2 unresolved visible-column contract. Confirm which fields staff need and whether they remain in detail/export views. No parser/data deletion demonstrated; do not alter Motor or extraction schemas. |

**Additional current failure E01:** monthly-attendance.test.js:49, SUPER_ADMIN inclusion/todayPunchIn. Protected individual run fails at the same unmocked prisma.user.findMany, not at the SUPER_ADMIN assertion. The isolated attendance probe confirms SUPER_ADMIN can appear with mocked persistence, but it does not validate live September attendance. Evidence: E01.json/E01.log and attendance-probe.json.

### Proposed test corrections, impacts and verification

These are proposals, not applied changes:

| Scoped proposal | Why / what would change | Dependencies and regression risk | Verification / rollback |
|---|---|---|---|
| F01–F02 denial assertions | Assert shared 403 contract and zero downstream send/enqueue, avoiding a specific obsolete string. | Birthday role guard and shared WhatsApp access policy; retain denial coverage. | Run both plus allowed-role/tenant cases. Revert only the test change if it loses meaningful coverage. |
| F03 aggregate fixture | Supply the called raw aggregate method/results; retain lightweight rows, pagination and tenant assertions. | SQL alias/counter types; a fabricated fixture alone cannot certify real SQL. | Run original assertions and a later isolated staging aggregate check. Revert fixture correction independently. |
| F04 stored credential fixture | Supply synthetic hashed MPIN, credential version and necessary persistence mocks. | Client credential locks, lockout and Google linking. Must not bypass verification. | Existing assertions plus incorrect/locked MPIN cases. Revert test-only commit. |
| F05/F07/F09 missing dependencies | Complete model methods/partial neutral exports and reset scenario implementations. | Client account locks, canonical fields, duplicate checks. Do not mock away the feature under test. | Original assertions must pass, including tenant refusal and legacy link preservation; combined run must equal isolated results. |
| F06/F13/F14/F23/F24 contract reconciliation | Establish shared-phone rules, renewal metric definitions, navigation filters, Non-Motor options and warehouse visible fields. | Business users, reporting, exports and destination pages. Incorrect “test correction” could hide missing behavior. | Approve explicit input/output examples first; add behavior tests retaining the intended safety invariant; revert one scoped change if rejected. |
| F10/F11/F12/F15/F17/F18/F20/F22 brittle source checks | Make checks representation-independent while retaining substantive aggregate, routing, signature, modal and cleanup requirements. | UI labels, CSS modules, route aliases, formatting. Do not broadly replace failing tests with looser substring checks. | Render/call-based checks for the behavior; full suite after individual changes; revert tests if they allow the former fault. |
| F19/E01 attendance isolation | Fake user/presence data and finalization; assert the confirmed payroll date range deterministically. | Payroll policy, timezone, today punch and attendance writes. Production calculator stays untouched unless separately proven wrong. | Zero real DB calls; fixed-clock payroll boundary and SUPER_ADMIN checks. Revert fixtures only. |
| F16 | No extractor change proposed. | Existing local PDF dependency and runtime variability. | Retain actual fixture and field assertions; repeat only if failure recurs, preserving its full stack. |
| F21 | Consider lazy import only after bundle evidence confirms useful savings. | First-open recipient picker, group loading and disabled/loading states. | Compare initial chunk size and first picker open; no server-load claim without measurements. Roll back import change only. |

## 4. Authentication database-error fallback and callers

### Reproduction and root cause

[auth/index.js:51](<C:/Users/abhis/insuredesk-crm/src/lib/auth/index.js:51>) verifies the JWT signature and calls refreshUserClaims. Fresh user validation reads role, organization, deletion status and assigned LOBs at line 77. Missing/deleted user returns null at line 90. **Any lookup exception instead returns the original token payload at lines 104–105.**

[auth/session.js:10](<C:/Users/abhis/insuredesk-crm/src/lib/auth/session.js:10>) treats that payload as a valid session. [rbac.js:91](<C:/Users/abhis/insuredesk-crm/src/lib/auth/rbac.js:91>) provides privileged tenant-filter behavior for SUPER_ADMIN; a stale token can therefore change downstream scope decisions.

Observed probes:

| Probe | Setup | Result |
|---|---|---|
| A1 | Valid synthetic SUPER_ADMIN/old-org token; fresh user lookup rejects | requireSession returns accepted SUPER_ADMIN/old-org session |
| A2 | Token says SUPER_ADMIN; successful fresh lookup says MANAGER; expire validated cache; fail next lookup | Next verification returns SUPER_ADMIN from the old token |
| A3 | Successful lookup finds deleted user | Session rejected as expected |

Existing validated-claims cache defaults to 15 seconds at auth/index.js:13. That bounded cache is a separate revocation-latency policy; it should not be removed without measuring extra database reads. Token defaults at line 39 are 24 hours for staff and 365 days for clients.

This requires an already-valid signed token. It is not an unsigned-token bypass. If every database operation is unavailable, many downstream actions also fail; A1/A2 prove the authorization decision, not a successful live protected mutation. The dangerous case is required user validation failing while a subsequent operation can proceed.

### Caller scope

A static inventory found 154 import/definition/call matches; the filtered invocation inventory contains 86 lines, including shared guards and user-management helpers. Full exact file:line lists are preserved in [auth-callers.txt](<C:/Users/abhis/insuredesk-crm/scratch/phase1-evidence/auth-callers.txt>) and [auth-call-sites.txt](<C:/Users/abhis/insuredesk-crm/scratch/phase1-evidence/auth-call-sites.txt>). This inventory is textual, not a claim that all 86 sites independently permit unauthorized writes.

| Caller family | Existing dependency / assessed impact |
|---|---|
| Direct verifyJWT users | Policies/uploads, client accounts/requests, dashboard/header/report reads, endorsements, claims guard, renewals, presence and other CRM handlers use refreshed role/organization claims. A temporary-error contract can affect reads, writes and SSR navigation. Examples: policy-records/route.js:6; claims/utils.js:9; dashboard/overview/route.js:107; records/scoped-data.js:270. |
| Shared requireSession consumers | Work Center and WhatsApp access guards accept the fallback session. Examples: work-center/route.js:11; account-access.js:8. |
| WhatsApp sender resolution | [account-access.js:27](<C:/Users/abhis/insuredesk-crm/src/lib/whatsapp/account-access.js:27>) additionally reads active staff and account authorization before sending. This mitigates some stale-session paths; it does not make every surrounding management operation safe by itself. |
| User-management helpers | [auth/middleware.ts:61](<C:/Users/abhis/insuredesk-crm/src/lib/auth/middleware.ts:61>) rereads the user and uses its current role. A failed DB lookup does not simply reuse JWT role for these helpers; failure handling can still produce 500 rather than controlled unavailability. |
| Client portal | [client-portal/session.js:20](<C:/Users/abhis/insuredesk-crm/src/lib/client-portal/session.js:20>) separately verifies active customer and credential version. CLIENT tokens use customerId and can lack userId; the no-userId path at auth/index.js:61 is therefore not automatically removable. |
| Edge middleware | [middleware.ts:56](<C:/Users/abhis/insuredesk-crm/src/middleware.ts:56>) checks signature/token role for routing without a DB lookup. Backend authorization must remain authoritative; do not introduce DB work into every edge request. |
| Browser/SSR handling | Existing 401 handling can clear sessions or redirect. A DB outage must not be mislabeled as expired credentials. Review these consumers before choosing the temporary failure representation. |

**Expected behavior:** unavailable required staff validation must prevent protected work, while retaining the valid cookie and allowing recovery when validation becomes available. Deleted/invalid credentials remain denied.

**Minimal proposed change:** a distinct temporary-validation failure from the existing shared auth function, propagated only where necessary. Preserve cache policy, token durations, cookie settings, client credential validation and public routing initially. Note that verifyJWT currently returns the refresh promise without awaiting it inside its try block; a new thrown error must have an explicitly tested propagation contract.

**Regressions/dependencies:** staff/client login, APIs, server-rendered pages, deletion/demotion, organization changes, LOB scope and browser retry behavior. A blanket return-null change could incorrectly log everyone out during a database interruption.

**Verification:** A1/A2 must no longer authorize any protected operation; fresh/cached allowed users, invalid/deleted users, client tokens, demotion/tenant changes and recovery must work. Spy on protected mutations and verify zero calls under unavailable required validation. Verify no retry storm or cache-read increase beyond the reviewed design.

**Rollback:** revert the reviewed auth change independently. Because reverting would restore a demonstrated security risk, restrict affected protected actions during rollback rather than silently treating the old fallback as safe.

## 5. WhatsApp retry, acknowledgement and crash windows

### Actual current routing and callers

The enqueue path stamps the resolved account and initiating user at [queue-manager.js:44](<C:/Users/abhis/insuredesk-crm/src/lib/whatsapp/queue-manager.js:44>). The worker retains that account and revalidates revoked staff/account permissions at lines 136–145. A retry must preserve that sender and initiating user; it must not pick the user's newer primary or a global sender.

The individual retry handler is [queue/route.js:48](<C:/Users/abhis/insuredesk-crm/src/app/api/operations/whatsapp/queue/route.js:48>). Organization and employee/admin checks exist at lines 89–98. The media-replay guard exists at line 100. **The final update at lines 106–116 filters only by ID, with no eligible-status condition.** Retry-all is narrower: FAILED/RETRYING at line 68.

The visible retry button is already restricted to FAILED/RETRYING at [WhatsAppSetupPage.js:1668](<C:/Users/abhis/insuredesk-crm/src/app/components/operations/WhatsAppSetupPage.js:1668>). Its POST caller is line 710. Backend eligibility is still required: a stale UI, direct authenticated request or state change between check and write can bypass UI assumptions.

Worker callers:

- [cron/whatsapp-worker/route.js:67](<C:/Users/abhis/insuredesk-crm/src/app/api/cron/whatsapp-worker/route.js:67>), batch 5.
- [cron/followup-notifications/route.js:45](<C:/Users/abhis/insuredesk-crm/src/app/api/cron/followup-notifications/route.js:45>), batch 5.
- [run-automations/route.js:32](<C:/Users/abhis/insuredesk-crm/src/app/api/operations/whatsapp/run-automations/route.js:32>), caller-selected bounded batch.
- [birthday send-all/route.js:31](<C:/Users/abhis/insuredesk-crm/src/app/api/operations/birthday-management/send-all/route.js:31>), unawaited background batch up to 100.
- Direct audited sending uses [dispatch.js:5](<C:/Users/abhis/insuredesk-crm/src/lib/whatsapp/dispatch.js:5>), called by the shared send handler and [welcome-message.js:172](<C:/Users/abhis/insuredesk-crm/src/lib/policies/welcome-message.js:172>).

Affected workflows include manual/test messages, user-triggered CRM document/text sends and policy welcome messages, plus queued birthdays, renewal/follow-up notifications and internal/system messages. Actual production queue composition was not read or changed.

### Reproduced state failures

| Probe | Current observed result | Required behavior |
|---|---|---|
| Q1: SENT → individual retry | HTTP 200, PENDING, one additional mocked gateway send | Refuse replay through retry; deliberate new-message sending is a separate action |
| Q2: live SENDING → retry while worker awaits gateway | HTTP 200; second worker claims; two mocked sends of the same row | Refuse resetting an active claim; atomic eligibility at the database write |
| Q3: old SENDING → normal batch | processedCount 0; remains SENDING; no send | Detect and review abandoned/uncertain claims without assuming they are safe to resend |
| Q4: gateway ack → failed SENT write | RETRYING, missing first message reference, second mocked send on next batch | Separate acknowledged delivery bookkeeping failure from an eligible send failure |

Raw observations: [auth-queue-probes.json](<C:/Users/abhis/insuredesk-crm/scratch/phase1-evidence/auth-queue-probes.json>). Probe implementation: [auth-queue.spec.js](<C:/Users/abhis/insuredesk-crm/scratch/phase1-probes/auth-queue.spec.js>).

The worker's atomic claim at queue-manager.js:121 protects concurrent workers only while the row stays SENDING. The unrestricted retry resets that protection. At line 177, the SENT write is inside the same try block as gateway sending. Catch at line 189 converts either error into RETRYING/FAILED at lines 194–200. The direct dispatch helper has the same combined boundary at dispatch.js:24–34, marking a successful-send bookkeeping failure as FAILED; its duplicate consequence follows from manual retry, while the actual Q4 repeat probe exercises the queue worker.

### What the gateway acknowledgement means

[whatsapp-gateway/baileys-manager.js:566](<C:/Users/abhis/insuredesk-crm/whatsapp-gateway/baileys-manager.js:566>) awaits sock.sendMessage and returns its message key; the media path does the same at line 633. [server.js:254](<C:/Users/abhis/insuredesk-crm/whatsapp-gateway/server.js:254>) returns that result to the CRM.

This acknowledgement is a returned gateway/WhatsApp message reference. It is **not demonstrated recipient delivery/read confirmation**. The inspected code has no outbound delivery-receipt reconciliation or request-idempotency protocol that makes a lost response safe to replay. The messages.upsert handler at manager line 279 tracks received group-message activity, not a durable outgoing request ledger.

The queue uniqueKey prevents duplicate row creation at queue-manager.js:67. It does not stop the same row being dispatched repeatedly.

### Crash and uncertainty classification

| Window | Persisted state / known outcome | Safe response |
|---|---|---|
| After atomic claim, before gateway call | SENDING; process may have died before send, but state alone does not prove this | Investigate claim age and worker execution; do not replay solely by age |
| During gateway call | SENDING; result can be unknown | Hold for reconciliation; a client timeout is not proof of non-delivery |
| Gateway accepted, HTTP response lost | SENDING or later retry state; accepted message may exist | Avoid blind automatic resend |
| Ack returned, SENT write fails | Current code makes RETRYING/FAILED; repeat reproduced in Q4 | Preserve/quarantine acknowledged or uncertain outcome; separate bookkeeping recovery |
| SENT write succeeds, worker terminates | SENT | No retry |
| Unawaited birthday batch outlives response | Lifetime is not guaranteed by this function itself | Confirm actual host lifecycle before choosing the smallest durable execution fix |

The normal selection at queue-manager.js:98 considers only PENDING/RETRYING; no abandoned-SENDING recovery path was found. The existing schema has updatedAt and a string status at [schema.prisma:1113](<C:/Users/abhis/insuredesk-crm/prisma/schema.prisma:1113>), but no explicit worker lease token. A timestamp alone is insufficient evidence that an in-flight worker is dead.

[whatsapp-client.js:61](<C:/Users/abhis/insuredesk-crm/src/lib/whatsapp/whatsapp-client.js:61>) fetches without an explicit application AbortSignal/deadline. Production pacing is 8–12 seconds between sends at queue-manager.js:208. Four delays in a successful batch of five add roughly 32–48 seconds before gateway/database time. No production timeout or crash was induced, so these are observed crash-window dependencies, not measured current outages. Do not remove pacing to make the request finish faster.

### Minimal proposed changes and safeguards

1. **Individual retry guard:** keep prelookup authorization/media validation; make the existing update atomically conditional on ID, organization, initiating-user/admin scope and status FAILED/RETRYING. Return 409 when no eligible row remains. Preserve response shape, stamped sender and audit metadata. Generated Prisma 6.19.3 WhatsAppMessageQueueWhereUniqueInput includes these filters with a unique ID; no schema migration or extra polling process is required.
2. **Acknowledgement/error separation:** keep gateway result handling outside the generic send-failure transition. On an acknowledged send with a failed ledger write, do not set an automatically resendable status. Define controlled bookkeeping recovery, retaining acknowledgement when persistence is available. Do not blindly retry the gateway call. Apply to worker and direct dispatcher after reviewing shared callers.
3. **Uncertain failures/recovery:** establish a reviewed outcome model and reconciliation path before retrying lost-response or abandoned claims. Do not automatically reset all old SENDING rows. Start with bounded read-only detection and operator review; durable lease/idempotency additions require separate design/approval if existing fields cannot prove safe ownership.
4. **Execution lifetime:** verify the scheduler/hosting contract and background batch path before selecting a durable execution mechanism. Reuse the existing worker instead of introducing a duplicate worker process. Any deadline must classify delivery-unknown separately, not automatically retry it.

**Regressions/dependencies:** legitimate failed retries, concurrent retry-all/manual retry, deleted/revoked users, system sender authorization, attachment availability, hourly pacing, original sender retention, direct welcome-message error reporting, and message-status UI.

**Verification:** SENT/SENDING/PENDING refusals; FAILED/RETRYING success; status change between lookup/write; simultaneous workers/retries; other employee/organization denial; missing media denial; original account retained after primary change. For Q4, assert one gateway call even when the SENT write fails; test unknown transport outcome separately. Later staged crash-window tests must use synthetic data and a fake gateway, not real customer recipients.

**Rollback:** revert only the specific route/worker/dispatcher change. Do not rewrite statuses or replay existing messages as part of rollback. If restoring the unsafe retry path would create replay exposure, disable that action until a corrected release is available. Reconciliation of existing uncertain rows is a separately approved data operation.

The first retry guard is deliberately bounded: it prevents Q1/Q2, **but does not by itself prevent Q4**, because existing acknowledged failures can already be labeled FAILED/RETRYING. That limitation must remain visible until the acknowledgement work is verified.

## 6. Attached Client ID request detachment

The original F08 stops at an incomplete second-read mock, masking the actual workflow decision.

A separate observational probe uses:
- authenticated synthetic AGENT in the same organization;
- existing policy attached to an OPEN CLIENT_ID_REQUEST;
- a valid selected client in that organization;
- completed policy reread/canonical-field mocks;
- a request lookup mock that would return the OPEN task if called.

Result: **HTTP 200, saved clientIdRequestId null, valid selected Client ID, zero task lookups.** Evidence: [client-request-detachment-probe.json](<C:/Users/abhis/insuredesk-crm/scratch/phase1-evidence/client-request-detachment-probe.json>), corresponding log, and [request-detachment.spec.js](<C:/Users/abhis/insuredesk-crm/scratch/phase1-probes/request-detachment.spec.js>).

Root cause:
- [policy-records/id/route.js:108](<C:/Users/abhis/insuredesk-crm/src/app/api/policy-records/[id]/route.js:108>) recognizes an existing attached request.
- With a directly selected Client ID, lines 132–139 skip the request verification branch.
- [line 318](<C:/Users/abhis/insuredesk-crm/src/app/api/policy-records/[id]/route.js:318>) clears clientIdRequestId and persists the link.
- The request-lock/check path at lines 347 onward applies only to the no-direct-client path.

Current behavior validates the selected client/tenant but bypasses resolution of the attached active request. Expected behavior, according to the untouched existing authorization test, is 409 until the request is resolved through the approved workflow. This does not demonstrate an out-of-organization link; it demonstrates a workflow-integrity bypass.

**Minimal proposed change:** after confirming the existing business invariant, inspect and revalidate an attached active request under the existing request-lock mechanism before direct linking. Keep the policy concurrency check and active-client/tenant validation. Reuse existing lock helpers; do not add a new client database or touch PDF extraction.

**Potential impact:** agent correction/save, manager resolution, completed versus OPEN requests, historical links, request attachment counts and transaction lock order.

**Verification:** complete F08 fixtures without removing its 409 assertion; OPEN/IN_PROGRESS/WAITING_DOCUMENTS cannot be detached; correctly completed/resolved requests remain usable; same-tenant active direct links without an attached request succeed; concurrency and legacy-reference tests continue to pass.

**Rollback:** revert that handler change independently; preserve existing policy/task data. No automatic repair of previously detached records without a separate read-only audit and explicit data-change approval.

## 7. Actual infrastructure findings

### Login protection

**Application source confirmed:**
- [staff login/route.js:7](<C:/Users/abhis/insuredesk-crm/src/app/api/auth/login/route.js:7>) looks up the user and compares bcrypt password; failed attempts are audited at line 36. No application attempt limit/lockout was found on this staff path.
- [middleware.ts:98](<C:/Users/abhis/insuredesk-crm/src/middleware.ts:98>) classifies authentication APIs as accessible before staff login. A hidden staff page does not rate-limit its API.
- Client MPIN protection already exists: [credentials.js:6](<C:/Users/abhis/insuredesk-crm/src/lib/client-portal/credentials.js:6>) defines five failed attempts and a 15-minute lockout; lines 50–53 store locking metadata; line 175 checks it. **Do not replace or claim absence of this working protection.**
- Gateway [auth-middleware.js:12](<C:/Users/abhis/insuredesk-crm/whatsapp-gateway/auth-middleware.js:12>) fails closed without a configured key and uses timing-safe comparison at line 44; server.js:62 applies it after health routes.

**Provider configuration confirmed through authenticated GET APIs:**
- Vercel project: insuredesk-crm; production is READY at the baseline SHA; Hobby plan.
- ssoProtection.deploymentType is all_except_custom_domains. This does not place the custom public domain behind Vercel SSO.
- Custom firewall configuration endpoint returned active null, draft null, versions empty. No configured project custom login rule was found.
- The CLI firewall overview request returned a plan/402 limitation. That error alone was not treated as evidence that all firewall protection is absent.
- Built-in platform protection, any external proxy/WAF and organization-level rules were not exhaustively verified. No attack was attempted.

**Read-only runtime check at 2026-10-09T10:11:06Z:**
- Endpoint configured in local .env: gateway-production-3747.up.railway.app.
- GET /health without authentication: 200, success true, 605 ms, uptime about 3,294 seconds.
- GET /sessions without API key: 401 Unauthorized: Missing API key, 428 ms.
- These calls did not request a QR, connect/disconnect a session, send a message or restart a process.
- The local configured hostname was not independently matched to the failed Railway service/deployment ID. Healthy gateway response does not establish which release is running or whether every connection is healthy.

Evidence: [gateway-readonly-health.json](<C:/Users/abhis/insuredesk-crm/scratch/phase1-evidence/gateway-readonly-health.json>), [vercel-project.sanitized.json](<C:/Users/abhis/insuredesk-crm/scratch/phase1-evidence/vercel-project.sanitized.json>), vercel-firewall-versions.json and associated error files. Secret values are omitted.

**Minimal future protection change:** choose a bounded staff-login attempt policy using existing infrastructure only after resolving shared-IP, account enumeration, legitimate staff lockout and multi-instance behavior. An in-memory per-process map alone is not demonstrated distributed protection. Apply only to staff authentication; preserve client MPIN controls.

**Verification/rollback:** synthetic account/IP attempts in an isolated environment; allowed recovery, generic denial, distributed consistency and no attendance success writes on failed attempts. Roll back only the limiter rule/configuration; retain temporary restricted access if protection is required during rollback.

### Backups and recovery

Observed Windows task:
- BimaHeadquarter Nightly Backup, enabled and READY.
- Last run: 9 October 2026, 10:06:29 IST.
- LastTaskResult: 2147946720 = 0x800710E0.
- Native Win32 low word 4320 resolves to “The operator or administrator has refused the request.”
- Next configured run: 23:59 IST.
- LogonType Interactive; StartWhenAvailable false; executable powershell.exe; script scripts/backup-database.ps1; working directory empty.
- Task Scheduler Operational event log is disabled. No detailed task event trail was available; it was not enabled.

Observed C:\BimaBackups dumps:
- 17 June, 18,012,966 bytes.
- 18 June, 18,085,654 bytes.
- 23 June, 24,544,733 bytes; newest local file, approximately 108 days before this investigation.
- June 18/23 logs contain successful completion markers; no newer local dump/log was found.

[backup-database.ps1:67](<C:/Users/abhis/insuredesk-crm/scripts/backup-database.ps1:67>) requires DATABASE_URL, validates the target host, locates pg_dump at line 111, checks its exit status at line 158 and verifies the output. Retention pruning occurs after success at line 183. The script's guards should be preserved.

**Confirmed failure:** the configured local automation did not report success on its latest attempt, and the observed local backup inventory is stale. The exact policy/operator reason for the refusal is not available from this status alone. Interactive logon and missed-run behavior are observed fragility, not proven explanations of that particular refusal.

**Unverified:** Neon/provider PITR retention, provider snapshots, off-device copies, encryption/access controls, restore success, document storage backup and gateway-session-volume backup. No provider management credentials/connector were available for Neon. A DATABASE_URL is not evidence of a backup policy. No restore or pg_dump was executed in Phase 1.

Evidence: backup-scheduled-tasks.json, backup-task-configuration.json, backup-file-metadata.json, backup-log-summary.json in scratch/phase1-evidence.

**Minimal proposed action:** first inspect task trigger/security/environment behavior and provider backup settings; correct only the demonstrated scheduling/configuration failure. Do not rewrite the guarded dump script unless its execution proves a script defect. Establish separately approved isolated restore verification, including database relationships and recovery requirements for stored PDFs/session credentials.

**Verification:** approved controlled scheduled run produces a current verified dump, native exit 0 and a matching log; isolated restore into a disposable target proves readable application data and required relationships. Record actual achievable RPO/RTO rather than assuming them.

**Rollback:** export task configuration before changes; restore that configuration if needed, keeping existing dumps. Do not prune/delete backups or overwrite production with a restore test.

### Release gates and deployment health

Authenticated GitHub metadata:
- main points to the baseline SHA; protected false.
- Required status checks enforcement is off; contexts/checks empty.
- Repository rulesets response is empty.
- Actions run listing returned total_count 0.
- Current commit check-runs returned total_count 0.
- Branch protection-detail request returned integration permission 403; it was not used as evidence of absent settings. The accessible branch/ruleset responses are the actual evidence.
- Current commit combined status is failure: Vercel success at 07:48:45Z; Railway context “joyful-magic - insuredesk-crm” failed at 07:49:08Z.

Vercel project/deployment checks APIs both returned empty checks. Build/install overrides are null; package build is next build with no test invocation. There is no local .github workflow directory. These facts show no observed enforced regression-test gate, rather than guaranteeing that every possible external release process is absent.

Production links: [current Vercel deployment](https://vercel.com/insuredeskbhopals-projects/insuredesk-crm/Bzby49x4spNQFDejvEussQxwcAhf); [failed Railway deployment](https://railway.com/project/2f503cd5-4c62-4dad-98a5-7bd0ae80dad4/service/64fbca7c-ced9-41b1-aa03-99c9077959ac?id=0d87fecd-831a-436b-a6fa-9173d2dfb662&environmentId=c4b373ac-235e-4dc4-94e5-322861919f84).

**Railway limitation:** build/runtime logs, configured source/root directory, last healthy deployment, restart policy and persistent session volume were not accessible through available authenticated tools. The failure cause and relation to the healthy configured gateway remain unresolved. Do not restart/redeploy to “see if it helps.”

**Minimal proposed actions:** obtain failed deployment logs read-only; establish the running release identity; then correct its specific failure. Separately establish a reproducible isolated test environment and an enforceable release gate once genuine failures/fixtures are resolved. Avoid running the current unmocked attendance test against production in CI.

**Regression risks:** gating may block legitimate releases until baseline/environment problems are corrected; changing source/root/start command can affect the gateway and its session volume. Never tie a general CRM release to a session-destructive restart.

**Verification/rollback:** demonstrate that a deliberately failing synthetic check blocks promotion and a valid isolated check permits it. Confirm both CRM and gateway release identities before later promotion. Snapshot provider/repository settings; revert only the scoped configuration, never WhatsApp auth/session storage.

Evidence: github-release.json, github-action-runs.json, github-check-runs.json, vercel-checks.json and vercel-deployment-checks.json.

### Scheduling and monitoring

- Vercel crons configuration has definitions [], with a disabledAt timestamp. **No native Vercel cron schedule is currently configured in this project snapshot.**
- External cron/scheduler operation was not verified. The endpoint's presence and CRON_SECRET environment key do not prove that it is regularly called.
- Worker production authorization requires CRON_SECRET at [whatsapp-worker/route.js:21](<C:/Users/abhis/insuredesk-crm/src/app/api/cron/whatsapp-worker/route.js:21>).
- SpeedInsights component exists at [layout.js:134](<C:/Users/abhis/insuredesk-crm/src/app/layout.js:134>); provider configuration reports historical data and disabledAt 1789516800000.
- Web Analytics is configured, but no backend alert policy/delivery evidence was available.
- Gateway health and protected metrics endpoints exist at server.js:57/65; route existence does not prove continuous external monitoring.
- No configured Sentry/OpenTelemetry/Datadog dependency was found in package.json. This does not rule out external monitoring.
- Queue backlog/claim-age alerts, failed release alerts, backup age alerts, restore drills, memory/CPU/DB-pressure thresholds and successful alert delivery remain unverified.

**Minimal proposed action:** verify existing scheduler and external alert configuration before adding anything. Use bounded aggregate checks, low-frequency health checks and no message/media content in telemetry. Do not increase per-user polling to implement server monitoring.

**Verification/rollback:** approved synthetic stale-claim/failed-backup condition produces one deduplicated alert and clears correctly; measure query/request overhead and verify no customer/session data leakage. Restore previous monitor/scheduler settings independently if a change increases load or causes duplicate execution.

### Infrastructure reproduction commands

Provider commands used only GET/read operations; do not paste secret environment values into output:

~~~powershell
vercel whoami
vercel api /v9/projects/insuredesk-crm --method GET --raw
vercel api "/v1/security/firewall/config?projectId=prj_pLJcP9esCoFvmbuZpQj5A0ZAcx62&teamId=team_fA17v7fk2PLDBJmDZNmeRz3o" --method GET --raw
vercel api "/v2/projects/prj_pLJcP9esCoFvmbuZpQj5A0ZAcx62/checks?teamId=team_fA17v7fk2PLDBJmDZNmeRz3o" --method GET --raw
vercel api "/v1/deployments/dpl_Bzby49x4spNQFDejvEussQxwcAhf/checks?teamId=team_fA17v7fk2PLDBJmDZNmeRz3o" --method GET --raw

Get-ScheduledTask -TaskName 'BimaHeadquarter Nightly Backup'
Get-ScheduledTaskInfo -TaskName 'BimaHeadquarter Nightly Backup'
Get-WinEvent -ListLog Microsoft-Windows-TaskScheduler/Operational
Get-ChildItem -LiteralPath C:\BimaBackups -Filter '*.sql' |
  Select-Object Name,Length,LastWriteTime

# Read-only health and unauthenticated refusal; never sends or changes sessions:
node scratch/phase1-gateway-health.cjs
~~~

GitHub connector GET resources:
- /repos/insuredeskbhopal/insuredesk-crm/branches/main
- /repos/insuredeskbhopal/insuredesk-crm/rulesets
- /repos/insuredeskbhopal/insuredesk-crm/commits/4e036db2e7ff14b9a2c54d04c9c3d6512fd34dae/status
- Same commit /check-runs
- /repos/insuredeskbhopal/insuredesk-crm/actions/runs?per_page=5

Vercel API interpretation uses its [official REST API documentation](https://vercel.com/docs/rest-api) and [Firewall API documentation](https://vercel.com/docs/vercel-firewall/firewall-api). The actual findings above come from the captured authenticated responses, not generic hosting assumptions.

## 8. Verification commands for observational probes

The checked-in test suite was not modified. Scratch probes require their separate configuration and explicit selection because diagnostic copies intentionally preserve failing assertions:

~~~powershell
# Run this block in a disposable PowerShell process; close it afterward.
# These synthetic environment values must not be reused for normal CRM startup.
$env:NODE_OPTIONS='--require=C:/Users/abhis/insuredesk-crm/scratch/phase1-network-guard.cjs'
$env:DATABASE_URL='postgresql://phase1_invalid:phase1_invalid@127.0.0.1:1/phase1_invalid'
$env:JWT_SECRET='phase1-investigation-synthetic-jwt-secret'

node node_modules/vitest/vitest.mjs run --config scratch/phase1-probes.config.mjs scratch/phase1-probes/auth-queue.spec.js --reporter=json --outputFile=scratch/phase1-evidence/probes-tests.json
node node_modules/vitest/vitest.mjs run --config scratch/phase1-probes.config.mjs scratch/phase1-probes/attendance.spec.js
node node_modules/vitest/vitest.mjs run --config scratch/phase1-probes.config.mjs scratch/phase1-probes/request-detachment.spec.js -t 'Phase 1 observes'
~~~

The last test passing means the unsafe current detachment was observed; it does not mean the workflow is correct. Same distinction applies to the queue/auth observational assertions.

Scratch evidence and harnesses are ignored local artifacts. The single durable deliverable added for Phase 1 is this report. Do not push scratch logs, production environment data, credentials, customer documents or session files. Existing test fixture metadata is recorded only to establish that the CPM pass was not an early return caused by a missing file.

## 9. Exact recommended implementation order — individually approved work only

All items below are **unimplemented proposals**. Approval of this investigation does not authorize any item automatically.

| Order | Individual change / prerequisite | Reason for order and acceptance condition |
|---|---|---|
| 1 | Atomic FAILED/RETRYING eligibility on individual queue retry, scoped to its existing route and focused regression tests | Smallest reproduced data-integrity fix; prevents Q1/Q2 without migrations, new processes, additional normal-path queries or session changes. Must preserve authorized failed retries and original sender. |
| 2 | Separate acknowledgement/bookkeeping errors in worker and direct dispatcher | Q4 remains possible after item 1. Prove one gateway call after an acknowledged send even when persistence fails; classify unknown delivery explicitly. |
| 3 | Fail closed on unavailable required staff validation with a caller-compatible temporary-error contract | Reproduced stale-privilege acceptance. Requires reviewed API/SSR/client handling; preserve bounded cache and client credential behavior. |
| 4 | Fix attached OPEN Client ID request detachment after confirming the invariant | Existing authorization test plus complete probe demonstrate the bypass. Preserve locking/concurrency and resolved-request flows. |
| 5 | Diagnose failed Railway release and local backup task using provider/task logs; then separately approve exact configuration corrections | Observed operational failures; no speculative restarts. Verify running identity, persistent sessions, current backups and isolated recovery. Read-only follow-up can proceed before code items if access is supplied. |
| 6 | Verify/configure staff-login attempt protection and external scheduler/alerts | Existing client MPIN protection stays intact. Avoid distributed inconsistency, lockout abuse and duplicate worker scheduling. |
| 7 | Add conservative uncertain-claim detection/reconciliation and verify durable execution lifecycle | Depends on acknowledgement/outcome contract and actual scheduler/host limits. No automatic age-based resend. Approve any necessary lease/schema design separately. |
| 8 | Correct incomplete fixtures and formatting/alias assertions while retaining all substantive safety checks; resolve explicit business/UI contracts | F08 must not be weakened. F06/F13/F14/F23/F24 need approved behavior examples. Attendance tests must be isolated before CI use. F16 needs no parser change. |
| 9 | Enforce release checks on the verified isolated suite, then establish a controlled staging smoke/rollback gate | Gate must include relevant dependencies and fail closed on a red baseline. Do not deploy this dirty worktree automatically. |
| 10 | Measure and address remaining P2 bundle/UI/performance issues | F21 is a verified eager import, not measured server overload. Use before/after metrics; leave working PDF/reporting logic intact. |

This order starts with a narrowly scoped confirmed replay defect because it can be contained without altering global authentication or WhatsApp session lifecycle. Items 2–4 remain P1 and should not be deferred merely because item 1 passes.

Earlier screenshots of missing account_id, QR behavior and removeChild errors are not certified resolved by this Phase 1. No production schema inspection, QR linking action or controlled reproduction of that DOM error was performed in this scope. They must not be included in a success claim.

## 10. Stop boundary and first approval request

Phase 1 stops at this report. No source authorization logic, production function, schema, existing test, configuration, connected session or customer data was changed. No live messages, gateway restart, migration, deployment or push occurred. Test subprocesses terminated normally; the existing development server was not restarted.

The boundary verification compares all 1,143 entry files against their SHA-256 hashes. Its observed result before adding this report was: **zero changed or missing entry files; HEAD unchanged**. A final verification is recorded in phase1-evidence/final-boundary.json.

**First change proposed for approval:** modify only the individual retry eligibility/error handling in src/app/api/operations/whatsapp/queue/route.js, plus focused tests. Preserve existing authorization/media checks and success response; atomically allow only FAILED/RETRYING and return 409 for SENT, SENDING, PENDING or a concurrent state change. Do not alter retry-all, worker routing, sessions, schema or gateway configuration as part of that first change.

The expected normal-path database call count stays unchanged. This first fix has no reason to touch Motor extraction, reporting, PDF ingestion, authentication, UI styling or any connected WhatsApp session. Its limitation is explicit: acknowledged-send failure handling remains a separate approval.

**Approval is required because the user expressly authorized Phase 1 investigation only and prohibited Phases 2–8 implementation until an individual change is approved. No implementation will begin from this report alone.**

