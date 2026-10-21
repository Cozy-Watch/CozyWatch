// Integration regression coverage for comment pagination.
import { expect, test } from "@jest/globals";
import { createHarness } from "./harness";
import { createProfile } from "./fixtures";
import { MockGithub } from "./mock-github";

test("first-page 304 still fetches new comments on page two", async () => {
  const repos = createProfile("small");
  Object.assign(repos[0], { openPulls: 1, commentsPerPull: 101, workflowRuns: 0 });
  const github = new MockGithub(repos, 0), h = await createHarness(github);
  try {
    const cold = await h.run("third-audit/comment-setup");
    const repo = `${repos[0].owner}/${repos[0].name}`;
    expect(Object.values(cold.data.mentions[repo]).flat()).toHaveLength(101);
    repos[0].commentsPerPull = 102;
    const next = await h.run("third-audit/comment-add");
    expect(next.samples.filter(sample => sample.operation === "issues-list-comments")).toHaveLength(2);
    expect(Object.values(next.data.mentions[repo]).flat()).toHaveLength(102);
  } finally { await h.close(); }
});

test("shrinking and empty comment lists discard obsolete cached pages", async () => {
  const repos = createProfile("small");
  Object.assign(repos[0], { openPulls: 1, commentsPerPull: 101, workflowRuns: 0 });
  const github = new MockGithub(repos, 0), h = await createHarness(github);
  try {
    await h.run("comments/shrink-setup");
    const repo = `${repos[0].owner}/${repos[0].name}`;
    repos[0].commentsPerPull = 1;
    expect(Object.values((await h.run("comments/shrink")).data.mentions[repo]).flat()).toHaveLength(1);
    repos[0].commentsPerPull = 0;
    expect(Object.values((await h.run("comments/empty")).data.mentions[repo]).flat()).toHaveLength(0);
  } finally { await h.close(); }
});
