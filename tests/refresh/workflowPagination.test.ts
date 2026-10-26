// Integration regression coverage for workflow pagination.
import { expect, test } from "@jest/globals";
import { createHarness } from "./harness";
import { createProfile } from "./fixtures";
import { MockGithub } from "./mock-github";

test("first-page 304 still fetches workflow transitions on page two", async () => {
  const repos = createProfile("small");
  Object.assign(repos[0], { openPulls: 1, commentsPerPull: 0, workflowRuns: 101 });
  const github = new MockGithub(repos, 0), h = await createHarness(github);
  let changed = false;
  try {
    const { jest } = await import("@jest/globals");
    jest.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
      const response = await github.fetch(input, init);
      const url = new URL(String(input));
      if (!url.pathname.endsWith("/actions/runs") || url.searchParams.get("page") !== "2") return response;
      const body = await response.json() as { workflow_runs: { updated_at: string; conclusion: string }[] };
      body.workflow_runs[0].updated_at = "2026-10-21T12:00:00Z";
      body.workflow_runs[0].conclusion = changed ? "failure" : "success";
      const next = new Response(JSON.stringify(body), { status: 200, headers: { ...Object.fromEntries(response.headers), etag: changed ? '"changed-page-two"' : '"page-two"' } });
      Object.defineProperty(next, "url", { value: String(input) }); return next;
    });
    const cold = await h.run("third-audit/workflow-setup");
    const repo = `${repos[0].owner}/${repos[0].name}`;
    const id = repos[0].id * 100000 + 100;
    expect(cold.data.actionsPerRepo[repo].find(run => run.id === id)?.conclusion).toBe("success");
    changed = true;
    const next = await h.run("third-audit/workflow-changed");
    expect(next.samples.filter(sample => sample.operation === "pull-actions-requests")).toHaveLength(2);
    expect(next.data.actionsPerRepo[repo].find(run => run.id === id)?.conclusion).toBe("failure");
  } finally { await h.close(); }
});
