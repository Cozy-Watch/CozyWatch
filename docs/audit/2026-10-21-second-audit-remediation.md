# Second audit remediation — 2026-10-21

All seven confirmed findings from the second audit have been addressed locally. Each finding has a separate fix commit, plus a pagination follow-up discovered during broader verification. Nothing was pushed.

| Finding | Change | Commit |
| --- | --- | --- |
| R1 | Independent Search/core quota counters and reserves; per-resource reset recovery | `12966be` |
| R2 | Broadcast explicit logout; replace each renderer's query cache and component tree on authentication changes; client-scoped PR snapshots | `93cafec` |
| R3 | Conditional requests handled per page; complete page sets replace obsolete pages atomically | `a5f9b65` |
| R4 | Persist accepted batches before paced native delivery; bound native backlog; repository-specific banner cancellation preserves history and unrelated alerts | `e709c11` |
| R5 | Deduplicate after successful storage; allow immediate resubmission; retry failed writes after 1, 5 and 30 seconds; cancel retries on sign-out | `b5bfcc9` |
| R6 | Match current head SHA, prefer newest workflow run/attempt, and carry the correct PR identity into notification copy | `7c8d09b` |
| R7 | Normalize initial and pushed repository data identically, preserve early pushes over late IPC responses, and broadcast to both windows | `8a8091f` |
| R3 follow-up | Preserve newer sweep-reconciled reviewers when a full list page returns 304; qualify multi-repository assertions by repository identity | `3c6432c` |

## Verification

- TypeScript and ESLint passed.
- 263 unit/UI tests passed across 52 suites.
- 35 refresh integration tests passed across five suites; one existing skipped test. After the final pagination follow-up, both affected refresh suites were rerun successfully (29 passed, one skipped).
- Existing five-scenario notification harness passed.
- Second-audit runtime checks passed all five scenarios; see `second-audit-verification.json` and `node scripts/reaudit-runtime.mjs`.
- `git diff --check` passed.

Regression coverage includes real Octokit pagination, closed-page removal, page-two changes behind a first-page 304, review sweep/full-refresh reconciliation, both renderer cache lifecycles, late IPC results, immediate and automatic storage retries, sign-out cancellation, repository-specific banner filtering, and old-commit CI completion.

The corrected reported-workload warm refresh makes 436 requests rather than 435: the additional conditional list request validates page two instead of silently stopping on page one's 304.

The original captured defect output is retained in `second-audit-reproductions.json`. Characterization probes were converted into normal regression tests; passing verification now asserts corrected behavior.

## Remaining verification limits

Signed macOS Notification Center delivery and clicking retained notifications after an app restart still require a release-build check. Mock notification tests do not establish OS permission/signature behavior. No release, live purchase, license-service mutation, or real GitHub account mutation was performed.

The recap's all-time Search result cap remains the separate availability limitation noted in the audit, outside its seven confirmed fixes. Permanent storage failure cannot guarantee durable notification history: automatic retries are bounded, later explicit submissions remain possible, and history/native backlog retain at most 100 entries.
