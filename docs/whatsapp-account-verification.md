# WhatsApp account work: change justification and verification

## Investigation
- `User` has signature/contact fields but no sender preference. Preferences currently call the gateway global `set-default` endpoint.
- `send/route.js` accepts `body.accountId` without checking authorization. All manual customer, renewal, claims/lead document actions sharing this endpoint inherit that behavior.
- `queue-manager.js` falls back to gateway status and hardcoded `insuredesk_session`. Queue rows have an account ID but no initiating user ID.
- Policy welcome messages bypass the manual endpoint. Bulk birthdays and manually run automations do not propagate their initiating user.
- CRM birthday/renewal/review/work-center shortcuts open WhatsApp Web; those cannot enforce an authenticated CRM sender.
- Gateway group discovery overwrites a shared cache across sessions, permitting the wrong account's groups to appear.
- Existing accounts have no verifiable linking ownership. Production audit events inspected show message activity, not proof of linking. Owner remains Unknown.

## Necessary modifications
| Change | Actual problem and reason | Exact scope | Impact/risk | Verification |
| --- | --- | --- | --- | --- |
| Add user sender preference, organization system sender, account access records, queue initiating user | Existing schema cannot persist independent selections or authorize shared accounts | Additive Prisma migration; no existing values overwritten | Existing rows retain null preferences and require explicit selection/configuration | Schema validation; inspect production columns; independent user persistence tests |
| Shared backend sender resolver | Browser can choose arbitrary account; global fallback routes through another employee's number | account-access.js; send route; group route; welcome helper; manual automation callers | Sending without a connected authorized selection is blocked with a readable error | Cross-user, cross-organization, missing/disconnected/revoked access tests |
| Keep resolved queue sender plus actor | Delayed sends need stable attribution; legacy null IDs silently use default | queue-manager.js; queue actor column | Legacy ambiguous queued messages fail safely for review; no reassignment | Queue retry and primary-change tests |
| Persistent manual-send audit | Direct sends do not consistently record actor/account/status/reference | dispatch.js reuses existing message queue | Audit row required before dispatch; no new audit database | Text/image/document dispatch and failure tests |
| Separate send access and session management | Selecting a sender must not change ownership or disconnect it | sessions API, existing logout/status routes, setup controls | Owners and organization admins manage sessions; grant recipients only send | Grant recipient denied logout/QR/delete; administrator scope tests |
| CRM sender selector | Users need visible persistent selection and disconnect warning | PrimaryWhatsAppSelector; TopBar; existing setup page | Reads server state on refresh/focus; selection updates only user row | Desktop/mobile UI, refresh/device tests |
| Replace CRM external WhatsApp sending shortcuts | External personal WhatsApp cannot honor CRM sender preference | Existing birthday/renewal/review/work-center actions only; public support links untouched | Actions now use authenticated existing send endpoint | Caller inventory and UI send checks |
| Isolate group cache by account | Refreshing one account overwrites another account's membership cache | group-store, manager, group API/client | Existing cached groups refresh into account scope; session credentials untouched | Two-account same-group and refresh isolation tests |

## QR and performance follow-up
Investigate live account states, gateway connection events, credentials availability, QR refresh lifecycle, and HTTP timings after routing verification. Record measured evidence before any additional change. No live logout/disconnect tests. Use isolated fixtures to simulate disconnects.

## Deployment safety
Migration is additive. No guessed original owners, copied credentials, global sender switch, or session directory deletion. Verify production schema before deploying CRM. Test against fixture gateway responses; live reads only unless temporary test accounts are explicitly required. Do not publish until checks pass.

## QR investigation: demonstrated failure and minimum correction
Live gateway logs contain generated QR events followed by connection-close 408 events. `startConnection` rejects CONNECTING states, while the close handler sets CONNECTING before scheduling that same function: scheduled reconnection becomes a no-op. QR_READY is absent from the duplicate socket guard. Paused sessions cannot resume from the Scan QR flow. Initialization failures can leave CONNECTING permanently.
Changes: keep a distinct RECONNECTING state while waiting; clear the closed socket; reject duplicate QR_READY starts; ignore stale/explicitly stopped socket events; reset failed initialization; add an explicit owner/admin-only connect action used when opening the pairing dialog. No credential files are removed by these changes. Remove the second global group refresh on connection because it repeats discovery against a different account.
Risk: retry/QR lifecycle and deliberate pause/logout behavior. Verification: mocked Baileys sockets plus fake timers test duplicate starts, timeout retry, initialization failure, paused resume, stale events, and QR generation. No live disconnect test.

## Production compatibility: legacy workspace
Live inspection: all active BHQ staff have `organization_id = NULL`; a separate Organization row exists. Existing CRM RBAC deliberately compares nullable organization IDs and legacy records use the null workspace. Assigning users to the Organization row would change their existing record access and is prohibited here.
Required correction: allow null organization scope in WhatsApp account records, manual-send queue audits, authorization predicates and gateway ownership metadata. Store an explicitly administrator-authorized legacy system sender flag on the account; non-null organizations retain their explicit configured sender. No user organization, CRM record, ownership or existing preference value is rewritten. Tests must include legacy-null and foreign-organization isolation. Additive schema plus nullability relaxation affects only WhatsApp records.

