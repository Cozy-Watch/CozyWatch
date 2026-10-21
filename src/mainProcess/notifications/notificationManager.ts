import { getNotificationsSettings } from "./getNotificationSettings";
import { getLicenseState } from "../licensing/licenseState";
import { canUseDesktop } from "../licensing/licenseState.utils";
import { Notification, app, ipcMain } from "electron";
import Logger from "electron-log";
import { getData, storeData } from "../safeStorage/safeStorage";
import type {
  NotificationRecord,
  NotificationTone,
  NotificationType,
  NotificationKey,
} from "../safeStorage/safeStorage.types";

export interface ManagedNotification {
  setting?: NotificationKey;
  title: string;
  body: string;
  type?: NotificationType;
  tone?: NotificationTone;
  url?: string;
  source?: NotificationRecord["source"];
}

export const formatNotificationSource = (source?: NotificationRecord["source"]) =>
  [source?.repository, source?.pullNumber ? `#${source.pullNumber}` : undefined, source?.branch]
    .filter(Boolean)
    .join(" · ");

const recentNotifications = new Map<string, number>();
const notificationQueue: ManagedNotification[] = [];
let isProcessingQueue = false;
let notificationSequence = 0;
let sessionGeneration = 0;
let deliveryTimer: ReturnType<typeof setTimeout> | undefined;
const NOTIFICATION_DELAY = 3000;
const DEDUPLICATION_WINDOW = 60000;
const MAX_HISTORY = 100;

let activeNotifications: Notification[] = [];
let historyMutation: Promise<void> = Promise.resolve();

function getNotificationHash(notification: ManagedNotification): string {
  return JSON.stringify([
    notification.type, notification.source?.repository, notification.source?.pullNumber,
    notification.source?.branch, notification.url, notification.title, notification.body,
  ]);
}

const emitHistoryUpdate = (history: NotificationRecord[]) => {
  ipcMain.emit("dispatch-notification-update", null, history);
};

const readHistory = async (): Promise<NotificationRecord[]> =>
  (await getData("notification_history")) ?? [];

const updateHistory = async (
  update: (history: NotificationRecord[]) => NotificationRecord[],
  isCurrent = () => true,
) => {
  historyMutation = historyMutation
    .catch(() => undefined)
    .then(async () => {
      const previous = await readHistory();
      if (!isCurrent()) return;
      const history = update(previous);
      if (!(await storeData({ name: "notification_history", data: history }))) {
        throw new Error("Could not save notification history. Please try again.");
      }
      if (isCurrent()) emitHistoryUpdate(history);
    });
  await historyMutation;
};

export const getNotificationHistory = readHistory;

export const markNotificationRead = async (id: string, read = true) => {
  await updateHistory((history) =>
    history.map((notification) =>
      notification.id === id ? { ...notification, read } : notification,
    ),
  );
};

export const markAllNotificationsRead = async () => {
  await updateHistory((history) =>
    history.map((notification) => ({ ...notification, read: true })),
  );
};

export const clearNotificationHistory = async () => {
  await updateHistory(() => []);
};

const createRecord = (notification: ManagedNotification): NotificationRecord => ({
  id: `${Date.now()}-${notificationSequence++}`,
  type: notification.type ?? "system",
  ...(notification.tone ? { tone: notification.tone } : {}),
  title: notification.title,
  body: notification.body,
  createdAt: new Date().toISOString(),
  ...(notification.url ? { url: notification.url } : {}),
  ...(notification.source ? { source: notification.source } : {}),
  read: false,
});

const persistNotification = async (notification: ManagedNotification, isCurrent: () => boolean) => {
  const record = createRecord(notification);
  await updateHistory((history) => [record, ...history].slice(0, MAX_HISTORY), isCurrent);
  return record;
};

export const batchNotificationManager = (notifications: ManagedNotification[]) => {
  notifications.forEach((notification) => {
    const hash = getNotificationHash(notification);
    const now = Date.now();
    for (const [key, acceptedAt] of recentNotifications) {
      if (now - acceptedAt >= DEDUPLICATION_WINDOW) recentNotifications.delete(key);
    }
    if (!recentNotifications.has(hash)) {
      recentNotifications.set(hash, now);
      notificationQueue.push(notification);
    }
  });

  if (!isProcessingQueue) {
    void processQueue();
  }
};


function clearNotification(notification: Notification) {
  activeNotifications = activeNotifications.filter((item) => item !== notification);
}

async function processQueue() {
  if (notificationQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  isProcessingQueue = true;
  const generation = sessionGeneration;
  const isCurrent = () => generation === sessionGeneration;
  const notification = notificationQueue.shift();

  try {
  if (notification && (notification.type === "system" || (!notification.type && !notification.source) || await getLicenseState().then(canUseDesktop).catch(() => false))) {
    if (!isCurrent()) return;
    if (notification.setting && !(await getNotificationsSettings())[notification.setting].value) return;
    if (!isCurrent()) return;
    const record = await persistNotification(notification, isCurrent);
    if (!isCurrent()) return;
    if (!Notification.isSupported()) return;
    const electronNotification = new Notification({
      title: notification.title,
      body: [formatNotificationSource(notification.source), notification.body]
        .filter(Boolean)
        .join("\n"),
    });
    activeNotifications.push(electronNotification);

    electronNotification.on("click", () => {
      if (!isCurrent()) return;
      void markNotificationRead(record.id).catch(() => Logger.warn("[Notifications] Could not mark alert read"));
      ipcMain.emit("dispatch-notification-click", null, record.id);
      clearNotification(electronNotification);
    });
    electronNotification.on("close", () => clearNotification(electronNotification));
    electronNotification.on("failed", () => {
      Logger.warn("[Notifications] Native delivery failed; history remains available");
      clearNotification(electronNotification);
    });
    electronNotification.show();
  }

  } catch {
    Logger.warn("[Notifications] Could not deliver alert; continuing queue");
  } finally {
    if (isCurrent()) deliveryTimer = setTimeout(() => void processQueue(), NOTIFICATION_DELAY);
  }
}

export const cancelPendingNotifications = () => {
  sessionGeneration++;
  if (deliveryTimer) clearTimeout(deliveryTimer);
  deliveryTimer = undefined;
  notificationQueue.length = 0;
  recentNotifications.clear();
  isProcessingQueue = false;
  const active = activeNotifications;
  activeNotifications = [];
  active.forEach(notification => { try { notification.close(); } catch { /* Already closed by the OS. */ } });
};

export const clearNotificationsOnSignOut = async () => {
  cancelPendingNotifications();
  await clearNotificationHistory();
  if (app.isReady()) {
    Logger.info("[Notifications] history cleared on sign out");
  }
};
