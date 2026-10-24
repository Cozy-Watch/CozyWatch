# Memory measurements — 23 October 2026

## Results

| Measurement | Before | After |
| --- | ---: | ---: |
| Extra retained JS heap after 100 synthetic PR updates, run 1 | 4.181 MiB | 0.137 MiB |
| Same workload, run 2 | 4.186 MiB | 0.141 MiB |

The cache-reference change saved about **4.04 MiB of retained JavaScript heap** for this payload. This is a reduction in additional retained update data, not a reduction of total app RAM from 4 MiB to 0.14 MiB. The payload contained 2,000 synthetic PR records with 2,048-character bodies. Savings will depend on real payload size and how many fields React Query can reuse.

The updated packaged app loaded successfully. Its unauthenticated idle RSS samples were 460.0, 457.2, 417.7, 365.4, 369.2, 369.2, and 370.3 MiB at 15-second intervals (105 seconds total). These sum main, renderer, GPU, and utility process RSS; shared pages may be counted more than once. They are not macOS Activity Monitor's unique memory-footprint metric.

The earlier installed-app snapshot (~298 MiB, three processes) is **not a valid before/after comparison** with this four-process run with the main window open. No total-app RAM reduction is claimed from those different states.

## Method

Host: Apple Silicon, Node v22.13.1. Baseline hook: commit `1c579f3`. Updated hook: current working tree. The production hook executes unchanged in a React + React Query jsdom harness; no GitHub token or real PR data is needed. Both variants run in separate processes with the same synthetic JSON and 100 IPC-style update deliveries. Garbage collection occurs before baseline measurement and every 20 deliveries. Assertions verify the cache still contains all 2,000 PRs. The observer unmounts and the query client clears afterward.

Jest/TypeScript runtime overhead is substantial and varies between cold and warm runs. The reported heap numbers subtract each process's warmed baseline; the test-runner baseline is not desktop-app memory usage. This is a controlled retained-data benchmark, not an authenticated Electron renderer benchmark.

The packaged build used:

```sh
COZYWATCH_OFFICIAL_BUILD=false COZYWATCH_DIAGNOSTICS_BUILD=true npm run package -- --arch=arm64
```

It passed the existing packaged renderer startup and security-fuse verifier. The idle run launched its executable with a temporary `--user-data-dir`, sampled only its process tree via `ps`, stopped the process, and removed the temporary profile. Updates are disabled for this contributor build. No distribution signature/notarization test or real-account monitoring workload was performed.

## Reproduction

Source fixtures are included beside this report. Recreate `.vite/memory-profile/` and copy the fixtures into that directory to reconstruct the temporary harness. The temporary harness was removed after profiling so it cannot enter normal tests or packages. Place the baseline hook in `before.ts`, the changed hook in `after.ts`, and a copy of `after.ts` in `variant.ts` for TypeScript resolution. Restore `profile.test.tsx` and `jest.config.cjs` from their `.fixture` files. Run from the repository root:

```sh
git show 1c579f3:src/views/api/usePullRequestQuery.ts > .vite/memory-profile/before.ts
cp src/views/api/usePullRequestQuery.ts .vite/memory-profile/after.ts
cp .vite/memory-profile/after.ts .vite/memory-profile/variant.ts
COZY_MEMORY_VARIANT=before node --expose-gc node_modules/jest/bin/jest.js --config .vite/memory-profile/jest.config.cjs --runInBand --watchman=false
COZY_MEMORY_VARIANT=after node --expose-gc node_modules/jest/bin/jest.js --config .vite/memory-profile/jest.config.cjs --runInBand --watchman=false
```

Create `/private/tmp/cozy-overview-preview` first; the fixtures write their measurements there. The packaged profiling fixture also writes its JSON there and uses only an isolated temporary app profile. Use the recorded JSON files here for the measurements from this audit.

## Limits and next measurements

The short idle run showed no sustained upward trend in its final samples. It cannot prove absence of long-term leaks. Remaining measurements include signed official-build memory under authenticated GitHub monitoring, large review/comment datasets, many hours of polling, and repeated dashboard/menu-bar navigation. The controlled test directly measures the PR cache fix; equivalent repository/notification changes were functionally tested but do not have separate heap benchmarks here.
