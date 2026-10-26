jest.mock("electron", () => ({
  ipcMain: new (jest.requireActual("node:events").EventEmitter)(),
}));
jest.mock("@octokit/rest", () => {
  const Octokit = Object.assign(jest.fn(), { plugin: () => Octokit });
  return { Octokit };
});
jest.mock("@octokit/plugin-throttling", () => ({ throttling: {} }));
jest.mock("electron-log", () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock("../safeStorage/safeStorage", () => ({
  deleteData: jest.fn(),
  deleteDataOrThrow: jest.fn().mockResolvedValue(true),
  getData: jest.fn(),
  storeData: jest.fn().mockResolvedValue(true),
}));
jest.mock("../polling/refreshCoordinator", () => ({
  refreshCoordinator: { invalidate: jest.fn() },
}));
jest.mock("./PullRequests/utils/getDefaultData", () => ({ setLocalCache: jest.fn() }));
jest.mock("./Repositories/utils/getDefaultData", () => ({ setLocalCache: jest.fn() }));

import { ipcMain } from "electron";
import { Octokit } from "@octokit/rest";
import { signOut, initGithubClient } from "./githubClient";
import { deleteDataOrThrow, getData, storeData } from "../safeStorage/safeStorage";

beforeEach(() => jest.clearAllMocks());

it("preserves repository selections when authentication expires while clearing session data", async () => {
  expect(await signOut({ preserveRepositorySelections: true })).toBe(true);
  expect(deleteDataOrThrow).not.toHaveBeenCalledWith("active_repositories");
  for (const key of ["access_token", "auth_type", "user", "pull_requests_cache", "repositories_cache"]) {
    expect(deleteDataOrThrow).toHaveBeenCalledWith(key);
  }
});

it("still clears selections on explicit sign-out", async () => {
  expect(await signOut()).toBe(true);
  expect(deleteDataOrThrow).toHaveBeenCalledWith("active_repositories");
});

describe("rejected credential recovery", () => {
  const validate = jest.fn();
  const hookError = jest.fn();
  let values: Record<string, unknown>;

  beforeEach(async () => {
    await signOut();
    jest.clearAllMocks();
    values = { access_token: "old-token", auth_type: "pat" };
    (getData as jest.Mock).mockImplementation(async (key: string) => values[key] ?? null);
    (deleteDataOrThrow as jest.Mock).mockImplementation(async (key: string) => {
      delete values[key];
      return true;
    });
    (storeData as jest.Mock).mockImplementation(async ({ name, data }) => {
      values[name] = data;
      return true;
    });
    validate.mockReset().mockResolvedValue({});
    hookError.mockReset();
    (Octokit as unknown as jest.Mock).mockImplementation(() => ({
      users: { getAuthenticated: validate },
      hook: { error: hookError, before: jest.fn(), after: jest.fn() },
    }));
    jest.spyOn(ipcMain, "emit");
  });

  afterEach(() => jest.restoreAllMocks());

  it("explains a rejected PAT on startup, preserves selections, and accepts a replacement", async () => {
    validate.mockRejectedValueOnce({ status: 401 });
    const initializing = initGithubClient();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(values.authentication_notice).toContain("may have expired or been revoked");
    expect(deleteDataOrThrow).not.toHaveBeenCalledWith("active_repositories");
    expect(ipcMain.emit).toHaveBeenCalledWith("dispatch-application-sign-user", null, false);
    expect(ipcMain.emit).toHaveBeenCalledWith("show-authentication-required");

    values.access_token = "replacement-token";
    values.auth_type = "pat";
    ipcMain.emit("github-token-ready");
    await initializing;
    expect(Octokit).toHaveBeenLastCalledWith(expect.objectContaining({ auth: "replacement-token" }));
  });

  it.each([403, 429, 500, undefined])("keeps credentials when validation fails with %s", async (status) => {
    validate.mockRejectedValueOnce({ status });
    await expect(initGithubClient()).rejects.toEqual({ status });
    expect(values.access_token).toBe("old-token");
    expect(storeData).not.toHaveBeenCalled();
    expect(ipcMain.emit).not.toHaveBeenCalledWith("authentication-required");
  });

  it("notifies the UI when a running request rejects the PAT but ignores permission failures", async () => {
    await initGithubClient();
    const onError = hookError.mock.calls.at(-1)![1];
    await expect(onError({ status: 403 })).rejects.toEqual({ status: 403 });
    expect(storeData).not.toHaveBeenCalled();
    await expect(onError({ status: 401 })).rejects.toThrow("Authentication failed");
    expect(values.authentication_notice).toContain("personal access token");
    expect(ipcMain.emit).toHaveBeenCalledWith("authentication-required");
    expect(ipcMain.emit).toHaveBeenCalledWith("show-authentication-required");
    expect(values.access_token).toBeUndefined();
  });
});
