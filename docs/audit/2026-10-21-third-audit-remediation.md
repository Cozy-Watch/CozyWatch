# Third audit remediation — 2026-10-21

The five confirmed findings have been fixed locally in separate commits. The adjacent repository-discovery path was also corrected after checking the remaining pagination callers. Nothing was pushed.

| Finding | Commit | Result |
| --- | --- | --- |
| T1: overlapping license operations | `ab1f89a` | Device mutations serialize, adjacent identical requests coalesce, and obsolete validation success/error/revocation responses cannot overwrite newer state. Validation network I/O does not block device transfers. |
| T2: later comment pages skipped | `f86b31e` | Per-page conditional requests, client-scoped validators, and complete page-set replacement detect later comments and remove empty/obsolete pages. |
| T3: later workflow pages skipped | `dadfbab` | The same pagination routine revalidates each workflow page within the service cap and replaces the retained run set only after completion. |
| T4: late notification history | `34d0863` | A newer push wins over a delayed initial history response; ordering state belongs to each renderer QueryClient. |
| T5: partially saved GitHub connections | `f036392` | Token, auth type, notice, and trial are committed in one encrypted primary-file mutation. Failures preserve the previous connection. All three sign-in methods share this path, overlapping attempts are blocked, and cancelled device responses cannot sign the user back in. |
| Related repository discovery | `e1a6705` | Repository pages use the same conditional routine. Discovery cannot publish an obsolete account session, and in-flight requests are coalesced only within their session. |

The connection commit also puts local license normalization, trial consent, and reminder mutations under the license coordinator so they cannot overwrite activation changes. Reentrant reads are scoped to the active operation; background tasks spawned during an operation return to normal queue ordering after it finishes.

## Verification

- TypeScript and ESLint passed.
- 284 unit/UI tests passed across 57 suites.
- 38 refresh integration tests passed across seven suites; one existing skipped test.
- Both five-scenario runtime notification/audit harnesses passed.
- `git diff --check` passed.
- Production main, preload and renderer bundles compiled; community macOS arm64 packaging completed successfully. The sandbox initially blocked Electron's download; the authorized retry completed. Log: `/private/tmp/cozywatch-third-remediation-package.log`.

Regression coverage now includes:

- Late validation success, outage, revocation, and product mismatch after deactivation; out-of-order validation responses; duplicate activation requests.
- Local/background license reads and device mutation ordering.
- Page-two comments/workflow transitions behind a page-one 304, shrinking/empty comments, incomplete fetches, client isolation, and the full terminal page at the service cap.
- Late history responses after newer pushes.
- Successful and failed PAT, OAuth, and GitHub App setup; overlapping attempts and cancelled device responses.
- Injected atomic-file rename failure: existing on-disk bytes, token, auth type, and license remain unchanged; retry commits the complete replacement.
- Repository page-two updates, obsolete page removal, and cancellation before publishing an old session.

The corrected reported-workload warm refresh uses 450 requests rather than 436. Nine additional requests revalidate remaining workflow pages; five probe beyond full terminal comment pages when the unchanged response lacks Link metadata. Previously those pages were skipped. Of the 450 requests, 438 return 304. This is a correctness tradeoff of about 3.2% more requests for this synthetic workload; concurrency remains bounded and budget checks remain in force.

Original characterization probes were converted into normal regression tests. The audit document preserves the original observations instead of leaving tests that assert defective behavior.

## Limits

Packaging is not signed-release end-to-end verification. Real macOS notification permissions, retained Notification Center clicks after restart, and live purchase/device transfer behavior still require release QA. No real GitHub mutations, purchases, device-slot consumption, or signing-account operations were performed.

The previously documented weekly-recap Search-cap limitation was not one of these five findings and remains unchanged. Passing these checks establishes the covered behavior; it does not establish that the entire codebase is defect-free.
