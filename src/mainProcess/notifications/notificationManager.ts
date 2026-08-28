import { Notification } from "electron";
import Logger from "electron-log";

interface ManagedNotification {
  title: string;
  body: string;
  onClick?: () => void;
}

// Using content hash instead of ID for deduplication
const recentNotifications = new Set<string>();
const notificationQueue: ManagedNotification[] = [];
let isProcessingQueue = false;
const NOTIFICATION_DELAY = 3000; // milliseconds between notifications
const DEDUPLICATION_WINDOW = 60000; // Clear notification history after 1 minute

let activeNotifications: Notification[] = []; // Store to prevent GC

// Get a unique hash for a notification based on content
function getNotificationHash(notification: ManagedNotification): string {
  const title = (notification.title || "").trim().toLowerCase();
  const body = (notification.body || "").trim().toLowerCase();

  Logger.info("Generating hash for notification:", `${title}::${body}`);

  return `${title}::${body}`;
}

// Batch notification function
export const batchNotificationManager = (
  notifications: ManagedNotification[]
) => {
  // Clear the existing queue
  notificationQueue.length = 0;

  // Add unique notifications to queue
  notifications.forEach((notification) => {
    const hash = getNotificationHash(notification);

    if (!recentNotifications.has(hash)) {
      recentNotifications.add(hash);
      notificationQueue.push(notification);
    }
  });

  // Start processing if not already doing so
  if (!isProcessingQueue) {
    processQueue();
  }
};

// Periodically clear notification history to prevent memory buildup
setInterval(() => {
  recentNotifications.clear();
}, DEDUPLICATION_WINDOW);

function clearNotification(notification: Notification) {
  activeNotifications = activeNotifications.filter((n) => n !== notification);
}

function processQueue() {
  if (notificationQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  isProcessingQueue = true;
  const notification = notificationQueue.shift();

  if (notification) {
    const { title, body, onClick = () => {} } = notification;

    const electronNotification = new Notification({ title, body });
    activeNotifications.push(electronNotification); // Prevent GC

    electronNotification.on("click", () => {
      onClick();
      clearNotification(electronNotification); // Clean up after click
    });
    electronNotification.on("close", () => {
      clearNotification(electronNotification); // Clean up on close
    });
    electronNotification.show();
  }

  // Schedule the next notification
  setTimeout(processQueue, NOTIFICATION_DELAY);
}
