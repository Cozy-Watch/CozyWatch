# Audit remediation — 2026-10-21

The original audit is retained as a historical record. All 20 source/dependency findings have dedicated fix commits. An additional account-isolation guard gives each empty cache a fresh snapshot. No commits were pushed.

The pre-existing lifetime-license/onboarding implementation was checkpointed in `83e5fbe` before the fix series. Existing large marketing exports remain uncommitted.

| Finding | Fix commit | Change |
| --- | --- | --- |
| A01 | `f8c0204` | Preserve pending notification batches |
| A02 | `db7f56d` | Cancel private alerts on sign-out/session changes |
| A03 | `28e4dc5` | Isolate repository caches by owner/name |
| A04 | `9f3978d` | Remove dependency advisories and upgrade Forge |
| A05 | `487c20e` | Enforce CI and queued notification preferences |
| A06 | `5124851` | Recover from native notification failures |
| A07 | `6181003` | Deduplicate by PR identity and rolling expiry |
| A08 | `c28457e` | Synchronize notification history across both windows |
| A09 | `fac9093` | Report notification-history save failures |
| A10 | `b95112e` | Stop disabled-repository comment work |
| A11 | `78cdb71` | Remove refresh hooks after use |
| A12 | `ce28473` | Retain newest paginated workflow runs |
| A13 | `89943c4` | Keep CI transitions specific to each PR |
| A14 | `cfe8b70` | Notify for new inline review mentions |
| A15 | `687882c` | Correct and cache personal review counts |
| A16 | `eb04280` | Share request budgets and realistic quota estimates |
| A17 | `a3873b1` | Show trial terms for real fresh installs |
| A18 | `fee363b` | Handle failed OAuth and overlapping attempts |
| A19 | `cdd220d` | Do not replace unreadable credentials/entitlements |
| A20 | `753efd2` | Use a constrained app protocol and disable file extras |

Additional fix: `e98cb9f` prevents mutable cache defaults being reused across accounts. The final verification commit promotes the two pipeline audit checks into the normal refresh suite and records test/build results.

## Verification

Final results are recorded in `final-verification.json`, `notification-verification.json`, and `dependency-verification.json`.

- Unit/UI tests cover notification batching, identity-based deduplication, sign-out cancellation, native exception recovery, unsupported native notifications, preference checks, and failed persistence.
- Real-Octokit tests cover all-off CI settings, disabled repositories, same-named repositories across owners, review sweeps, pagination, bounded hook lifetimes, and partial failures.
- Personal recap tests check other reviewers are excluded, paginated results are used, cached results are reused, and oversized search results are not reported as complete.
- Fresh-install and authentication tests check trial messaging, failed OAuth staying in place, and successful retry reaching repository selection.
- Storage tests check corrupt/unavailable primary storage preserves the original data and never creates a replacement license state.
- Full dependency audit is clean, including build/test tooling. Production-only audit is also clean. The YAML override was separately exercised against a temporary YAML configuration.
- The local macOS arm64 contributor package passes the renderer startup smoke test and fuse verification with extra file privileges disabled. The native DMG maker reuses the existing background and icon positions. Generated DMG and ZIP builds pass; the DMG checksum is verified.

## Boundaries

The build/installer checks use a local contributor build and temporary smoke-test user data. They do not validate Developer ID notarization, a universal official release, or OS notification permissions/Focus behavior. Actual banner delivery and click behavior across macOS restart still require the signed official app. No production GitHub changes, purchases, customer migrations, permission changes, release publication, or pushes were performed.

Full polling still scales with the number of PRs; quota budgeting now accounts for that work and protects the shared reserve. There is no claimed production-network speedup from synthetic tests alone.

Useful commands:

```sh
npm run types
npm run lint
npm test -- --runInBand
npm run test:refresh
node scripts/audit-notifications.mjs
npm audit
```
