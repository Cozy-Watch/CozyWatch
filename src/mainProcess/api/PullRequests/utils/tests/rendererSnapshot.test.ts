import { rendererSnapshot } from "../rendererSnapshot";
import type { CacheData } from "../getDefaultData";

it("omits internal graphs and descriptions without mutating the monitoring cache", () => {
  const pr = { id: 1, body: "large private description" };
  const cache = {
    flatPullRequests: [pr], pullRequestsPerRepo: { "org/repo": { 1: [pr] } },
    etagPerRepo: { "org/repo": { list: { 1: "etag" } } },
    pullRequestAddedOrRemoved: { added: [pr], removed: [] },
    reviewUpdateList: { newReview: [{ reviewId: 1 }], reviewChanged: [] },
    CIStatusUpdatePerRepo: { "org/repo": {} },
    mentions: { "org/repo": { "1_1": [{ body: "@user mention" }] } },
  } as unknown as CacheData;
  const result = rendererSnapshot(cache);
  expect(result.flatPullRequests[0].body).toBeNull();
  expect(result.flatPullRequests[0]).toBe(result.pullRequestsPerRepo["org/repo"]["1"][0]);
  expect(result.etagPerRepo).toEqual({});
  expect(result.pullRequestAddedOrRemoved.added).toEqual([]);
  expect(result.reviewUpdateList.newReview).toEqual([]);
  expect(result.mentions).toBe(cache.mentions);
  expect(cache.flatPullRequests[0].body).toBe("large private description");
  expect(JSON.stringify(result).length).toBeLessThan(JSON.stringify(cache).length);
});
