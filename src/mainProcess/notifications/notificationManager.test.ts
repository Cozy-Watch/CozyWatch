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
jest.mock("../licensing/licenseState", () => ({ getLicenseState: async () => ({ status: "licensed" }) }));
jest.useFakeTimers();
import { storeData } from "../safeStorage/safeStorage";
import { ipcMain } from "electron";
import { batchNotificationManager, clearNotificationsOnSignOut, markAllNotificationsRead } from "./notificationManager";
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
