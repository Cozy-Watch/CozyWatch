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
      build: {
        initialRun: workflowRuns.initialBuildLatest,
        finalRun: workflowRuns.finalBuildLatest,
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

    expect(Object.keys(result)).toStrictEqual(["build"]);
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
