// Audit characterizations: assertions reproduce current defects; these are not
// regression guarantees. Run explicitly with the refresh Jest configuration.
import { expect, test } from "@jest/globals";
import { writeFileSync } from "node:fs";
import { createHarness } from "./harness";
import { createProfile } from "./fixtures";
import { MockGithub } from "./mock-github";

const results: unknown[] = [];
test("disabled CI setting suppresses native CI messages", async () => {
  const repos = createProfile("small");
  Object.assign(repos[0], { openPulls: 1, workflowRuns: 1 });
  const github = new MockGithub(repos, 0);
  const h = await createHarness(github);
  try {
    const cold = await h.run("audit/ci-baseline");
    // All notifications are disabled, and the old run failed while GitHub now
    // returns success. No real GitHub requests or native notifications occur.
    h.values.notifications = Object.fromEntries([
      "pullRequestsAddedNotification", "pullRequestsRemovedNotification", "newReviewsNotification",
      "reviewsUpdateNotification", "ciStatusNotification", "mentionsNotification",
    ].map(key => [key, { value: false }])) as never;
    const cache = structuredClone(cold.data);
    cache.actionsPerRepo[repos[0].name][0].conclusion = "failure";
    h.setCache(cache);
    repos[0].workflowRuns = 2; // Change the server response/ETag, not just the local fixture.
    h.notifications.mockClear();
    const warm = await h.run("audit/ci-disabled");
    const alerts = h.notifications.mock.calls.flatMap(([items]) => items).filter(item => item.type === "ci");
    expect(alerts.length).toBe(0);
    expect(Object.keys(warm.data.CIStatusUpdatePerRepo)).toHaveLength(0);
    results.push({ scenario: "CI disabled", expectedAlerts: 0, actualAlerts: alerts.length });
  } finally { await h.close(); }
});

test("disabled repositories receive no comment-detail requests", async () => {
  const github = new MockGithub(createProfile("small"), 0);
  const h = await createHarness(github);
  try {
    await h.run("audit/disable-baseline");
    h.values.active_repositories = Object.fromEntries(github.repositories.map(repo => [repo.id, false]));
    const { setLocalCache } = await import("../../src/mainProcess/api/Repositories/utils/getDefaultData");
    setLocalCache(null);
    const result = await h.run("audit/disabled");
    const detailCalls = result.samples.filter(call => call.operation === "issues-list-comments");
    expect(detailCalls.length).toBe(0);
    results.push({ scenario: "Disabled repositories", expectedCommentRequests: 0, actualCommentRequests: detailCalls.length });
    writeFileSync("docs/audit/refresh-reproductions.json", JSON.stringify(results, null, 2) + "\n");
  } finally { await h.close(); }
});
