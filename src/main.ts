import {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  session,
} from "electron";
import type { IpcMainInvokeEvent, WebContents } from "electron";
import log from "electron-log/main";
import started from "electron-squirrel-startup";
import { Menubar } from "menubar";
import path from "node:path";
import { pathToFileURL } from "node:url";
import "./background";
import {
  authenticateWithGitHub,
  authenticateWithGitHubApp,
  authenticateWithPAT,
  hasLocalAccessToken,
} from "./mainProcess/api/Authentication/authentication";
import { signOut } from "./mainProcess/api/githubClient";
import { activateLicense } from "./mainProcess/api/LemonSqueezy/activateLicense";
import { deactivateLicense } from "./mainProcess/api/LemonSqueezy/deactivateLicense";
import { validateLicense } from "./mainProcess/api/LemonSqueezy/validateLicense";
import {
  getLicenseState,
  markExpiryReminderShown,
  setLicenseUsage,
} from "./mainProcess/licensing/licenseState";
import { getPullRequests } from "./mainProcess/api/PullRequests/getPullRequests";
import { getRepositories } from "./mainProcess/api/Repositories/getRepositories";
import { setRepositoryEnableState } from "./mainProcess/api/Repositories/setRepositoryEnableState";
import { getUser } from "./mainProcess/api/User/getUser";
import { appUpdate } from "./mainProcess/appUpdate/appUpdate";
import { createMenu } from "./mainProcess/menu/menu";
import { createMenubar } from "./mainProcess/menubar/menubar";
import { getNotificationsSettings } from "./mainProcess/notifications/getNotificationSettings";
import { setNotificationSettings } from "./mainProcess/notifications/setNotificationSettings";
import {
  refreshPoll,
  startPolling,
  stopPolling,
} from "./mainProcess/polling/pollGithub";
import { getData, storeData } from "./mainProcess/safeStorage/safeStorage";
import {
  Appearance,
  NOTIFICATION_KEYS,
} from "./mainProcess/safeStorage/safeStorage.types";
import { setToggleAllNotifications } from "./mainProcess/notifications/setToggleAllNotifications";
import {
  isAllowedRendererUrl,
  openExternalUrl,
  protectWebContents,
} from "./mainProcess/security/externalUrl";

log.info("[App] starting");

process.on("uncaughtException", (err) => {
  log.error("[Main] uncaughtException", err);
});
process.on("unhandledRejection", (reason) => {
  log.error("[Main] unhandledRejection", reason);
});

let mainWindow: BrowserWindow | null = null;
let menubar: Menubar | undefined | null = null;

