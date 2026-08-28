import { finalPullRequestCache } from "../tests/mocks/finalCache.mock";
import { initialPullRequestCache } from "../tests/mocks/initialCache.mock";
import { getCIStatusUpdate } from "../getCIStatusUpdate";

describe("getAddedRemovedPRId", () => {
  it("should correctly identify added and removed PRs ID", () => {
    const ciUpdate = getCIStatusUpdate({
      repositoryName: "CozyWatch",
      initialCache: initialPullRequestCache,
      finalCache: finalPullRequestCache,
      userId: 776452,
    });

    const key = Object.keys(ciUpdate)[0];

    const { finalRun, initialRun } = ciUpdate[key];

    const isDifferent = finalRun.conclusion !== initialRun.conclusion;

    expect(isDifferent).toBe(true);
  });
});
