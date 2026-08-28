import { getData } from "../safeStorage/safeStorage";
import { NOTIFICATION_DEFAULT_SETTINGS } from "./notifications.meta";
import {
  NOTIFICATION_KEYS,
  NotificationSettingsPerKey,
} from "../safeStorage/safeStorage.types";

export const getNotificationsSettings =
  async (): Promise<NotificationSettingsPerKey> => {
    const notifications = await getData("notifications");

    const notificationDetails = NOTIFICATION_KEYS.reduce((acc, key) => {
      const notification = NOTIFICATION_DEFAULT_SETTINGS[key];

      return {
        ...acc,
        [key]: {
          ...notification,
          ...(notifications ? notifications[key] : {}),
        },
      };
    }, NOTIFICATION_DEFAULT_SETTINGS);

    return notificationDetails;
  };