const getRendererUrl = () =>
  MAIN_WINDOW_VITE_DEV_SERVER_URL ??
  pathToFileURL(
    path.join(
      __dirname,
      `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
    ),
  ).toString();

const getTrustedWebContents = () =>
  [mainWindow?.webContents, menubar?.window?.webContents].filter(
    (webContents): webContents is WebContents =>
      Boolean(webContents && !webContents.isDestroyed()),
  );

const assertTrustedIpcSender = (event: IpcMainInvokeEvent) => {
  const isTrustedWebContents = getTrustedWebContents().some(
    ({ id }) => id === event.sender.id,
  );
  const isTrustedUrl = isAllowedRendererUrl(
    event.sender.getURL(),
    getRendererUrl(),
  );

  if (!isTrustedWebContents || !isTrustedUrl) {
    throw new Error("Untrusted IPC sender.");
  }
};

const handleRendererInvoke = <Args extends unknown[], Result>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: Args) => Result,
) => {
  ipcMain.handle(channel, (event, ...args: Args) => {
    assertTrustedIpcSender(event);
    return handler(event, ...args);
  });
};

const NOTIFICATION_KEY_SET = new Set<string>(NOTIFICATION_KEYS);

const isRepositoryEnableState = (
  data: unknown,
): data is Record<number, boolean> =>
  typeof data === "object" &&
  data !== null &&
  !Array.isArray(data) &&
  Object.entries(data).every(
    ([key, value]) => /^\d+$/.test(key) && typeof value === "boolean",
  );

const isAppearance = (appearance: unknown): appearance is Appearance | null =>
  appearance === null ||
  appearance === Appearance.Light ||
  appearance === Appearance.Dark;

const isNotificationSetting = (
  setting: unknown,
): setting is { checked: boolean; key: string } => {
  if (typeof setting !== "object" || setting === null) {
    return false;
  }

  const { checked, key } = setting as Record<string, unknown>;
  return (
    typeof checked === "boolean" &&
    typeof key === "string" &&
    NOTIFICATION_KEY_SET.has(key)
  );
};

appUpdate();

if (started) {
  log.info("[App] Electron Squirrel startup, quitting");
  app.quit();
}

export const createWindow = () => {
  log.info("[Window] creating");

  // Show dock icon on macOS for the main app
  if (process.platform === "darwin") {
    app.dock?.show();
  }

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hidden",
    show: false,
    ...(process.platform !== "darwin" ? { titleBarOverlay: true } : {}),
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "images", "icon.png"),
  });

  protectWebContents(mainWindow.webContents, getRendererUrl());

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  createMenu();
  log.info("[Menu] created");

  mainWindow.show();

  log.info("[Menu] IS DEV", process.env.IS_DEV);
  if (process.env.IS_DEV) {
    log.info("[Menu] IS DEV TOOLS", process.env.IS_DEV);

    mainWindow.once("ready-to-show", () => {
      mainWindow?.webContents.openDevTools();
    });
  } else {
    // For production, ensure it shows on ready-to-show
    mainWindow.once("ready-to-show", () => {
      mainWindow?.show();
    });
  }

  mainWindow.on("minimize", () => {
    mainWindow?.hide();
  });

  log.info("[Window] loaded");

  return mainWindow;
};

export const getMainWindow = () => mainWindow;

app.on("did-become-active", () => {
  app.setBadgeCount(0);
});

app.whenReady().then(async () => {
  log.info("[App] ready");
  log.info("[App] check for updated and notify");

  // Set Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          process.env.IS_DEV
            ? // Development CSP - allows Vite dev server and hot reload
              "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws: http://localhost:* http://127.0.0.1:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* http://127.0.0.1:*; connect-src 'self' ws: http://localhost:* http://127.0.0.1:* https://api.github.com https://api.lemonsqueezy.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';"
            : // Production CSP - more restrictive
              "default-src 'self'; script-src 'self'; connect-src 'self' https://api.github.com https://api.lemonsqueezy.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self';",
        ],
      },
    });
  });

  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );
  session.defaultSession.setPermissionCheckHandler(() => false);

  // Only fetch repos if authenticated
  if (await hasLocalAccessToken()) {
    getRepositories();
  }

  // Defer license validation to background
  setTimeout(() => {
    validateLicense().catch((err) => {
      log.error("[License] validation failed", err);
    });
  }, 0);

  createWindow();
  menubar = createMenubar();

  // Delay polling until authenticated
  startPolling(); // Remove or condition this
  log.info("[Polling] started (deferred)");

  mainWindow?.webContents.once("did-finish-load", () => {
    if (process.env.IS_DEV) {
      mainWindow?.webContents.openDevTools();
    }
  });
});

app.on("window-all-closed", () => {
  log.info("[App] all windows closed");
  mainWindow = null;

  if (process.platform !== "darwin") {
    log.info("[App] quitting");
    app.quit();
  }
});

app.on("activate", () => {
  // Hide menubar if it's showing
  if (
    menubar?.window &&
    !menubar.window.isDestroyed() &&
    menubar.window.isVisible()
  ) {
    log.info("[Window] hiding menubar on activate");
    menubar.window.hide();
  }

  // Check if main window exists and is valid
  if (mainWindow && !mainWindow.isDestroyed()) {
    log.info("[Window] showing hidden window on activate");
    mainWindow.show();
    mainWindow.focus();
  } else {
    // Main window doesn't exist, create it
    log.info("[Window] recreate main window on activate");
    createWindow();
    if (!menubar) {
      menubar = createMenubar();
    }
  }
});

// ---- EVENTS ----

export const performSignOut = async () => {
  log.info("[IPC] performSignOut");

  stopPolling();
  return signOut();
};

handleRendererInvoke("on-application-sign-user", (_, isSignIn: unknown) => {
  if (typeof isSignIn !== "boolean") {
    throw new Error("Invalid sign-in state.");
  }

  log.info("[IPC] on-application-sign-user", isSignIn);

  if (isSignIn === false) {
    performSignOut();
  }

  ipcMain.emit("dispatch-application-sign-user", null, isSignIn);
});

ipcMain.on("dispatch-application-sign-user", (_, isSignIn) => {
  log.info("[IPC] dispatch-application-sign-user");

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("sign-user", isSignIn);
    mainWindow.show();
  }

  if (menubar?.window && !menubar.window.isDestroyed()) {
    menubar.window.webContents.send("sign-user", isSignIn);
  }
});

handleRendererInvoke("open-external-url", async (_, url: unknown) => {
  log.info("[IPC] open-external-url", { url });
  await openExternalUrl(url);
});

handleRendererInvoke("copy-to-clipboard", (_, text: unknown) => {
  if (typeof text !== "string") {
    throw new Error("Invalid clipboard text.");
  }

  log.info("[IPC] copy-to-clipboard", { textLength: text.length });
  clipboard.writeText(text);
});

// Authentication
handleRendererInvoke("authentication-isStored", async () => {
  const authenticated = await hasLocalAccessToken();
  return authenticated;
});
handleRendererInvoke("authentication-authenticate-github", () => {
  log.info("[IPC] authentication-authenticate-github");
  return authenticateWithGitHub();
});
handleRendererInvoke("authentication-authenticate-github-app", () => {
  log.info("[IPC] authentication-authenticate-github-app");
  return authenticateWithGitHubApp();
});

// Store a Personal Access Token (PAT) as the access token
handleRendererInvoke("authentication-store-pat", async (_, token: unknown) => {
  if (typeof token !== "string") {
    throw new Error("Invalid personal access token.");
  }

  const trimmed = token.trim();

  // Basic sanity checks to avoid obviously bad values
  if (!trimmed) {
    log.warn("[IPC] authentication-store-pat: empty token rejected");
    return {
      success: false,
      reason: "Token can't be empty.",
      isRemoteValidation: false,
    };
  }

  if (trimmed.length < 20) {
    log.warn("[IPC] authentication-store-pat: suspicious length", {
      length: trimmed.length,
    });
    return {
      success: false,
      reason: "Invalid Token.",
      isRemoteValidation: false,
    };
  }

  const response = await authenticateWithPAT(trimmed);

  if (!response.valid) {
    log.warn("[IPC] authentication-store-pat: remote validation failed", {
      reason: response.reason,
    });
    return {
      success: false,
      isRemoteValidation: true,
      reason: response.reason,
    };
  }

  return { success: true };
});

ipcMain.on("dispatch-authentication-invalid-PAT", (_, data) => {
  log.info("[IPC] dispatch-authentication-invalid-PAT", data);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("authentication-invalid-PAT", data);
  }
});

handleRendererInvoke("authentication-get-user", async () => {
  log.info("[IPC] get-github-user");
  return getUser();
});

ipcMain.on("dispatch-authentication-auth-code", (_, data) => {
  log.info("[IPC] dispatch-authentication-auth-code", {
    codeLength: data?.length || 0,
  });

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("authentication-auth-code", data);
  }
});

// ---- Repositories ----
handleRendererInvoke("repositories-query", async () => {
  log.info("[IPC] repositories-query");
  return getRepositories();
});

handleRendererInvoke("repository-set-enable-state", async (_, data: unknown) => {
  if (!isRepositoryEnableState(data)) {
    throw new Error("Invalid repository enable state.");
  }

  log.info("[IPC] repository-set-enable-state");
  return setRepositoryEnableState(data);
});

ipcMain.on("dispatch-repository-update", (_, data) => {
  log.info("[IPC] repository-update");

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("repository-update", data);
  }
});

// ---- Pull Requests ----
handleRendererInvoke("pull-requests-query", async () => {
  log.info("[IPC] pull-requests-query");
  return getPullRequests();
});

ipcMain.on("dispatch-pull-request-update", (_, data) => {
  log.info("[IPC] pull request-update");
  if (mainWindow && !mainWindow.isDestroyed()) {
    log.info("[IPC] main window pull request-update");
    mainWindow.webContents.send("pull-request-update", data);
  }

  if (menubar?.window && !menubar.window.isDestroyed()) {
    log.info("[IPC] menu bar window pull request-update");
    menubar.window.webContents.send("pull-request-update", data);
  }
});

handleRendererInvoke("get-github-repositories", async () => {
  log.info("[IPC] get-github-repositories");
  return getRepositories();
});

handleRendererInvoke("get-github-pull-request", async () => {
  log.info("[IPC] get-github-pull-request");
  return getPullRequests();
});

ipcMain.on("send-updated-list", (_, data) => {
  log.info("[IPC] send-updated-list", { prCount: data?.length || 0 });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("pull-request", data);
  }
});

// --- License -----
handleRendererInvoke("license-activate", async (_, licenseKey: unknown) => {
  if (typeof licenseKey !== "string") {
    throw new Error("Invalid license key.");
  }

  log.info("[IPC] license-activate", {
    licenseKey: licenseKey.slice(0, 4) + "****",
  });

  return activateLicense(licenseKey);
});

handleRendererInvoke("license-get-status", async () => {
  log.info("[IPC] license-get-status");
  return getLicenseState();
});

handleRendererInvoke("license-validate", async () => {
  log.info("[IPC] license-validate");
  return validateLicense();
});

handleRendererInvoke("license-set-usage", async (_, usage: unknown) => {
  log.info("[IPC] license-set-usage", { usage });

  if (usage !== "personal" && usage !== "commercial") {
    throw new Error("Invalid license usage selection.");
  }

  return setLicenseUsage(usage);
});

handleRendererInvoke("license-deactivate", async () => {
  log.info("[IPC] license-deactivate");
  return deactivateLicense();
});

handleRendererInvoke("license-mark-expiry-reminder-shown", async () => {
  log.info("[IPC] license-mark-expiry-reminder-shown");
  return markExpiryReminderShown();
});

// ---- End License ----

handleRendererInvoke("set-application-appearance", async (_, appearance) => {
  if (!isAppearance(appearance)) {
    throw new Error("Invalid appearance.");
  }

  log.info("[IPC] set-application-appearance", { appearance });

  ipcMain.emit("dispatch-application-appearance-update", null, appearance);

  return storeData({ name: "appearance", data: appearance });
});

handleRendererInvoke("get-application-appearance", async () => {
  log.info("[IPC] get-application-appearance");
  return getData("appearance");
});

ipcMain.on("dispatch-application-appearance-update", (_, data) => {
  log.info("[IPC] dispatch-application-appearance-update");

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("pull-application-appearance-update", data);
  }
});

handleRendererInvoke("get-application-notification", async () => {
  log.info("[IPC] get-application-notification");
  return getNotificationsSettings();
});

handleRendererInvoke("set-application-toggle-notification", async (_, enable) => {
  if (typeof enable !== "boolean") {
    throw new Error("Invalid notification setting.");
  }

  log.info("[IPC] set-application-notification");
  return setToggleAllNotifications(enable);
});

handleRendererInvoke("set-application-notification", async (_, notificationKey) => {
  if (!isNotificationSetting(notificationKey)) {
    throw new Error("Invalid notification setting.");
  }

  log.info("[IPC] set-application-notification");
  return setNotificationSettings(notificationKey);
});

handleRendererInvoke("get-application-start-at-login", async () => {
  log.info("[IPC] get-application-start-at-login");

  return getData("open_at_login");
});

// ---- Menubar Density ----
handleRendererInvoke("get-menubar-density", async () => {
  log.info("[IPC] get-menubar-density");
  const appSettings = await getData("appSettings");
  // Default to 'default' if not set
  return appSettings?.menubarDensity || "default";
});

handleRendererInvoke("set-menubar-density", async (_, density: unknown) => {
  if (density !== "compact" && density !== "default") {
    throw new Error("Invalid menubar density.");
  }

  const validatedDensity = density as "compact" | "default";

  log.info("[IPC] set-menubar-density", validatedDensity);
  const prev = await getData("appSettings");
  const newSettings = { ...prev, menubarDensity: validatedDensity };
  await storeData({ name: "appSettings", data: newSettings });
  ipcMain.emit("dispatch-menubar-density-update", null, validatedDensity);
  return validatedDensity;
});
// ---- End Menubar Density ----

handleRendererInvoke(
  "set-application-start-at-login",
  async (_, isStartingAtLogin) => {
    if (typeof isStartingAtLogin !== "boolean") {
      throw new Error("Invalid start-at-login setting.");
    }

    log.info("[IPC] set-application-start-at-login", isStartingAtLogin);

    app.setLoginItemSettings({
      openAtLogin: isStartingAtLogin,
    });

    log.info("[IPC] set-application-start-at-login", isStartingAtLogin);
    await storeData({ name: "open_at_login", data: isStartingAtLogin });
  },
);

handleRendererInvoke("get-application-refresh-pool", () => {
  log.info("[IPC] get-application-refresh-pool");

  return refreshPoll();
});

handleRendererInvoke("on-application-navigate-to-route", (_, route) => {
  if (route !== "settings" && route !== "signIn") {
    throw new Error("Invalid navigation route.");
  }

  log.info("[IPC] on-application-navigate-to-route", route);

  if (!mainWindow || mainWindow.isDestroyed()) {
    log.info("[IPC] mainWindow doesn't exist, creating it");
    createWindow();
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    log.info("[IPC] mainWindow send navigate-to-route", route);

    // Wait for window to be ready before sending route
    if (mainWindow.webContents.isLoading()) {
      mainWindow.webContents.once("did-finish-load", () => {
        mainWindow?.webContents.send("navigate-to-route", route);
      });
    } else {
      mainWindow.webContents.send("navigate-to-route", route);
    }

    mainWindow.show();
    mainWindow.focus();
  }
});

app.on("before-quit", () => {
  log.info("[App] stopping polling before quit");
  stopPolling();
});
