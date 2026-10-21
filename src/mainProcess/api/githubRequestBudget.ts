import { repositoryKey } from "../../shared/repositoryKey";
import type { CacheData } from "./PullRequests/utils/getDefaultData";
import type { Repository } from "../safeStorage/safeStorage.types";
import type { Octokit } from "@octokit/rest";

// Full refresh includes list, reviews, comments and up to ten workflow pages/repo.
// The estimate includes known detail pagination and headroom for growth/retries.
export function estimateFullRefreshReserve(
  cache: CacheData,
  repositories: Repository[],
) {
  let requests = 1;
  for (const repo of repositories) {
    const pulls = Object.values(
      cache.pullRequestsPerRepo[repositoryKey(repo)] || {},
    ).flat();
    requests += Math.max(1, Math.ceil(pulls.length / 100)) + 11;
    for (const pr of pulls) {
      const reviews =
        cache.reviewPerRepoPerPullNumber[repositoryKey(repo)]?.[pr.number]?.length || 0;
      requests += Math.max(1, Math.ceil(reviews / 100)) + 1;
    }
    // Comments are stored in page buckets, including their PR identity.
    const comments = Object.values(cache.mentions[repositoryKey(repo)] || {}).flat();
    requests += Math.ceil(comments.length / 100);
  }
  return Math.ceil(requests * 1.25) + 100;
}


/** Shared by full refreshes, sweeps and recap requests on one authenticated client. */
export const installGithubRequestBudget = (client: Octokit) => {
  let remaining = Infinity;
  let resetAt = 0;
  const observe = (headers: Record<string, string | number | undefined>) => {
    const value = Number(headers["x-ratelimit-remaining"]);
    const reset = Number(headers["x-ratelimit-reset"]) * 1000;
    if (Number.isFinite(value)) remaining = Math.min(remaining, value);
    if (Number.isFinite(reset) && reset > 0) resetAt = reset;
  };
  client.hook.before("request", options => {
    if (options.url.endsWith("/rate_limit") || options.url === "/rate_limit") return;
    if (resetAt && Date.now() >= resetAt) { remaining = Infinity; resetAt = 0; }
    if (remaining <= 100) {
      throw Object.assign(new Error("GitHub request budget reserved. Updates will resume after the quota resets."), {
        status: 429, response: { headers: { "retry-after": String(Math.max(60, Math.ceil((resetAt - Date.now()) / 1000))) } },
      });
    }
    remaining--;
  });
  client.hook.after("request", response => {
    // A fresh quota check starts a new observation window, including after reset.
    if (response.url?.endsWith("/rate_limit")) remaining = Infinity;
    observe(response.headers);
  });
  client.hook.error("request", error => {
    if ("response" in error && error.response) observe(error.response.headers);
    throw error;
  });
};
