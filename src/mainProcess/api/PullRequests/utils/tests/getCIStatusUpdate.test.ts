import { getCIStatusUpdate } from "../getCIStatusUpdate";
import {
  createSyntheticCacheFixture,
  SYNTHETIC_REPOSITORY_NAME,
  SYNTHETIC_USER_ID,
} from "./mocks/syntheticCache.mock";

describe("getCIStatusUpdate", () => {
  it("returns the exact latest workflow transition from the cache pair", () => {
    const { finalCache, initialCache, workflowRuns } =
      createSyntheticCacheFixture();

    expect(
      getCIStatusUpdate({
        repositoryName: SYNTHETIC_REPOSITORY_NAME,
        initialCache,
        finalCache,
        userId: SYNTHETIC_USER_ID,
      }),
    ).toStrictEqual({
      [`build:${workflowRuns.finalBuildLatest.pull_requests![0].id}`]: {
        initialRun: workflowRuns.initialBuildLatest,
        finalRun: workflowRuns.finalBuildLatest,
        pullRequestId: workflowRuns.finalBuildLatest.pull_requests![0].id,
      },
    });
  });

  it("does not report unchanged, new-only, unnamed, or unrelated workflows", () => {
    const { finalCache, initialCache, workflowRuns } =
      createSyntheticCacheFixture();
    finalCache.actionsPerRepo[SYNTHETIC_REPOSITORY_NAME].push({
      ...workflowRuns.finalOnly,
      id: 309,
      name: null,
    });

    const result = getCIStatusUpdate({
      repositoryName: SYNTHETIC_REPOSITORY_NAME,
      initialCache,
      finalCache,
      userId: SYNTHETIC_USER_ID,
    });

    expect(Object.keys(result)).toStrictEqual([`build:${workflowRuns.finalBuildLatest.pull_requests![0].id}`]);
  });

  it("returns no transitions when the current user has no relevant pull requests", () => {
    const { finalCache, initialCache } = createSyntheticCacheFixture();

    expect(
      getCIStatusUpdate({
        repositoryName: SYNTHETIC_REPOSITORY_NAME,
        initialCache,
        finalCache,
        userId: 999,
      }),
    ).toStrictEqual({});
  });
});

it("keeps the same workflow on different PRs separate and matches empty PR metadata by SHA", () => {
  const { finalCache, initialCache, workflowRuns } = createSyntheticCacheFixture();
  const repo = SYNTHETIC_REPOSITORY_NAME;
  const pr = Object.values(finalCache.pullRequestsPerRepo[repo]).flat().find(pr => pr.id === workflowRuns.finalBuildLatest.pull_requests![0].id)!;
  const other = { ...pr, id: 999, number: 99, head: { ...pr.head, sha: "another-sha" } };
  finalCache.pullRequestsPerRepo[repo]["extra"] = [other];
  initialCache.actionsPerRepo[repo].push({ ...workflowRuns.initialBuildLatest, id: 990, pull_requests: [], head_sha: "another-sha" });
  finalCache.actionsPerRepo[repo].push({ ...workflowRuns.finalBuildLatest, id: 991, pull_requests: [], head_sha: "another-sha" });
  expect(Object.keys(getCIStatusUpdate({ repositoryName: repo, initialCache, finalCache, userId: SYNTHETIC_USER_ID }))).toHaveLength(2);
});

it("ignores an old commit that finishes after current-head CI has failed", () => {
  const { finalCache, initialCache, workflowRuns } = createSyntheticCacheFixture();
  const repo = SYNTHETIC_REPOSITORY_NAME;
  const current = { ...workflowRuns.initialBuildLatest, updated_at: "2026-01-03T00:00:00Z" };
  initialCache.actionsPerRepo[repo] = [current, { ...current, id: 1000, head_sha: "old", conclusion: null }];
  finalCache.actionsPerRepo[repo] = [current, { ...current, id: 1000, head_sha: "old", conclusion: "success", updated_at: "2026-01-04T00:00:00Z" }];
  expect(getCIStatusUpdate({ repositoryName: repo, initialCache, finalCache, userId: SYNTHETIC_USER_ID })).toEqual({});
});
it("prefers the newest run attempt even if the previous attempt updated later", () => {
  const { finalCache, initialCache, workflowRuns } = createSyntheticCacheFixture();
  const repo = SYNTHETIC_REPOSITORY_NAME;
  const earlier = { ...workflowRuns.initialBuildLatest, run_attempt: 1, updated_at: "2026-01-05T00:00:00Z" };
  const latest = { ...earlier, run_attempt: 2, conclusion: "success" as const, updated_at: "2026-01-04T00:00:00Z" };
  initialCache.actionsPerRepo[repo] = [earlier];
  finalCache.actionsPerRepo[repo] = [latest, earlier];
  const changes = Object.values(getCIStatusUpdate({ repositoryName: repo, initialCache, finalCache, userId: SYNTHETIC_USER_ID }));
  expect(changes).toHaveLength(1);
  expect(changes[0].finalRun.run_attempt).toBe(2);
});
