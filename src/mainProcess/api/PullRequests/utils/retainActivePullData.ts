import type { CacheData } from "./getDefaultData";

const keepEntries = <T>(data: Record<string, T>, keep: (key: string) => boolean): Record<string, T> =>
  Object.fromEntries(Object.entries(data).filter(([key]) => keep(key)));

/** Remove derived detail data for disabled repositories and PRs no longer open. */
export const retainActivePullData = (cache: CacheData, activeRepositories: readonly string[]): CacheData => {
  const active = new Set(activeRepositories.map(repo => repo.toLowerCase()));
  const isActive = (repo: string) => active.has(repo.toLowerCase());
  const pullRequestsPerRepo = keepEntries(cache.pullRequestsPerRepo, isActive);
  const openPulls = new Map(Object.entries(pullRequestsPerRepo).map(([repo, pages]) => [
    repo.toLowerCase(), new Set(Object.values(pages).flat().map(pr => String(pr.number))),
  ]));
  return {
    ...cache,
    pullRequestsPerRepo,
    etagPerRepo: keepEntries(cache.etagPerRepo, isActive),
    actionsPerRepo: keepEntries(cache.actionsPerRepo, isActive),
    reviewCommentsPerRepo: keepEntries(cache.reviewCommentsPerRepo, isActive),
    reviewPerRepoPerPullNumber: Object.fromEntries(
      Object.entries(cache.reviewPerRepoPerPullNumber).filter(([repo]) => isActive(repo))
        .map(([repo, reviews]) => [repo, keepEntries(reviews, number => openPulls.get(repo.toLowerCase())?.has(number) ?? false)]),
    ),
    mentions: Object.fromEntries(
      Object.entries(cache.mentions).filter(([repo]) => isActive(repo))
        .map(([repo, pages]) => [repo, keepEntries(pages, page => openPulls.get(repo.toLowerCase())?.has(page.split("_")[0]) ?? false)]),
    ),
  };
};
