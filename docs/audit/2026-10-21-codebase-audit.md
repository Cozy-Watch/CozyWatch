# Cozy Watch codebase audit — 2026-10-21

**Assessment:** Do not release the current working tree without fixing the high-priority notification and cache correctness problems. Passing tests currently include characterizations of known defects; they are not a release guarantee. No production source was changed during this audit.

## Scope and verification

Reviewed the desktop trust boundary (main/preload/renderers), authentication, storage/migration, licensing, GitHub refresh/sweep pipeline, notification generation/delivery/history/settings, renderer Markdown, packaging/update configuration, and the existing test/benchmark infrastructure. Cross-cutting scans cover source sinks, timers, external URLs, credentials patterns, and dependency inventory. This is a source and local synthetic-test audit, not an exhaustive penetration test or a production-scale performance certification.

- TypeScript and ESLint: passed, including the added audit scripts and fixtures.
- Existing unit/UI tests: **230 passed across 43 suites**.
- Existing refresh tests: **29 passed, 1 skipped across 2 suites**. Real Octokit with synthetic HTTP, mocked persistence and notifications.
- Additional notification-manager audit: **5 defects reproduced** with actual transpiled manager source and fake OS/storage/timers. `node scripts/audit-notifications.mjs`; results in `notification-reproductions.json`.
- Additional refresh audit: **2 defects reproduced** through actual refresh code and Octokit. `npx jest --config jest.refresh.config.cjs --testMatch '**/notifications.audit.ts' --no-watchman --runInBand --silent`; results in `refresh-reproductions.json`. These assertions characterize defects, rather than declaring desired behavior correct; the file is excluded from default test matching.
- npm audit: **66 affected package entries** including transitive/derived findings: 2 critical, 38 high, 23 moderate, 3 low. Production-only npm audit: **0**. This does not mean Electron/Chromium are independently certified vulnerability-free. See `dependency-summary.json`.
- Secret-pattern scan found no matching credential/private-key patterns in scanned project files; only `.env.example` is tracked. This is a narrow heuristic, not proof no secrets exist.
- No live GitHub mutations, purchases, notification permission changes, or release/publish operations performed.

## Current synthetic speed measurement

A fresh run of the reported six-repository/208-PR fixture (20 ms artificial HTTP latency) published PRs after 139 ms on cold refresh and 84 ms on unchanged refresh; full completion took 1.47 s and 1.37 s respectively. The unchanged refresh made 435 HTTP requests despite 428 responses being 304. Hook registrations grew 6 → 12 → 18 across three refreshes. These are single-run local synthetic observations, not production-network timings or renderer responsiveness measurements. Raw data: `current-refresh-metrics.json`.

## Findings, ordered by priority

### A01 — P1: Notifications are lost when another batch arrives

**Location:** `src/mainProcess/notifications/notificationManager.ts:101–114`.

Every call resets `notificationQueue.length = 0`, including empty batches. A review sweep, full refresh, or system message can discard pending alerts. Lost entries remain in the recent-deduplication set and have not yet been persisted. Reproduction: queue A/B, then C before B is shown; actual delivery/history is A/C.

**Fix:** Append to a session-scoped queue; persist accepted events independently of native pacing; use stable event identities and bounded delivery backlog. Never let an empty refresh erase pending work.

### A02 — P1: Private queued alerts survive sign-out

**Location:** `src/mainProcess/notifications/notificationManager.ts:154–159`, delivery at `123–151`.

Sign-out clears history but neither queue, native notification objects, nor delivery timers. A license-valid app can display old-account PR details after sign-out, and reinsert them into the newly cleared history. Reproduced: queue A/B, sign out after A, then drain; B appears in history. This is also an account-isolation/privacy issue.

**Fix:** Invalidate delivery by authentication-session generation, cancel timers, clear pending queue/deduplication state, and close active notifications. Guard in-flight persistence/delivery against sign-out and account changes.

### A03 — P1: Same-named repositories overwrite each other

**Location:** `src/mainProcess/api/PullRequests/hooks/registerPullList.ts:21–26,40–60`; corresponding review/actions/comment cache maps use bare repository names.

`org-a/api` and `org-b/api` share the `api` slot. ETags, PR pages, reviews, and CI data can cross-contaminate, produce wrong statuses, or omit work. The review sweep explicitly excludes ambiguous repository names, so affected repositories also lose fast review updates. Source-confirmed; not newly reproduced in this audit.

**Fix:** Migrate all cache keys and selectors to repository ID or owner/name together. Include all detail caches, ETags, notification comparisons, and renderer lookups; invalidate obsolete derived caches while preserving repository selections and credentials.

