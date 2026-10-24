# Third audit — 2026-10-21

Remediation update: T1–T5 are fixed; see [remediation and verification](2026-10-21-third-audit-remediation.md). The findings below describe the audited baseline.

Baseline: `d4c4a68`. Review only: no production edits, commits, pushes, live licensing requests, real GitHub mutations, or real notifications. Existing unrelated untracked launch files were left untouched.

The previous seven fixes pass their regression checks. This pass confirmed five additional findings, using seven new defect scenarios. These are remaining gaps; the evidence does not establish that the last remediation introduced them.

## T1 — P1: License operations can overwrite newer activation state

Locations: `src/mainProcess/api/LemonSqueezy/validateLicense.ts:20–57`, `activateLicense.ts:37–83`, and `deactivateLicense.ts:14–55`.

Validation captures a key and state before waiting on the service, then saves a replacement state without checking whether the key/instance changed meanwhile. Startup, the six-hour timer, and Settings can run these operations independently.

Reproduced sequence:

1. Begin validating a licensed instance; hold the service response.
2. Successfully deactivate that instance and remove its local key.
3. Deliver the earlier valid response.
4. Observed: local state returns to `licensed`, while the stored key is null. Expected: deactivated state remains authoritative.

Because subsequent validation returns early when no key exists, this inconsistent entitlement can persist. A delayed rejection can similarly overwrite a newer activation.

A second reproduction submitted two activation requests concurrently from an initially unlicensed state. Both reached the activation API and both saved local state. Successful activation requests create separate instances according to the [official Lemon Squeezy guide](https://docs.lemonsqueezy.com/guides/tutorials/license-keys), so this can consume extra device slots while retaining only the last returned record. The local test mocks the service; no live device slots were consumed.

Recommendation: one coordinator for activation, deactivation, and validation; coalesce identical activation requests and reject stale validation responses using a captured activation generation/key/instance. Apply the stale-response guard to failure paths too. Persist key and matching entitlement together.

Evidence: original license probes, now converted and expanded in `src/mainProcess/licensing/tests/licenseService.test.ts`.

## T2 — P2: First-page 304 hides new comments and mentions on later pages

Location: `src/mainProcess/api/PullRequests/queries/getIssuesListCommentsQuery.ts:20–32`.

The catch surrounds the entire Octokit pagination operation. If the first 100 comments are unchanged, its 304 ends pagination even when later comments changed. The per-page hooks cannot read pages that were never requested.

Real-Octokit reproduction: load 101 comments, add one on page two, refresh. Observed one comment request and 101 cached comments; expected both pages and 102 comments. A new mention on that later page will not reach mention detection while page one stays unchanged.

Recommendation: conditional requests per page, retained next-page metadata, and atomic page-set replacement, as implemented for PR and review lists. Also reconcile empty/removed comment pages rather than retaining obsolete buckets.

Evidence: original comment probe, now converted and expanded in `tests/refresh/commentPagination.test.ts`.

## T3 — P2: First-page 304 hides workflow transitions on later pages

Location: `src/mainProcess/api/PullRequests/queries/pullActionQuery.ts:18–28`.

Workflow pagination has the same outer 304 catch. Matching current-head SHA cannot make CI alerts accurate when the changed run is never fetched.

Real-Octokit reproduction: load 101 workflows with a run on page two recently updated, so it is retained in the app's bounded cache. Change that run from success to failure while page one's response stays unchanged. Observed only one workflow request and cached success; expected the page-two failure. The fixture intercepts only page two to model the late transition and delegates request tracing to the existing mock transport.

Recommendation: independently revalidate workflow pages and preserve pagination metadata; ensure the bounded retained set covers relevant current PR runs. Do not rely on one page's validator for the whole collection.

Evidence: original workflow probe, now converted in `tests/refresh/workflowPagination.test.ts`.

## T4 — P2: A late notification-history response replaces a newer live update

Location: `src/views/hooks/useNotifications.ts:9–17`.

The initial query and pushed updates write the same query cache without ordering protection. PR and repository hooks now handle this race; the notification hook still does not.

Actual-hook reproduction: hold the initial history query, push a history containing a new alert, then resolve the earlier query with an empty history. Observed the newer alert disappear from the renderer cache. Disk history remains intact. With infinite stale time it may remain hidden until another update, invalidation, or reload; this can also affect displayed read state and badges.

Recommendation: client-scoped push sequencing or cancel/replace the initial query safely when a newer history arrives. Test both windows and early pushes, not only cache contents after a settled initial query.

Evidence: original history probe, now converted in `src/views/hooks/useNotifications.test.tsx`.

## T5 — P2: GitHub authentication can leave a partially committed connection

Location: `src/mainProcess/api/Authentication/authentication.ts:64–79`; the OAuth and GitHub App paths repeat the same sequence.

The token is saved first. Auth-type and notice writes ignore false storage results. Trial setup then runs separately; if it throws, the method reports authentication failure without rolling back or explicitly recording a recoverable setup state.

Actual-function reproductions:

- Reject only the auth-type write: PAT authentication still reports valid, with a token but no stored auth type. PAT-specific handling can therefore use the wrong auth classification.
- Fail trial setup after saving credentials: authentication reports invalid, but `hasLocalAccessToken()` returns true. UI and next-launch authentication decisions disagree with the reported result.

Recommendation: atomically commit the token, auth type, and connection metadata, and coordinate trial setup. If trial setup must be recoverable separately, expose that state explicitly and retry it rather than reporting a disconnected session with saved credentials. Preserve any previous working connection if replacement setup fails.

Evidence: original authentication probes, now replaced by atomic-storage failure coverage in `src/mainProcess/safeStorage/safeStorage.test.ts`, lifecycle coverage in `src/mainProcess/licensing/tests/licenseLifecycle.test.ts`, and all-method coverage in `src/mainProcess/api/Authentication/authentication.test.ts`.

## Checks and scope

- TypeScript and ESLint passed, including the audit probes.
- Normal unit/UI suite: 263 passed across 52 suites.
- Normal refresh suite: 35 passed, one existing skipped test, across five suites.
- Both existing five-scenario runtime harnesses passed.
- Explicit new probes: seven defect scenarios reproduced. The licensing probe also runs nine existing service tests, so the separate audit commands report 16 passing tests total. Their passing status confirms the characterized defects, not remediation.
- `git diff --check` passed; only new audit documentation/probes were added.

The original defect probes have been converted into normal regression tests. Run the corresponding suites with:

```sh
npm test -- --runInBand --silent
npm run test:refresh -- --silent
```

No fresh dependency audit was required for this code-only review; dependency manifests did not change. This pass does not establish signed macOS Notification Center behavior or click routing after restart. The previously documented recap Search-cap limitation remains outside these five new findings.

Release recommendation: fix T1 before release, and address T2–T5 before describing notification/connection reliability as fully verified.
