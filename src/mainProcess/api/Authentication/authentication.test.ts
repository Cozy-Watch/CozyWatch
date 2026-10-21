jest.mock("electron", () => ({ ipcMain: { emit: jest.fn() } }));
jest.mock("electron-log", () => ({ error: jest.fn() }));
jest.mock("@octokit/auth-oauth-device", () => ({ createOAuthDeviceAuth: jest.fn() }));
jest.mock("@octokit/rest", () => ({ Octokit: jest.fn(() => ({ request: async () => ({}) })) }));
jest.mock("../../safeStorage/safeStorage", () => ({ getData: jest.fn() }));
jest.mock("../../licensing/licenseState", () => ({ completeGitHubConnection: jest.fn() }));
jest.mock("../../security/externalUrl", () => ({ tryOpenExternalUrl: jest.fn() }));
jest.mock("./authenticationCodeNotification", () => ({ clearAuthenticationCodeNotification: jest.fn(), showAuthenticationCodeNotification: jest.fn() }));
import { ipcMain } from "electron";
import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";
import { authenticateWithPAT, authenticateWithGitHub, authenticateWithGitHubApp, cancelAuthentication } from "./authentication";
import { completeGitHubConnection } from "../../licensing/licenseState";

beforeEach(() => {
  jest.clearAllMocks(); cancelAuthentication();
  jest.mocked(completeGitHubConnection).mockResolvedValue({ status: "community", schemaVersion: 2 });
  jest.mocked(createOAuthDeviceAuth).mockReturnValue(jest.fn(async () => ({ token: "synthetic-token" })) as never);
});
it.each(["pat", "oauth", "github-app"])("publishes %s sign-in only after the atomic setup commit succeeds", async mode => {
  const run = () => mode === "pat" ? authenticateWithPAT("synthetic-token") : mode === "oauth" ? authenticateWithGitHub() : authenticateWithGitHubApp();
  jest.mocked(completeGitHubConnection).mockRejectedValueOnce(new Error("Disk full"));
  const failed = await run();
  expect(mode === "pat" ? (failed as { valid: boolean }).valid : failed).toBe(false);
  expect(ipcMain.emit).not.toHaveBeenCalledWith("dispatch-application-sign-user", null, true);
  const success = await run();
  expect(mode === "pat" ? (success as { valid: boolean }).valid : success).toBe(true);
  expect(completeGitHubConnection).toHaveBeenLastCalledWith("synthetic-token", mode, expect.any(Function));
  expect(ipcMain.emit).toHaveBeenCalledWith("dispatch-application-sign-user", null, true);
});
it("blocks overlapping connection methods and ignores a cancelled device response", async () => {
  let finish: (value: { token: string }) => void = () => undefined;
  jest.mocked(createOAuthDeviceAuth).mockReturnValueOnce(jest.fn(() => new Promise(resolve => { finish = resolve; })) as never);
  const pending = authenticateWithGitHub();
  expect((await authenticateWithPAT("another-token")).valid).toBe(false);
  cancelAuthentication();
  expect((await authenticateWithPAT("new-token")).valid).toBe(true);
  jest.mocked(completeGitHubConnection).mockClear();
  finish({ token: "old-token" });
  expect(await pending).toBe(false);
  expect(completeGitHubConnection).not.toHaveBeenCalled();
});
