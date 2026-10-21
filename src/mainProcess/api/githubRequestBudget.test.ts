import { installGithubRequestBudget } from "./githubRequestBudget";
it("shares the quota reserve across request types while allowing quota recovery checks", () => {
  const before = jest.fn(), after = jest.fn(), error = jest.fn();
  installGithubRequestBudget({ hook: { before, after, error } } as never);
  const observe = after.mock.calls[0][1], guard = before.mock.calls[0][1];
  observe({ url: "https://api.github.com/rate_limit", headers: { "x-ratelimit-remaining": "101", "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600) } });
  guard({ url: "/repos/org/repo/pulls" });
  expect(() => guard({ url: "/search/issues" })).toThrow("request budget");
  expect(() => guard({ url: "/rate_limit" })).not.toThrow();
  observe({ url: "https://api.github.com/rate_limit", headers: { "x-ratelimit-remaining": "5000" } });
  expect(() => guard({ url: "/search/issues" })).not.toThrow();
});
