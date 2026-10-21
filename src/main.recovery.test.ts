import { EventEmitter } from "node:events";

const handlers = new Map<string, (...args: unknown[]) => unknown>();
const ipc = Object.assign(new EventEmitter(), {
  handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
    handlers.set(channel, handler);
  },
});
let licenseStatus: "community" | "trial-ended" = "community";
const hasLocalAccessToken = jest.fn(async () => true);
const getRepositories = jest.fn(async () => undefined);
const startPolling = jest.fn();
const stopPolling = jest.fn();
const disableDerivedCacheWrites = jest.fn();
const enableDerivedCacheWrites = jest.fn();
const signOut = jest.fn(async () => true);
const webContents = {
  on: jest.fn(),
  once: jest.fn(),
  send: jest.fn(),
  isDestroyed: () => false,
  isLoading: () => false,
};
const event = { sender: webContents };
let main: typeof import("./main");
let processOn: jest.SpyInstance;

beforeAll(async () => {
  // Exercise the real main-process event wiring without launching Electron.
  Object.assign(globalThis, { MAIN_WINDOW_VITE_DEV_SERVER_URL: "http://localhost:5173" });
  processOn = jest.spyOn(process, "on").mockReturnValue(process);
  jest.doMock("electron", () => ({
    protocol: { registerSchemesAsPrivileged: jest.fn() },
    app: {
      isPackaged: true,
      getVersion: () => "test",
      on: jest.fn(),
      whenReady: () => new Promise(() => undefined),
    },
    ipcMain: ipc,
    BrowserWindow: jest.fn(() => ({
      webContents,
      on: jest.fn(),
      once: jest.fn(),
      loadURL: jest.fn().mockResolvedValue(undefined),
      show: jest.fn(),
      focus: jest.fn(),
      isDestroyed: () => false,
    })),
  }));
  jest.doMock("electron-log/main", () => ({
    initialize: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn(),
  }));
  jest.doMock("electron-squirrel-startup", () => false);
  jest.doMock("./mainProcess/api/Authentication/authentication", () => ({ hasLocalAccessToken }));
  jest.doMock("./mainProcess/licensing/licenseState", () => ({ getLicenseState: jest.fn(async () => ({ schemaVersion: 2, status: licenseStatus })) }));
  jest.doMock("./mainProcess/api/githubClient", () => ({ signOut }));
  jest.doMock("./mainProcess/api/Repositories/getRepositories", () => ({ getRepositories }));
  jest.doMock("./mainProcess/polling/pollGithub", () => ({ startPolling, stopPolling }));
  jest.doMock("./mainProcess/safeStorage/safeStorage", () => ({
    disableDerivedCacheWrites, enableDerivedCacheWrites,
  }));
  jest.doMock("./mainProcess/diagnostics/diagnostics", () => ({
    performanceDiagnostics: { record: jest.fn(), attachWebContents: jest.fn() },
  }));
  jest.doMock("./mainProcess/security/ipcSender", () => ({ isTrustedRendererSender: () => true }));
  jest.doMock("./mainProcess/security/externalUrl", () => ({ protectWebContents: jest.fn() }));
  jest.doMock("./mainProcess/appUpdate/appUpdate", () => ({ appUpdate: jest.fn() }));
  jest.doMock("./mainProcess/menu/menu", () => ({ createMenu: jest.fn() }));
  jest.doMock("./mainProcess/api/LemonSqueezy/validateLicense", () => ({
    validateLicense: jest.fn(async () => undefined),
  }));
  jest.doMock("./mainProcess/notifications/notificationManager", () => ({
    clearNotificationsOnSignOut: jest.fn(async () => undefined),
    cancelPendingNotifications: jest.fn(),
  }));
  for (const module of [
    "./mainProcess/api/LemonSqueezy/activateLicense",
    "./mainProcess/api/LemonSqueezy/deactivateLicense",
    "./mainProcess/api/PullRequests/getPullRequests",
    "./mainProcess/api/PullRequests/mergePullRequest",
    "./mainProcess/api/Repositories/setRepositoryEnableState",
    "./mainProcess/api/User/getUser",
    "./mainProcess/api/WeeklyRecap/personalWeeklyRecap",
    "./mainProcess/menubar/menubar",
    "./mainProcess/notifications/getNotificationSettings",
    "./mainProcess/notifications/setNotificationSettings",
    "./mainProcess/notifications/setToggleAllNotifications",
  ]) {
    jest.doMock(module, () => ({}));
  }
  main = await import("./main");
  main.createWindow();
  await handlers.get("diagnostics-renderer-ready")!(event);
  // Allow the initial authentication check to finish.
  await new Promise((resolve) => setImmediate(resolve));
});

