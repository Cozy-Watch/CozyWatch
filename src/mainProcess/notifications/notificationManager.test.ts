import { EventEmitter } from "node:events";
import type { NotificationRecord } from "../safeStorage/safeStorage.types";
const created: Array<EventEmitter & { show: jest.Mock; close: jest.Mock }> = [];
const supported = jest.fn(() => true);
const show = jest.fn();
let history: NotificationRecord[] = [];
jest.mock("electron", () => ({
  Notification: Object.assign(jest.fn(() => {
    const item = Object.assign(new EventEmitter(), { show, close: jest.fn() });
    created.push(item); return item;
  }), { isSupported: supported }),
  ipcMain: new EventEmitter(), app: { isReady: () => true },
}));
jest.mock("electron-log", () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock("../safeStorage/safeStorage", () => ({
  getData: jest.fn(async () => history),
  storeData: jest.fn(async ({ data }: { data: NotificationRecord[] }) => { history = data; return true; }),
}));
jest.mock("./getNotificationSettings", () => ({ getNotificationsSettings: jest.fn(async () => ({ ciStatusNotification: { value: false } })) }));
jest.mock("../licensing/licenseState", () => ({ getLicenseState: async () => ({ status: "licensed" }) }));
jest.useFakeTimers();
import { storeData } from "../safeStorage/safeStorage";
import { ipcMain } from "electron";
import { batchNotificationManager, clearNotificationsOnSignOut, markAllNotificationsRead, setDisabledNotificationRepositories, cancelPendingNotifications } from "./notificationManager";
const alert = (body: string, pullNumber = 1) => ({ title: "Review", body, type: "review" as const, source: { repository: "org/repo", pullNumber } });
beforeEach(async () => {
  jest.useFakeTimers(); await clearNotificationsOnSignOut(); history = []; created.length = 0; show.mockReset(); supported.mockReturnValue(true);
});
afterEach(async () => { await jest.runOnlyPendingTimersAsync(); jest.useRealTimers(); });
it("appends new batches without discarding pending alerts, including empty batches", async () => {
  batchNotificationManager([alert("A"), alert("B")]);
  await jest.advanceTimersByTimeAsync(0);
  batchNotificationManager([]); batchNotificationManager([alert("C")]);
  await jest.advanceTimersByTimeAsync(10000);
  expect(history.map(n => n.body)).toEqual(["C", "B", "A"]);
  expect(show).toHaveBeenCalledTimes(3);
});

it("continues after a native exception and observes native failures", async () => {
  show.mockImplementationOnce(() => { throw new Error("native failure"); });
  batchNotificationManager([alert("failure"), alert("next")]);
  await jest.advanceTimersByTimeAsync(10000);
  expect(show).toHaveBeenCalledTimes(2);
  expect(created[1].listenerCount("failed")).toBe(1);
  expect(() => created[1].emit("failed")).not.toThrow();
});
it("retains history when native notifications are unsupported", async () => {
  supported.mockReturnValue(false);
  batchNotificationManager([alert("unsupported")]);
  await jest.advanceTimersByTimeAsync(10000);
  expect(history).toHaveLength(1);
  expect(show).not.toHaveBeenCalled();
});

it("does not publish a successful history update when storage fails", async () => {
  const updates = jest.fn(); ipcMain.on("dispatch-notification-update", updates);
  jest.mocked(storeData).mockResolvedValueOnce(false);
  await expect(markAllNotificationsRead()).rejects.toThrow("Could not save notification history");
  expect(updates).not.toHaveBeenCalled();
  ipcMain.removeListener("dispatch-notification-update", updates);
});

it("cancels queued and active private alerts on sign-out", async () => {
  batchNotificationManager([alert("private A"), alert("private B")]);
  await jest.advanceTimersByTimeAsync(0);
  const first = created[0];
  await clearNotificationsOnSignOut();
  await jest.advanceTimersByTimeAsync(10000);
  expect(history).toEqual([]); expect(show).toHaveBeenCalledTimes(1);
  expect(first.close).toHaveBeenCalledTimes(1);
  batchNotificationManager([alert("new session")]);
  await jest.advanceTimersByTimeAsync(10000);
  expect(history.map(n => n.body)).toEqual(["new session"]);
});

it("deduplicates only the same source and copy within a rolling window", async () => {
  batchNotificationManager([alert("identical", 1), alert("identical", 2), alert("identical", 1)]);
  await jest.advanceTimersByTimeAsync(10000);
  expect(show).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(50001);
  batchNotificationManager([alert("identical", 1)]);
  await jest.advanceTimersByTimeAsync(10000);
  expect(show).toHaveBeenCalledTimes(3);
});

it("rechecks preferences before delivering an already queued alert", async () => {
  batchNotificationManager([{ ...alert("disabled CI"), setting: "ciStatusNotification" }]);
  await jest.advanceTimersByTimeAsync(10000);
  expect(show).not.toHaveBeenCalled(); expect(history).toEqual([]);
});

it("persists the whole batch before the native delivery delay", async () => {
  await batchNotificationManager([alert("A"), alert("B"), alert("C")]);
  expect(history.map(item => item.body)).toEqual(["C", "B", "A"]);
  expect(show.mock.calls.length).toBeLessThanOrEqual(1);
  cancelPendingNotifications();
  expect(history).toHaveLength(3);
});
it("preserves unrelated banners and all accepted history on repository changes", async () => {
  await batchNotificationManager([alert("first"), alert("disabled"), { ...alert("other"), source: { repository: "org/other", pullNumber: 2 } }]);
  await jest.advanceTimersByTimeAsync(0);
  setDisabledNotificationRepositories(["ORG/REPO"]);
  await jest.advanceTimersByTimeAsync(10000);
  expect(history).toHaveLength(3);
  expect(show).toHaveBeenCalledTimes(2);
  expect(created[0].close).toHaveBeenCalledTimes(1);
});

it("allows immediate retry after storage recovers without duplicate history", async () => {
  jest.mocked(storeData).mockResolvedValueOnce(false);
  await batchNotificationManager([alert("retry")]);
  expect(history).toEqual([]);
  await batchNotificationManager([alert("retry")]);
  await jest.advanceTimersByTimeAsync(40000);
  expect(history.map(item => item.body)).toEqual(["retry"]);
  expect(show).toHaveBeenCalledTimes(1);
});
it("automatically retries transient write failures without another poll", async () => {
  jest.mocked(storeData).mockResolvedValueOnce(false);
  await batchNotificationManager([alert("automatic retry")]);
  await jest.advanceTimersByTimeAsync(1000);
  expect(history.map(item => item.body)).toEqual(["automatic retry"]);
});
it("cancels storage retries on sign-out", async () => {
  jest.mocked(storeData).mockResolvedValueOnce(false);
  await batchNotificationManager([alert("old session")]);
  await clearNotificationsOnSignOut();
  await jest.advanceTimersByTimeAsync(40000);
  expect(history).toEqual([]);
  expect(show).not.toHaveBeenCalled();
});
it("bounds automatic retries when storage remains unavailable", async () => {
  const save = jest.mocked(storeData);
  const implementation = save.getMockImplementation()!;
  save.mockResolvedValue(false);
  const before = save.mock.calls.length;
  await batchNotificationManager([alert("unavailable")]);
  await jest.advanceTimersByTimeAsync(100000);
  expect(save.mock.calls.length - before).toBe(4);
  expect(history).toEqual([]);
  save.mockImplementation(implementation);
});