## Measured page request duplication
A browser fixture using the real setup page and both real primary selectors, with 350 ms account API latency, issued 3 initial `sessions` requests. Each invokes gateway account/metrics reads plus permission/user database queries. The existing `cachedJson` utility coalesces concurrent requests. Reuse it with zero completed-response TTL in the page and selector: 3 concurrent requests become 1, without stale access caching or shared backend authorization. Keep metrics and independent DB reads parallel in the sessions API. Expected impact: 67% fewer initial account requests, gateway calls and permission query batches for this view. Verify with the same browser fixture. Live authenticated latency comparison is unavailable because operator credentials cannot authenticate as the user's browser; do not claim production timing improvements from unauthorized HTTP responses.

## Verification evidence (9 October 2026)
- 59 tests passed across 9 WhatsApp test files, including independent preferences, foreign/unauthorized access denial, null workspace compatibility, queue attribution and retries, missing sender rejection, PDF routing, QR duplicate/retry/pause/failure lifecycle, worker and renewal integration.
- Browser fixture with real components: initial account requests reduced from 3 to 1; both selectors work; access modal renders under body and is centered; Escape closes it; 390px viewport has no horizontal overflow.
- Production additive migration applied atomically using the official Neon HTTPS driver; preference/actor columns, nullable WhatsApp scope and migration record inspected. Staff organization IDs and connection credentials unchanged.
- Audit inspection did not prove the original linker for Primary Operations; original ownership was not guessed.
- Gateway logs contain generated QR events and 408 closes. Socket regression tests prove renewed pairing after timeout. No live logout/disconnect test occurred.
- An authenticated production browser is not exposed to automation. No real message delivery, live device login, or live disconnect scenario is claimed. Unauthorized HTTP requests are not evidence of authenticated page latency.

## Queue reliability: concurrent callers and attachment audits
`processQueueBatch` is called by cron, manual automation runs, and bulk birthday actions. It selects pending messages then unconditionally updates by ID; concurrent workers can both dispatch the same message. Required minimal change: atomic conditional updateMany claim (ID and pending/retrying state), skipping a message already claimed. Risk: queue mocks/callers now observe skipped concurrent work; verification uses two concurrent workers against one message.
Direct-send audit rows record attachment names but intentionally omit large attachment bytes. The retry endpoint must not convert those rows into sendable queued attachments: filter bulk retries to stored payloads/text/generated birthday cards and reject an individual attachment retry without a payload. Original sending forms can resend such attachments correctly. No additional payload storage or database schema is introduced for this fix.

Queue API dependency: new legacy-workspace audit rows expose an existing non-admin/null-scope rejection and a super-admin unscoped query. Apply the same authenticated workspace scope to queue history/retry (including null), and restrict staff retries to their own initiated rows; administrators can review/retry within their workspace. This prevents cross-workspace or cross-employee replay. Verify attachment rejection and workspace predicates.

## Screenshot follow-up: staff rejection and error recovery
Production logs associate the screenshot's 403 account responses with deployment `dpl_4kVYwA6v4Gs23ZnjxmChLU7FumNL`. Its staff guard required a non-null organization ID, rejecting BHQ's legacy staff. The current deployment `dpl_4H9z7ariZmGjkVeRypZ7WaUDmaoF` contains the previously documented null-workspace correction and has serverless account GET/POST responses of 200. No additional authentication change is justified by this evidence.

The selector leaves its initial loading label after a failed request and never clears an old error after a successful refresh. Required change: track completion of the initial request, display account unavailability on failure, clear recovered errors, and disable stale selection while a load error exists. Scope: shared PrimaryWhatsAppSelector only, affecting both header and setup selectors. Verify denied initial load, successful focus retry, and recovered selection using the real component. No layout, API, or database change is required.

Production logs also show a sessions POST failing with a unique account-ID constraint while neighboring registrations succeed. Registration currently performs an unconditional create, so repeated or concurrent enable requests return 500. Required change: handle only Prisma P2002 in the register action, verify the existing registration belongs to the authenticated workspace, and treat it as already registered. Preserve all existing ownership and grants; reject a conflicting workspace. Scope: register branch only, leaving new session creation and gateway calls unchanged. Verify duplicate requests succeed, foreign-workspace duplicates are denied, other database failures propagate, and existing registration data is untouched.

Follow-up verification: 70 tests passed across 10 WhatsApp/integration test files; targeted ESLint and diff whitespace checks passed. The real-component browser fixture passed denial/loading completion, successful focus recovery, stale-control disabling and subsequent recovery for both selectors. Existing browser checks still show one initial sessions request, centered body-portal access dialog, Escape dismissal and no overflow at 390px. Production request logs show successful account responses on the corrected deployment; no authenticated browser assertion or actual message delivery is claimed. This follow-up changes two production files only, with no migration or gateway deployment.
