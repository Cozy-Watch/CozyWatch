jest.mock("electron", () => ({ ipcMain: { emit: jest.fn() } }));
jest.mock("electron-log", () => ({ info: jest.fn(), log: jest.fn() }));
jest.mock("../../../safeStorage/safeStorage", () => ({ getData: jest.fn(async () => ({})), storeData: jest.fn(async () => true) }));
jest.mock("../../githubClient", () => ({ getGithubClient: jest.fn(), isPATAuth: () => true }));
jest.mock("../utils/getDefaultData", () => ({ getCachedData: jest.fn(async () => ({ activeRepositories: {}, repositoriesByPage: {} })), setLocalCache: jest.fn() }));
import { ipcMain } from "electron";
import { repositoriesQuery } from "./repositoriesQuery";
import { getGithubClient } from "../../githubClient";
import { setLocalCache } from "../utils/getDefaultData";
import { refreshCoordinator } from "../../../polling/refreshCoordinator";
const repo = (id: number) => ({ id, name: `repo-${id}`, url: "", html_url: "", description: "", owner: { login: "org", avatar_url: "" } });
beforeEach(() => { jest.clearAllMocks(); refreshCoordinator.invalidate(); });
it("refreshes later repository pages behind a first-page 304 and truncates obsolete pages", async () => {
  let phase = "initial";
  const request = jest.fn(async ({ page }: { page: number }) => {
    if (phase === "changed" && page === 1) throw Object.assign(new Error("Unchanged"), { status: 304 });
    return { data: phase === "empty" ? [] : [repo(page === 1 ? 1 : phase === "changed" ? 3 : 2)], headers: { etag: `page-${page}`, ...(page === 1 && phase !== "empty" ? { link: '<next>; rel="next"' } : {}) } };
  });
  jest.mocked(getGithubClient).mockResolvedValue({ repos: { listForAuthenticatedUser: request } } as never);
  await repositoriesQuery(); phase = "changed"; request.mockClear();
  expect(Object.values((await repositoriesQuery()).repositoriesByPage ?? {}).flat().map(repo => repo.id)).toEqual([1, 3]);
  expect(request).toHaveBeenCalledTimes(2);
  phase = "empty";
  expect(Object.values((await repositoriesQuery()).repositoriesByPage ?? {}).flat()).toEqual([]);
});
it("does not publish repository discovery from a cancelled account session", async () => {
  let finish: (value: unknown) => void = () => undefined;
  jest.mocked(getGithubClient).mockResolvedValue({ repos: { listForAuthenticatedUser: () => new Promise(resolve => { finish = resolve; }) } } as never);
  const pending = repositoriesQuery();
  await new Promise(resolve => setImmediate(resolve));
  refreshCoordinator.invalidate();
  finish({ data: [repo(1)], headers: {} });
  await expect(pending).rejects.toThrow("cancelled");
  expect(setLocalCache).not.toHaveBeenCalled();
  expect(ipcMain.emit).not.toHaveBeenCalled();
});
