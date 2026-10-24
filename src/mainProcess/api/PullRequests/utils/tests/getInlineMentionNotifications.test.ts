import { getInlineMentionNotifications } from "../getInlineMentionNotifications";
import { createEmptyCache } from "./mocks/syntheticCache.mock";
const user = { id: 1, login: "alex" };
const comment = { body: "@alex please review", html_url: "https://github.com/org/repo/pull/4#discussion_r5", pull_request_url: "https://api.github.com/repos/org/repo/pulls/4", user: { id: 2, login: "sam" } };
it("notifies for a new inline mention, preserving the exact discussion link", () => {
  const initial = createEmptyCache(), final = createEmptyCache();
  initial.reviewCommentsPerRepo["org/repo"] = [];
  final.reviewCommentsPerRepo["org/repo"] = [comment as never];
  expect(getInlineMentionNotifications(initial, final, user)).toEqual([expect.objectContaining({ url: comment.html_url, source: { repository: "org/repo", pullNumber: 4 } })]);
  expect(getInlineMentionNotifications(final, final, user)).toEqual([]);
  expect(getInlineMentionNotifications(createEmptyCache(), final, user)).toEqual([]);
  expect(getInlineMentionNotifications(initial, final, { ...user, id: 2 })).toEqual([]);
});