### A04 — P1: Build-tool dependency advisories need remediation before publishing

**Location:** `package-lock.json`; `dependency-summary.json` contains installed versions and advisory links.

The full npm scan reports 66 affected package entries; critical entries include Handlebars 4.7.9 and tar 6.2.1 in development/build tooling. Vite 8.2.2 is also reported high. The production-only scan reports zero. Severity counts include dependency chains, not 66 independent exploitable paths. Exploitability depends on invoking affected functionality with attacker-controlled input; no exploit was attempted or demonstrated.

**Fix:** Upgrade supported toolchains/dependencies in an isolated change, inspect actual advisory paths, and rerun build/signing/package checks. Do not blindly use `npm audit fix --force`: npm currently proposes some major upgrades and downgrades.

### A05 — P2: CI notifications ignore the user's disabled setting

**Location:** `src/mainProcess/api/PullRequests/queries/getPullRequestQuery.ts:580`.

The badge/status map is gated by `ciStatusNotification.value`, but actual `ciStatusNotification` messages are regenerated over every repository regardless of that flag. Reproduced through real Octokit/refresh code: all settings disabled, one workflow changes, one CI alert is emitted while the gated status map is empty.

**Fix:** Generate CI messages from the already-filtered status map, and recheck current preferences at delivery for queued messages. Disabled notifications should not leave dock bounce/badge behavior inconsistent with delivery.

### A06 — P2: Notification failure handling can stall delivery and hides native failures

**Location:** `src/mainProcess/notifications/notificationManager.ts:123–151`.

`processQueue()` has no try/finally around persistence, construction, or `show()`. A thrown error skips scheduling and leaves `isProcessingQueue=true`; later batches do not restart processing. Native `failed` events are not observed, and support is not checked. The missing native-failure handler is reproduced; exception-induced stalling is source-confirmed. A failed native delivery also remains in `activeNotifications` unless a close/click follows.

**Fix:** Guarantee queue recovery in finally; handle unsupported delivery and `failed` events, release native objects, record safe diagnostics, and retain in-app history even if the OS rejects a banner.

### A07 — P2: Distinct PR notifications are wrongly deduplicated

**Location:** `src/mainProcess/notifications/notificationManager.ts:37–40`.

Hashing only lowercased title/body ignores account, repository, PR number, event ID, and URL. Two PRs with identical titles/messages collapse. Reproduced: different PR numbers with identical copy produce one alert instead of two. The global minute-based clear is not a rolling per-event expiry.

**Fix:** Deduplicate by account/repository/PR/event identity with per-key timestamps. Do not use prose as an event identifier.

### A08 — P2: Menu-bar unread indicator misses live updates

**Location:** `src/main.ts:1023–1027`; `src/views/hooks/useNotifications.ts:10–21`.

History broadcasts go only to `mainWindow`; the menu-bar renderer uses a separate QueryClient with `staleTime: Infinity`. Its unread dot/count can remain stale after arrivals, read actions, or history clearing. Source-confirmed; current tests mock the hook instead of exercising cross-window delivery.

**Fix:** Broadcast history updates to both trusted renderer windows and hydrate on creation. Test arrivals/read/clear while the menu window stays open and after reopening it.

### A09 — P2: History save failures are reported as success

**Location:** `src/mainProcess/notifications/notificationManager.ts:56–58`.

`storeData` returns false on failure rather than throwing. The manager ignores it and emits the new history anyway. Reproduced: storage saves no records while the renderer receives a successful update. Read/clear operations can look saved and then revert on restart.

**Fix:** Check persistence results, propagate an actionable failure, and choose an explicit in-memory fallback policy rather than claiming durable success.

### A10 — P2: Disabled repositories still consume comment requests

**Location:** `src/mainProcess/api/PullRequests/queries/getPullRequestQuery.ts:202–210`.

Comment-detail work is derived from every cached PR, not the active repository set. Disabling a repository hides its PRs but does not stop this I/O. Reproduced: after disabling the fixture repository, three comment requests still occur.

**Fix:** Build every detail work list from the active, current repository snapshot, and cancel/ignore obsolete work when selections change.

### A11 — P2: Hooks accumulate on every refresh

**Location:** `src/mainProcess/api/PullRequests/queries/getPullRequestQuery.ts:148–164`; registration modules under `hooks/`; repository query also registers hooks on its singleton client.

