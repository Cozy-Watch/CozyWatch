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
const pendingWrites = new Map<string, number>();
const retryWrites = new Map<string, { attempts: number; timer: ReturnType<typeof setTimeout> }>();
const WRITE_RETRY_DELAYS = [1000, 5000, 30000];
type Delivery = { notification: ManagedNotification; record: NotificationRecord };
const notificationQueue: Delivery[] = [];
let disabledRepositories = new Set<string>();
let isProcessingQueue = false;
let notificationSequence = 0;
let sessionGeneration = 0;
let deliveryTimer: ReturnType<typeof setTimeout> | undefined;
const NOTIFICATION_DELAY = 3000;
const DEDUPLICATION_WINDOW = 60000;
const MAX_HISTORY = 100;

let activeNotifications = new Map<Notification, ManagedNotification>();
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

const isRepositoryEnabled = (notification: ManagedNotification) =>
  !notification.source?.repository || !disabledRepositories.has(notification.source.repository.toLowerCase());

const isAllowed = async (notification: ManagedNotification) => {
  if (!isRepositoryEnabled(notification)) return false;
  const isSystem = notification.type === "system" || (!notification.type && !notification.source);
  if (!isSystem && !(await getLicenseState().then(canUseDesktop).catch(() => false))) return false;
  if (notification.setting && !(await getNotificationsSettings())[notification.setting].value) return false;
  return isRepositoryEnabled(notification);
};

export const batchNotificationManager = async (notifications: ManagedNotification[]) => {
  const generation = sessionGeneration;
  const isCurrent = () => generation === sessionGeneration;
  const now = Date.now();
  for (const [key, acceptedAt] of recentNotifications) {
    if (now - acceptedAt >= DEDUPLICATION_WINDOW) recentNotifications.delete(key);
  }
  await Promise.all(notifications.map(async (notification) => {
    const hash = getNotificationHash(notification);
    if (recentNotifications.has(hash) || pendingWrites.get(hash) === generation) return;
    const retry = retryWrites.get(hash);
    if (retry) { clearTimeout(retry.timer); retryWrites.delete(hash); }
    pendingWrites.set(hash, generation);
    try {
      if (!(await isAllowed(notification)) || !isCurrent()) return;
      // Save every accepted event without waiting for paced native delivery.
      const record = await persistNotification(notification, isCurrent);
      if (isCurrent()) recentNotifications.set(hash, Date.now());
      if (!isCurrent() || !isRepositoryEnabled(notification)) return;
      notificationQueue.push({ notification, record });
      // History is authoritative. Keep the native backlog bounded as well.
      if (notificationQueue.length > MAX_HISTORY) notificationQueue.shift();
      if (!isProcessingQueue) void processQueue();
    } catch {
      if (!isCurrent()) return;
      const attempts = retry?.attempts ?? 0;
      const delay = WRITE_RETRY_DELAYS[attempts];
      if (delay !== undefined) {
        // Retry without relying on GitHub regenerating an already observed change.
        const timer = setTimeout(() => {
          if (isCurrent()) void batchNotificationManager([notification]);
        }, delay);
        retryWrites.set(hash, { attempts: attempts + 1, timer });
        if (retryWrites.size > MAX_HISTORY) {
          const oldest = retryWrites.keys().next().value;
          if (oldest) { clearTimeout(retryWrites.get(oldest)!.timer); retryWrites.delete(oldest); }
        }
      }
      Logger.warn("[Notifications] Could not save alert; retry remains available");
    } finally {
      if (pendingWrites.get(hash) === generation) pendingWrites.delete(hash);
    }
  }));
};

function clearNotification(notification: Notification) {
  activeNotifications.delete(notification);
}

/** Selection changes cancel only banners for disabled repositories; history stays. */
export const setDisabledNotificationRepositories = (repositories: string[]) => {
  disabledRepositories = new Set(repositories.map(name => name.toLowerCase()));
  const retained = notificationQueue.filter(item => isRepositoryEnabled(item.notification));
  notificationQueue.splice(0, notificationQueue.length, ...retained);
  for (const [native, notification] of activeNotifications) {
    if (isRepositoryEnabled(notification)) continue;
    clearNotification(native);
    try { native.close(); } catch { /* Already closed by the OS. */ }
  }
};

async function processQueue() {
  if (notificationQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  isProcessingQueue = true;
  const generation = sessionGeneration;
  const isCurrent = () => generation === sessionGeneration;
  const delivery = notificationQueue.shift();
  if (!delivery) { isProcessingQueue = false; return; }
  const { notification, record } = delivery;

  try {
  if (await isAllowed(notification)) {
    if (!isCurrent()) return;
    if (!Notification.isSupported()) return;
    const electronNotification = new Notification({
      title: notification.title,
      body: [formatNotificationSource(notification.source), notification.body]
        .filter(Boolean)
        .join("\n"),
    });
    activeNotifications.set(electronNotification, notification);
    if (activeNotifications.size > MAX_HISTORY) {
      const oldest = activeNotifications.keys().next().value;
      if (oldest) { clearNotification(oldest); try { oldest.close(); } catch { /* Already closed. */ } }
    }

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
  pendingWrites.clear();
  retryWrites.forEach(retry => clearTimeout(retry.timer));
  retryWrites.clear();
  isProcessingQueue = false;
  disabledRepositories = new Set();
  const active = activeNotifications;
  activeNotifications = new Map();
  active.forEach((_, notification) => { try { notification.close(); } catch { /* Already closed by the OS. */ } });
};

export const clearNotificationsOnSignOut = async () => {
  cancelPendingNotifications();
  await clearNotificationHistory();
  if (app.isReady()) {
    Logger.info("[Notifications] history cleared on sign out");
  }
};
