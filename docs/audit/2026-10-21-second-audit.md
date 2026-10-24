# Second codebase audit — 2026-10-21

Remediation update: R1–R7 are now fixed; see [second audit remediation](2026-10-21-second-audit-remediation.md). The findings below describe the audited baseline, not the final implementation.

Audited HEAD `2142e85`, including the previous remediation commits. This is an audit pass: production files were not changed and nothing was pushed. The previous clean conclusion was too strong. The following defects remain or were introduced during remediation.

## Confirmed findings

### R1 — P1: Search responses block healthy core API requests (new regression)

`src/mainProcess/api/githubRequestBudget.ts:35–44` keeps one remaining/reset counter for every endpoint and applies a reserve of 100. GitHub Search has a separate, smaller quota. After a response with Search remaining 29, an ordinary core request is rejected locally despite core remaining 5000. The weekly recap uses Search, so it can interrupt its own subsequent review requests and normal monitoring until another quota check resets the counter.

Reproduced against the actual budget function: expected core request allowed; observed blocked. Fix by tracking and enforcing each resource quota independently. The existing transport fixture returns core quota headers for Search, masking the regression.

Reference: https://docs.github.com/en/rest/rate-limit/rate-limit?apiVersion=2022-11-28

### R2 — P1: Explicit logout leaves other renderer account state and private caches intact

`src/main.ts:625` clears backend state but does not broadcast the signed-out event. The initiating Header invalidates its own QueryClient; the menu bar uses another QueryClient. Account-owned renderer queries also use account-independent keys and indefinitely fresh cached data. Even the renderer sign-out listener does not clear these caches.

Actual main IPC wiring test: explicit sign-out emitted zero `sign-user=false` messages. This leaves the other window able to retain previous-account information; a subsequent login can reuse stale identity and PR data. Broadcast sign-out to both windows and cancel/remove account-owned queries and snapshots; scope account data by authenticated identity/session.

Evidence: `src/main.recovery.test.ts` (converted to regression coverage) (8 passing characterization/recovery tests).

### R3 — P1: PR pagination retains closed PRs and skips changes beyond page one

`src/mainProcess/api/PullRequests/hooks/registerPullList.ts` merges page buckets without removing obsolete pages. `src/mainProcess/api/PullRequests/queries/pullListQuery.ts:18–29` catches 304 around the entire pagination operation, aborting subsequent pages when page one is unchanged.

Two real-Octokit transport reproductions:

- Starting with 101 PRs, shrinking the open list to one leaves PR 101 cached: observed two open PRs instead of one.
- Changing reviewers on PR 101 while page one remains unchanged performs only one list call and retains the old reviewers on page two.

Handle conditional responses per page, follow cached next-page metadata, and atomically replace/truncate the complete page set after a successful refresh. A sweep does not replace full-list membership and metadata reconciliation.

Evidence: `tests/refresh/pullPagination.test.ts` (converted to regression coverage) (2 passing defect characterization tests).

### R4 — P2: Accepted notifications are not durable before native pacing; repository changes drop unrelated alerts

`src/mainProcess/notifications/notificationManager.ts:111–179` stores events only as each native delivery is processed, with a delay between entries. Remaining accepted events exist only in memory. Quit/crash or `cancelPendingNotifications()` discards them. Repository selection saves call that global cancellation even when queued alerts concern another enabled repository. Since the monitoring cache already advanced, a later refresh may not regenerate the lost event.

Reproduction: submit two events; history contains only one before the next delivery. Cancel delivery; the second event never enters history. Persist accepted history independently of native pacing, bound native delivery backlog, and filter repository-specific deliveries without resetting the entire notification session.

### R5 — P2: A history-write failure prevents immediate notification retry

The manager inserts the deduplication hash before persistence. If storage fails, the catch drops the event while retaining its hash for 60 seconds. Re-submitting after storage recovers is suppressed; polling may never rediscover the transition.

Reproduction: fail persistence, restore storage, immediately submit the same event; observed zero stored notifications instead of one. Retain failed accepted events for bounded retry, or remove the deduplication entry on unsuccessful persistence, with session cancellation guards.

### R6 — P2: A late old-commit workflow success can override current failing CI

`src/mainProcess/api/PullRequests/utils/getCIStatusUpdate.ts:20–25` accepts runs linked to the PR without checking their head SHA, then picks the greatest update time. An old commit finishing after the current commit's failed run wins the group and produces a success transition.

Reproduction: current SHA failed at 10:02; old SHA finishes successfully at 10:03. Observed a success alert attributed to the old commit; expected no current-head success. Require current-head identity for linked runs as well as fallback matches, and handle workflow attempts explicitly.

### R7 — P2: Repository pushes use a different query shape and leave the visible list stale

`src/views/api/useRepositoriesQuery.ts:14–23` merges raw `repositoriesByPage` into normalized query data containing `repositories`. The displayed array is never rebuilt. With `staleTime: Infinity`, the newly discovered repositories remain absent until an explicit refetch/restart. Updates received before initial data are also discarded. Main-process repository broadcasts additionally need parity across both windows.

Actual-hook React Query reproduction: push a two-repository raw cache after loading one repository; observed displayed list length one. Normalize push and initial query results identically and broadcast to every relevant renderer.

Evidence: `src/views/api/useRepositoriesQuery.test.tsx` (converted to regression coverage) (1 passing defect characterization test).

## Additional limitations / verification gaps

- Personal weekly recap queries all-time reviewed PRs and rejects results above the Search 1000-result cap. Its `Promise.all` then prevents otherwise available merged statistics from displaying. Existing tests intentionally assert this rejection; it is an availability limitation rather than a newly introduced regression. Isolate unavailable metrics and partition/bound review history if exact counts are required.
- Native notification routing across app restart remains unverified on a signed release build. Current listeners attach only to newly created Notification instances; retained OS notifications need platform-specific restart handling. Mock delivery and in-process click tests do not establish signed macOS Notification Center behavior.
- No live purchase, licensing-service, signed release, or real GitHub account mutation was performed in this pass.

## Verification and reproducibility

Standard checks passed:

- TypeScript and ESLint.
- 249 unit/UI tests across 50 suites.
- 33 refresh tests across 4 suites, with 1 skipped test.
- Existing five-scenario notification harness.
- Fresh complete and production-only npm audits: zero advisories.

The original characterization tests reproduced defects rather than asserting corrected behavior. They have since been converted to regression tests; the original captured evidence remains unchanged. Runtime evidence is in `docs/audit/second-audit-reproductions.json`, generated by `node scripts/reaudit-runtime.mjs`. The runtime harness loads actual TypeScript functions with mocked storage, native notifications, and clocks; it does not access user credentials or show real notifications.

Commands:

```sh
npx jest --no-watchman --runInBand src/main.recovery.test.ts src/views/api/AccountQueryProvider.test.tsx src/views/api/useRepositoriesQuery.test.tsx --silent
npx jest --config jest.refresh.config.cjs --no-watchman --runInBand tests/refresh/pullPagination.test.ts --silent
node scripts/reaudit-runtime.mjs
```

Release recommendation: address R1–R3 before release, then complete notification durability and signed-platform verification. Passing the existing suites alone is insufficient evidence of reliability.