The same Octokit instance receives six more PR hook registrations each full refresh, with no removal. Existing real-client tests explicitly expect 12 hooks after two refreshes and 18 after three. Old hooks retain cache references and repeat work on later requests, worsening CPU/memory use through long-running sessions and risking stale-cache updates.

**Fix:** Register hooks once with current state access, or scope/remove hooks in finally. Prefer explicit per-request cache reconciliation. Verify bounded hook counts across hundreds of polls.

### A12 — P2: Workflow pagination retains older runs and drops recent ones

**Location:** `src/mainProcess/api/PullRequests/hooks/registerPullActions.ts:59–67`.

Each page prepends its runs and truncates to 100, so later/older pages displace page-one runs. Existing refresh test with 201 runs explicitly confirms the newest ID disappears. Recent CI statuses and alerts can therefore be missing/wrong.

**Fix:** Reconcile a complete response, deduplicate by run ID, sort newest first, then apply a bound. Preserve newer runs across 304 pages.

### A13 — P2: CI identity collapses workflows from multiple PRs

**Location:** `src/mainProcess/api/PullRequests/utils/getCIStatusUpdate.ts:5–31,60–71`.

Runs are grouped by workflow name for the entire repository. When two PRs use `build`, only one run survives; the other PR's transition can be missed or comparisons can cross PRs. Runs with empty `pull_requests` are filtered out before downstream SHA/branch fallback can help. Source-confirmed.

**Fix:** Associate runs to a PR/head SHA first and group by workflow identity within that PR. Cover fork runs and empty-PR metadata with validated SHA matching.

### A14 — P2: Inline review-comment mentions do not generate mention alerts

**Location:** `src/mainProcess/api/PullRequests/utils/getMentions.ts:17–42`; `queries/getPullRequestQuery.ts` mention-notification generation.

Mention notifications compare only `cache.mentions` (issue comments). Inline review comments are fetched separately into `reviewCommentsPerRepo` but never enter this comparison. An @mention in a review thread can be visible in activity without a mention alert. Source-confirmed.

**Fix:** Normalize both comment sources into stable mention events, with correct comment URLs and deduplication across polls. Define first-sync behavior to avoid historical alert floods.

### A15 — P2: Weekly “reviews given” counts other people's reviews and has expensive fan-out

**Location:** `src/mainProcess/api/WeeklyRecap/personalWeeklyRecap.ts:53–95`.

Search selects PRs reviewed by the current user, but the subsequent filter counts every human reviewer during the week, not just the current user. It fetches only the first 100 reviews per PR, scans up to 1,000 historical candidate PRs, and starts up to 100 detail promises per search page without an app-level concurrency bound. Counts can be both overstated and truncated while consuming substantial quota.

**Fix:** Identify the authenticated user, paginate/filter their submitted reviews, bound concurrency/budget, and cache results. Add fixtures with multiple reviewers and >100 reviews. Do not claim the recap represents personal reviews until corrected.

### A16 — P2: Full-refresh quota estimate is much lower than actual demand

**Location:** `src/mainProcess/api/PullRequests/queries/getPullRequestQuery.ts:79–82`.

Budget is estimated as repositories × 5 even though details scale with PR count/pages. Existing reported fixture has 208 PRs across six repositories and makes 435 requests on an unchanged full refresh. At a five-minute cadence that is 5,220 calls/hour before lightweight sweeps, repository refreshes, or weekly recap; conditional-request quota treatment varies by authentication/context, so this is request demand, not a claim each call always consumes one quota unit. The lightweight sweep has a stronger reserve calculation, but full refresh doesn't use it.

**Fix:** Share request-cost estimation and quota reservations across full refresh, sweep, and recap. Add a global request budget and expose degraded/stale state when work is deferred. Measure signed-app CPU/memory and actual GitHub quota behavior before making speed claims.

### A17 — P2: First-launch trial copy is hidden for real fresh installs

**Location:** `src/views/pages/GithubAuthentication/GithubAuthentication.tsx:323`.

The welcome screen requires `status === "trial"` with no start date, but real new official installs are `unconfigured` until GitHub connects. That trial-without-dates shape is invalid according to the licensing state validator. The synthetic preview uses that impossible shape, so the approved screenshot shows text that a real first launch won't show. This was introduced in the recent welcome UI work and should be corrected.

**Fix:** Render the introductory trial text for unconfigured official installs; make showcase fixtures conform to real license states. Test a fresh official install rather than relying only on showcase screenshots.

### A18 — P2: OAuth failures are treated as successful mutation completion

