// Regression coverage for full PR pagination and conditional requests.
import { expect, jest, test } from "@jest/globals";
import { createHarness } from "./harness";
import { createProfile } from "./fixtures";
import { MockGithub } from "./mock-github";

test("shrinking PR pagination removes closed PRs from the published list", async () => {
  const repos = createProfile("small");
  Object.assign(repos[0], { openPulls: 101, commentsPerPull: 0, workflowRuns: 0 });
  const github = new MockGithub(repos, 0);
  const h = await createHarness(github);
  try {
    expect((await h.run("reaudit/pagination/setup")).data.flatPullRequests).toHaveLength(101);
    repos[0].openPulls = 1;
    // Closed PRs remain valid detail endpoints on GitHub. The stock transport
    // models only open PRs, so provide unchanged cached detail responses here.
    jest.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (/\/(issues|pulls)\/101\/(comments|reviews)/.test(url)) {
        const response = new Response(null, { status: 304, headers: { "x-ratelimit-remaining": "5000" } });
        Object.defineProperty(response, "url", { value: url }); return response;
      }
      return github.fetch(input, init);
    });
    const next = await h.run("reaudit/pagination/shrink");
    expect(next.data.flatPullRequests).toHaveLength(1);
    expect(next.data.flatPullRequests.map(pr => pr.number).sort((a, b) => a-b)).toEqual([1]);
  } finally { await h.close(); }
});

test("first-page 304 still refreshes a changed second page", async () => {
  const repos = createProfile("small");
  Object.assign(repos[0], { openPulls: 101, commentsPerPull: 0, workflowRuns: 0 });
  const github = new MockGithub(repos, 0), h = await createHarness(github);
  try {
    await h.run("reaudit/304/setup");
    github.requestedReviewers.set(`${repos[0].owner}/${repos[0].name}/101`, [1]);
    const next = await h.run("reaudit/304/second-page-change");
    expect(next.samples.filter(s => s.operation === "pull-list-requests")).toHaveLength(2);
    expect(next.data.flatPullRequests.find(pr => pr.number === 101)?.requested_reviewers?.map(user => user.id)).toEqual([1]);
  } finally { await h.close(); }
});
