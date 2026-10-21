jest.mock("electron-log", () => ({ log: jest.fn() }));
jest.mock("../../../../safeStorage/safeStorage", () => ({ getData: jest.fn() }));
import { getData } from "../../../../safeStorage/safeStorage";
import { getCachedData, setLocalCache } from "../getDefaultData";
it("rebuilds legacy derived caches rather than guessing ambiguous repository identities", async () => {
  const legacy = { flatPullRequests: [{ id: 1 }], pullRequestsPerRepo: { api: {} } };
  jest.mocked(getData).mockResolvedValue(legacy as never); setLocalCache(null);
  expect((await getCachedData()).flatPullRequests).toEqual([]);
  expect((await getCachedData()).schemaVersion).toBe(2);
  expect(legacy.flatPullRequests).toEqual([{ id: 1 }]);
});

it("does not reuse mutable default caches across accounts or failed initial loads", async () => {
  jest.mocked(getData).mockResolvedValue(null); setLocalCache(null);
  const first = await getCachedData(); first.pullRequestsPerRepo["private/repo"] = {};
  expect((await getCachedData()).pullRequestsPerRepo).toEqual({});
});
