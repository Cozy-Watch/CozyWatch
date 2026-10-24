import { Notification } from "electron";
import Logger from "electron-log";
import { tryOpenExternalUrl } from "../../security/externalUrl";

let activeNotification: Notification | null = null;

// Sign-in codes are transient, so show them immediately without saving them
// into the persistent GitHub activity history or waiting behind its queue.
export const showAuthenticationCodeNotification = (code: string, verificationUrl: string) => {
  if (!Notification.isSupported()) return;
  try {
    activeNotification?.close();
    const notification = new Notification({
      title: "Finish connecting GitHub",
      body: `Your code is ${code}. Enter it on GitHub to finish signing in. Click to open the authentication page.`,
      timeoutType: "never",
    });
    activeNotification = notification;
    notification.on("click", () => { tryOpenExternalUrl(verificationUrl); });
    notification.on("close", () => {
      if (activeNotification === notification) activeNotification = null;
    });
    notification.on("failed", () => {
      Logger.warn("[Authentication] Unable to show the sign-in code notification");
    });
    notification.show();
  } catch {
    Logger.warn("[Authentication] Unable to show the sign-in code notification");
  }
};

export const clearAuthenticationCodeNotification = () => {
  const notification = activeNotification;
  activeNotification = null;
  try { notification?.close(); } catch { /* Authentication must not depend on desktop notifications. */ }
};