afterAll(() => {
  processOn.mockRestore();
  Reflect.deleteProperty(globalThis, "MAIN_WINDOW_VITE_DEV_SERVER_URL");
});

it("restarts background work after a rejected token is replaced, without duplicate starts", async () => {
  expect(startPolling).toHaveBeenCalledTimes(1);
  expect(getRepositories).toHaveBeenCalledTimes(1);

  ipc.emit("authentication-required");
  expect(stopPolling).toHaveBeenCalledTimes(1);
  expect(disableDerivedCacheWrites).toHaveBeenCalledTimes(1);

  ipc.emit("dispatch-application-sign-user", null, true);
  await new Promise((resolve) => setImmediate(resolve));
  expect(enableDerivedCacheWrites).toHaveBeenCalledTimes(1);
  expect(startPolling).toHaveBeenCalledTimes(2);
  expect(getRepositories).toHaveBeenCalledTimes(2);

  ipc.emit("dispatch-application-sign-user", null, true);
  await new Promise((resolve) => setImmediate(resolve));
  expect(startPolling).toHaveBeenCalledTimes(2);
});

it("also restarts after explicit sign-out and reconnect", async () => {
  const previousStarts = startPolling.mock.calls.length;
  await main.performSignOut();
  ipc.emit("dispatch-application-sign-user", null, true);
  await new Promise((resolve) => setImmediate(resolve));
  expect(startPolling).toHaveBeenCalledTimes(previousStarts + 1);
});

it.each([
  [false, "signIn"],
  [true, "overview"],
])("routes Dashboard to %s authentication's %s destination", async (authenticated, destination) => {
  hasLocalAccessToken.mockResolvedValue(authenticated as boolean);
  await handlers.get("on-application-navigate-to-route")!(event, "overview");
  expect(webContents.send).toHaveBeenLastCalledWith("navigate-to-route", { route: destination });
});

it("pauses monitoring on license expiry and resumes after activation without signing out", async () => {
  hasLocalAccessToken.mockResolvedValue(true);
  const starts = startPolling.mock.calls.length;
  const signOuts = signOut.mock.calls.length;
  licenseStatus = "trial-ended";
  ipc.emit("dispatch-license-state", null, { schemaVersion: 2, status: licenseStatus });
  ipc.emit("dispatch-application-sign-user", null, true);
  await new Promise((resolve) => setImmediate(resolve));
  expect(startPolling).toHaveBeenCalledTimes(starts);
  expect(signOut).toHaveBeenCalledTimes(signOuts);
  licenseStatus = "community";
  ipc.emit("dispatch-license-state", null, { schemaVersion: 2, status: licenseStatus });
  await new Promise((resolve) => setImmediate(resolve));
  expect(startPolling).toHaveBeenCalledTimes(starts + 1);
  expect(signOut).toHaveBeenCalledTimes(signOuts);
});


it("does not feed Vite-forwarded renderer logs back into the logger", async () => {
  const log = (await import("electron-log/main")).default;
  const listener = webContents.on.mock.calls.find(([name]) => name === "console-message")?.[1];
  expect(listener).toBeDefined();
  jest.mocked(log.warn).mockClear();
  listener({}, 2, "09:21:36 [Renderer] console warning [object Object]", 533, "http://localhost:5173/@vite/client");
  expect(log.warn).not.toHaveBeenCalled();
  listener({}, 2, "An original renderer warning", 10, "http://localhost:5173/src/app.tsx");
  expect(log.warn).toHaveBeenCalledTimes(1);
});

it("publishes notification history changes to the live renderer", () => {
  const history = [{ id: "new-alert", read: false }];
  ipc.emit("dispatch-notification-update", null, history);
  expect(webContents.send).toHaveBeenCalledWith("notification-update", history);
});
