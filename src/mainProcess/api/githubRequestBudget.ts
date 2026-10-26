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


/** Quotas are independent: Search must never consume the core reserve. */
export const installGithubRequestBudget = (client: Octokit) => {
  const budgets = new Map<string, { remaining: number; resetAt: number }>();
  const resourceFor = (url: string) =>
    new URL(url, "https://api.github.com").pathname.startsWith("/search/") ? "search" : "core";
  const observe = (headers: Record<string, string | number | undefined>, url: string, fresh = false) => {
    const resource = String(headers["x-ratelimit-resource"] || resourceFor(url));
    const value = Number(headers["x-ratelimit-remaining"]);
    if (!Number.isFinite(value)) return;
    const reset = Number(headers["x-ratelimit-reset"]) * 1000;
    const previous = budgets.get(resource);
    budgets.set(resource, {
      remaining: fresh || !previous || (previous.resetAt > 0 && Date.now() >= previous.resetAt)
        ? value : Math.min(previous.remaining, value),
      resetAt: Number.isFinite(reset) && reset > 0 ? reset : previous?.resetAt || 0,
    });
  };
  client.hook.before("request", options => {
    const path = new URL(options.url, "https://api.github.com").pathname;
    if (path === "/rate_limit") return;
    const resource = resourceFor(options.url);
    const budget = budgets.get(resource);
    if (!budget) return;
    if (budget.resetAt && Date.now() >= budget.resetAt) {
      budgets.delete(resource);
      return;
    }
    const reserve = resource === "core" ? 100 : 0;
    if (budget.remaining <= reserve) {
      throw Object.assign(new Error("GitHub request budget reserved. Updates will resume after the quota resets."), {
        status: 429, response: { headers: { "retry-after": String(Math.max(60, Math.ceil((budget.resetAt - Date.now()) / 1000))) } },
      });
    }
    budget.remaining--;
  });
  client.hook.after("request", (response, options) => {
    observe(response.headers, options.url, new URL(options.url, "https://api.github.com").pathname === "/rate_limit");
  });
  client.hook.error("request", (error, options) => {
    if ("response" in error && error.response) observe(error.response.headers, options.url);
    throw error;
  });
};
