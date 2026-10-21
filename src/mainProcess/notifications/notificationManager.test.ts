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
import { batchNotificationManager, clearNotificationsOnSignOut } from "./notificationManager";
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
