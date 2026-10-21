import { installGithubRequestBudget } from "./githubRequestBudget";

const setup = () => {
  const before = jest.fn(), after = jest.fn(), error = jest.fn();
  installGithubRequestBudget({ hook: { before, after, error } } as never);
  const observe = (resource: string, remaining: number, url = "/repos/org/repo/pulls") =>
    after.mock.calls[0][1]({ headers: {
      "x-ratelimit-resource": resource,
      "x-ratelimit-remaining": String(remaining),
      "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
    } }, { url });
  return { observe, guard: (url: string) => before.mock.calls[0][1]({ url }) };
};
it("reserves core requests while allowing Search and quota recovery", () => {
  const { observe, guard } = setup();
  observe("core", 101);
  guard("/repos/org/repo/pulls");
  expect(() => guard("/repos/org/repo/pulls")).toThrow("request budget");
  expect(() => guard("/search/issues")).not.toThrow();
  expect(() => guard("/rate_limit")).not.toThrow();
  observe("core", 5000, "/rate_limit");
  expect(() => guard("/repos/org/repo/pulls")).not.toThrow();
});
it("does not apply the core reserve to Search or poison core with Search responses", () => {
  const { observe, guard } = setup();
  observe("core", 5000);
  observe("search", 2, "/search/issues");
  guard("/search/issues");
  guard("/search/issues");
  expect(() => guard("/search/issues")).toThrow("request budget");
  expect(() => guard("/repos/org/repo/pulls")).not.toThrow();
});
it("recovers each resource independently when its quota resets", () => {
  jest.useFakeTimers();
  try {
    const { observe, guard } = setup();
    observe("search", 0, "/search/issues");
    observe("core", 100);
    jest.advanceTimersByTime(3601000);
    expect(() => guard("/search/issues")).not.toThrow();
    expect(() => guard("/repos/org/repo/pulls")).not.toThrow();
  } finally { jest.useRealTimers(); }
});