**Location:** `src/mainProcess/api/Authentication/authentication.ts`; `src/views/api/useGithubAuthenticationMutation.ts`; `src/views/api/useGitHubAppAuthenticationMutation.ts`; `src/views/pages/GithubAuthentication/useGithubAuthentication.ts`.

Main returns false on failed OAuth/GitHub App authentication. The renderer mutations return false without throwing, and `useAuthentication` still navigates to repositories. The route guard can bounce back, and the code screen gets no clear failure message. Source-confirmed.

**Fix:** Return a structured outcome or throw a safe error; only navigate on success. Show cancellation/expiry/network failures with retry and clear pending auth state. Prevent overlapping authentication attempts.

### A19 — P2: Storage read errors are indistinguishable from missing records

**Location:** `src/mainProcess/safeStorage/safeStorage.ts:333–392`; `src/mainProcess/licensing/licenseState.ts:26–47`.

`getData` catches decryption, parsing, permission and filesystem errors and returns null. License migration interprets null as absent state and may persist replacement state rather than surfacing a read failure. The renderer's activation-read error screen cannot reliably detect these failures. Source-confirmed; no destructive corruption test was run against user data.

**Fix:** Separate absent keys from unreadable records; fail safely without overwriting entitlement/trial history. Use explicit recovery/backup behavior and verify with synthetic corrupted files and unavailable encryption.

### A20 — P2 hardening: Extra file-protocol privileges remain enabled

**Location:** `forge.config.ts:84`.

`GrantFileProtocolExtraPrivileges` is enabled. Other major fuses are hardened, but this preserves special file-protocol behavior. This is defense-in-depth, not a demonstrated standalone exploit. Electron recommends avoiding unnecessary powerful features; disabling requires testing because the current renderer is file-based and relative assets/fetches may depend on its behavior.

**Fix:** Validate packaged renderer functionality with this fuse disabled; move to a constrained custom protocol if necessary. Verify fuse values in the signed artifact, not only source configuration.

## What is already solid

- Both windows explicitly use sandboxing, context isolation, web security and no Node integration.
- Main IPC invokes validate trusted window/main-frame origin and have validation for sensitive operations.
- External destinations use an allowlist; unexpected navigation/window creation is blocked.
- Production CSP restricts scripts, frames, objects and remote images; Markdown is sanitized with DOMPurify and image host filtering.
- Credentials and license data use OS-backed encryption; writes use per-file serialization, restrictive permissions and atomic rename.
- Rejected GitHub credentials preserve repository selections; transient/offline token validation errors don't delete tokens.
- License validation preserves local entitlement on transport failure; product identity and test/production mode are checked.
- Refresh scheduler avoids overlapping jobs/catch-up storms; review sweep bounds concurrency/quota and uses session generations.
- Snapshot-first rendering and early PR publication are covered by real-client refresh tests.

## Notification verification limits and release gate

Notification event-generation, click-to-history routing and settings paths were source-reviewed; code-copy notifications have three passing unit tests. The manager was additionally exercised with fake native notifications. **This does not establish end-to-end macOS delivery.** The development Electron bundle has an ad-hoc signature with no TeamIdentifier. Current Electron docs state that macOS native notifications require code signing and unsigned binaries report `failed` events. Cozy Watch's manager currently ignores those events.

Before release, use the signed/notarized official bundle to verify: fresh OS permission prompt, permissions denied, Focus enabled/disabled, banner and Notification Center delivery, clicking with dashboard closed, restart, sleep/wake, queue bursts, each setting individually and all-off, sign-out/account switch, expired trial and license revocation, offline recovery, and unread synchronization across both windows. No real PR or purchase actions are required for this matrix; inject synthetic app-owned events through a dedicated test harness.

## Suggested remediation order

1. Account-safe durable notification queue, settings enforcement, error recovery, cross-window unread updates, and regression tests.
2. Repository identity and pagination correctness, then bounded hooks and disabled-repository cancellation.
3. Correct CI/mention semantics and personal recap; shared API budgeting and long-session measurements.
4. Build-tool advisory remediation, packaged hardening checks, fresh-install/auth/storage recovery tests.
5. Signed end-to-end notification and release smoke matrix.

## References

- [Electron notification API](https://www.electronjs.org/docs/latest/api/notification) — support checks, native failure events, macOS signing requirements.
- [Electron fuse documentation](https://www.electronjs.org/docs/latest/tutorial/fuses) — package-time hardening and file-protocol privileges.
- [Handlebars advisory affecting 4.7.9](https://github.com/advisories/GHSA-8r5x-fm3f-whwj) — build-tool dependency finding; patched version and attack prerequisites.

