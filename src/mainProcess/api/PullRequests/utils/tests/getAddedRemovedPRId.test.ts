import { finalPullRequestCache } from "./mocks/finalCache.mock";
import { initialPullRequestCache } from "./mocks/initialCache.mock";
import { getAddedRemovedPRId } from "../getAddedRemovedPRId";
import { mockRepositories } from "./mocks/repositories.mock";

describe("getAddedRemovedPRId", () => {
  it("should correctly identify added and removed PRs ID", () => {
    const addedRemoved = mockRepositories.reduce(
      (acc: { added: number[]; removed: number[] }, repo) => {
        const addedRemovedPerRepo = getAddedRemovedPRId({
          repositoryName: repo.name,
          initialCache: initialPullRequestCache,
          finalCache: finalPullRequestCache,
          userId: 776452,
        });

        return {
          ...acc,
          added: [...acc.added, ...(addedRemovedPerRepo?.added || [])],
          removed: [...acc.removed, ...(addedRemovedPerRepo?.removed || [])],
        };
      },
      {
        added: [],
        removed: [],
      }
    );

    expect(addedRemoved).toStrictEqual({
      added: [2840278842],
      removed: [],
    });
  });
});
