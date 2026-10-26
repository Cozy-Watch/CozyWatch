import type { CacheData, PullRequestList } from "./getDefaultData";

// Internal validators and notification comparison graphs never cross IPC.
// Preserve discussion/review bodies: existing expanded cards display them.
const compactPull = (pr: PullRequestList[number]): PullRequestList[number] => ({
  ...pr,
  body: null,
});

export const rendererSnapshot = (cache: CacheData): CacheData => {
  const pulls = new Map<number, PullRequestList[number]>();
  const project = (pr: PullRequestList[number]) => {
    let result = pulls.get(pr.id);
    if (!result) { result = compactPull(pr); pulls.set(pr.id, result); }
    return result;
  };
  return {
    ...cache,
    etagPerRepo: {},
    pullRequestAddedOrRemoved: { added: [], removed: [] },
    reviewUpdateList: { newReview: [], reviewChanged: [] },
    CIStatusUpdatePerRepo: {},
    flatPullRequests: cache.flatPullRequests.map(project),
    pullRequestsPerRepo: Object.fromEntries(Object.entries(cache.pullRequestsPerRepo).map(([repo, pages]) => [
      repo, Object.fromEntries(Object.entries(pages).map(([page, prs]) => [page, prs.map(project)])),
    ])),
  };
};
