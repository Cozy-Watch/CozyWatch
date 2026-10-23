import { expect, test, jest } from "@jest/globals";
import { createHarness } from "./harness";
import { createProfile } from "./fixtures";
import { MockGithub } from "./mock-github";

const freeze = (value: unknown): void => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  Object.values(value).forEach(freeze);
};

test("refresh preserves old immutable payloads while detecting changed reviews", async () => {
  const repos = createProfile("small");
  Object.assign(repos[0], { openPulls: 1, workflowRuns: 1 });
  const github = new MockGithub(repos, 0);
  const h = await createHarness(github);
  try {
    h.values.notifications = { reviewsUpdateNotification: { value: true } } as never;
    const cold = await h.run("memory/baseline");
    const original = structuredClone(cold.data);
    freeze(cold.data);
    h.setCache(cold.data);
    github.approve(repos[0], 1);
    const changed = await h.run("memory/approval");
    expect(cold.data).toEqual(original);
    expect(changed.data.reviewPerRepoPerPullNumber[`${repos[0].owner}/${repos[0].name}`]["1"][0].state).toBe("APPROVED");
    expect(changed.data.reviewUpdateList.reviewChanged.length + changed.data.reviewUpdateList.newReview.length).toBeGreaterThan(0);
  } finally { await h.close(); }
});


test("cleanup preserves mixed-case mention fallback during a failed GitHub refresh", async () => {
  const { retainActivePullData } = await import("../../src/mainProcess/api/PullRequests/utils/retainActivePullData");
  const { fetchRecentReviewComments } = await import("../../src/mainProcess/api/PullRequests/queries/recentReviewCommentsQuery");
  const { getCachedData } = await import("../../src/mainProcess/api/PullRequests/utils/getDefaultData");
  const cache = await getCachedData();
  const comment = {
    body: "@reader please review", updated_at: new Date().toISOString(),
    html_url: "https://github.com/Cozy-Watch/CozyWatch/pull/1#discussion_r1",
    pull_request_url: "https://api.github.com/repos/Cozy-Watch/CozyWatch/pulls/1",
  };
  cache.reviewCommentsPerRepo = { "Cozy-Watch/CozyWatch": [comment as never] };
  const pruned = retainActivePullData(cache, ["cozy-watch/cozywatch"]);
  const client = {
    paginate: jest.fn<() => Promise<never>>().mockRejectedValue(new Error("offline")),
    pulls: { listReviewCommentsForRepo: jest.fn() },
  };
  await fetchRecentReviewComments(client as never, [{ owner: "Cozy-Watch", name: "CozyWatch" } as never], pruned);
  expect(pruned.reviewCommentsPerRepo["Cozy-Watch/CozyWatch"]).toEqual([comment]);
  expect(cache.reviewCommentsPerRepo["Cozy-Watch/CozyWatch"]).toEqual([comment]);
});
