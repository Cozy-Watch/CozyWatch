import { expect, test } from "@jest/globals";
import { createHarness } from "./harness";
import { createProfile } from "./fixtures";
import { MockGithub } from "./mock-github";

test.each(["missing", "legacy"])("%s cache hydrates silently, survives restart, and still notifies new reviews", async kind => {
  const repos = createProfile("small");
  Object.assign(repos[0], { openPulls: 1, workflowRuns: 0 });
  const h = await createHarness(new MockGithub(repos, 0));
  try {
    h.values.notifications = {
      newReviewsNotification: { value: true }, reviewsUpdateNotification: { value: true },
      pullRequestsAddedNotification: { value: true }, mentionsNotification: { value: true },
    } as never;
    h.values.pull_requests_cache = kind === "missing" ? null : { schemaVersion: 1 } as never;
    h.setCache(null);
    h.notifications.mockClear();
    const cold = await h.run("baseline/upgrade");
    expect(cold.data.flatPullRequests).toHaveLength(1);
    expect(h.notifications.mock.calls.flatMap(([items]) => items)).toEqual([]);
    h.setCache(null); // Same persisted cache, fresh in-memory snapshot.
    h.notifications.mockClear();
    await h.run("baseline/restart");
    expect(h.notifications.mock.calls.flatMap(([items]) => items)).toEqual([]);
    repos[0].reviewsPerPull = 2;
    h.notifications.mockClear();
    await h.run("baseline/new-review");
    expect(h.notifications.mock.calls.flatMap(([items]) => items).some(item => item.type === "review")).toBe(true);
  } finally { await h.close(); }
});
