import { expect, jest, test } from "@jest/globals";
const search = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const paginate = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const listReviews = jest.fn();
jest.mock("../../src/mainProcess/api/githubClient", () => ({ getGithubClient: async () => ({ rest: { search: { issuesAndPullRequests: search }, pulls: { listReviews } }, paginate }) }));
jest.mock("../../src/mainProcess/api/User/getUser", () => ({ getUser: async () => ({ id: 1 }) }));
import { getPersonalWeeklyRecap } from "../../src/mainProcess/api/WeeklyRecap/personalWeeklyRecap";

test("counts only the current user's submitted reviews, uses pagination, and caches repeated requests", async () => {
  search.mockImplementation(async (...args) => {
    const { q } = args[0] as { q: string };
    return { data: { total_count: q.includes("reviewed-by") ? 1 : 0, items: q.includes("reviewed-by") ? [{ number: 1, repository_url: "https://api.github.com/repos/org/repo" }] : [] } };
  });
  paginate.mockResolvedValue(Array.from({ length: 101 }, (_, i) => ({ submitted_at: "2026-10-13T12:00:00Z", user: { id: i === 0 || i === 100 ? 1 : 2, type: "User" } })));
  const recap = await getPersonalWeeklyRecap("2026-10-12");
  expect(recap.reviewedCount).toBe(2);
  expect(paginate).toHaveBeenCalledWith(listReviews, expect.objectContaining({ per_page: 100 }));
  expect((await getPersonalWeeklyRecap("2026-10-12")).reviewedCount).toBe(2);
  expect(paginate).toHaveBeenCalledTimes(1);
});

test("does not publish a misleading count when search is truncated", async () => {
  search.mockResolvedValue({ data: { total_count: 1001, items: [] } });
  await expect(getPersonalWeeklyRecap("2026-10-05")).rejects.toThrow("search limit");
});
