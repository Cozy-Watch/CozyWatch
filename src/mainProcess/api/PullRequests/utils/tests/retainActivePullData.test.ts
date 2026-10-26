import { retainActivePullData } from "../retainActivePullData";
import type { CacheData } from "../getDefaultData";

it("releases closed and disabled detail data without copying or changing open records", () => {
  const pr = { number: 1, id: 100 };
  const reviews = [{ id: 200 }];
  const mentions = [{ id: 300 }];
  const cache = {
    pullRequestsPerRepo: { "org/active": { 1: [pr] }, "org/disabled": { 1: [{number: 9}] } },
    etagPerRepo: {}, actionsPerRepo: {}, reviewCommentsPerRepo: {},
    reviewPerRepoPerPullNumber: { "org/active": { 1: reviews, 2: [{id: 201}] }, "org/disabled": { 9: [] } },
    mentions: { "org/active": { "1_1": mentions, "2_1": [] }, "org/disabled": { "9_1": [] } },
  } as unknown as CacheData;
  const result = retainActivePullData(cache, ["org/active"]);
  expect(Object.keys(result.pullRequestsPerRepo)).toEqual(["org/active"]);
  expect(Object.keys(result.reviewPerRepoPerPullNumber["org/active"])).toEqual(["1"]);
  expect(Object.keys(result.mentions["org/active"])).toEqual(["1_1"]);
  expect(result.reviewPerRepoPerPullNumber["org/active"]["1"]).toBe(reviews);
  expect(result.mentions["org/active"]["1_1"]).toBe(mentions);
  expect(cache.reviewPerRepoPerPullNumber["org/active"]["2"]).toBeDefined();
  expect(cache.pullRequestsPerRepo["org/disabled"]).toBeDefined();
});


it("matches repository identities case-insensitively while preserving stored keys and records", () => {
  const comments = [{ body: "@reader please review" }];
  const reviews = [{ id: 200 }];
  const mentions = [{ id: 300 }];
  const cache = {
    pullRequestsPerRepo: { "org/active": { 1: [{ number: 1 }] } },
    etagPerRepo: {}, actionsPerRepo: {},
    reviewCommentsPerRepo: { "Org/Active": comments, "Org/Disabled": [] },
    reviewPerRepoPerPullNumber: { "Org/Active": { 1: reviews, 2: [] } },
    mentions: { "Org/Active": { "1_1": mentions, "2_1": [] } },
  } as unknown as CacheData;
  const result = retainActivePullData(cache, ["ORG/ACTIVE"]);
  expect(result.reviewCommentsPerRepo).toEqual({ "Org/Active": comments });
  expect(result.reviewCommentsPerRepo["Org/Active"]).toBe(comments);
  expect(result.reviewPerRepoPerPullNumber["Org/Active"]).toEqual({ 1: reviews });
  expect(result.mentions["Org/Active"]).toEqual({ "1_1": mentions });
  expect(cache.reviewCommentsPerRepo["Org/Disabled"]).toBeDefined();
});
