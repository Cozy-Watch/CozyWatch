import { getAddedRemovedPRId } from "../getAddedRemovedPRId";
import { getReviewStatusUpdate } from "../getReviewStatusUpdate";
import { getMentions } from "../getMentions";
import { createSyntheticCacheFixture, SYNTHETIC_REPOSITORY_NAME as repositoryName, SYNTHETIC_USER_ID as userId, SYNTHETIC_USERNAME as username } from "./mocks/syntheticCache.mock";

it("hydrates missing repository and detail baselines without historical alerts", () => {
  const { initialCache, finalCache } = createSyntheticCacheFixture();
  delete initialCache.pullRequestsPerRepo[repositoryName];
  delete initialCache.reviewPerRepoPerPullNumber[repositoryName];
  delete initialCache.mentions[repositoryName];
  expect(getAddedRemovedPRId({ initialCache, finalCache, repositoryName, userId })).toEqual({ added: [], removed: [] });
  expect(getReviewStatusUpdate({ initialCache, finalCache, repositoryName, userId })).toEqual({ newReview: [], reviewChanged: [] });
  expect(getMentions({ initialCache, finalCache, repositoryName, username })).toEqual({ addedMentions: [], removedMentions: [] });
});

it("retains genuine new activity after observing empty endpoint responses", () => {
  const { initialCache, finalCache } = createSyntheticCacheFixture();
  initialCache.pullRequestsPerRepo[repositoryName] = {};
  initialCache.reviewPerRepoPerPullNumber[repositoryName] = { 1: [], 2: [] };
  initialCache.mentions[repositoryName] = { "1_1": [], "2_1": [] };
  expect(getAddedRemovedPRId({ initialCache, finalCache, repositoryName, userId }).added.length).toBeGreaterThan(0);
  expect(getReviewStatusUpdate({ initialCache, finalCache, repositoryName, userId }).newReview.length).toBeGreaterThan(0);
  expect(getMentions({ initialCache, finalCache, repositoryName, username }).addedMentions.length).toBeGreaterThan(0);
});
