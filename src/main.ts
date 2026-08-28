import {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  shell,
  session,
} from "electron";
import log from "electron-log/main";
import started from "electron-squirrel-startup";
import { Menubar } from "menubar";
import path from "node:path";
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
import { LicenseUsage } from "./mainProcess/licensing/licenseState.types";
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
import { setToggleAllNotifications } from "./mainProcess/notifications/setToggleAllNotifications";

log.info("[App] starting");

process.on("uncaughtException", (err) => {
  log.error("[Main] uncaughtException", err);
});
process.on("unhandledRejection", (reason) => {
  log.error("[Main] unhandledRejection", reason);
});

let mainWindow: BrowserWindow | null = null;
let menubar: Menubar | undefined | null = null;

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
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "images", "icon.png"),
  });

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

ipcMain.handle("on-application-sign-user", (_, isSignIn) => {
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

ipcMain.handle("open-external-url", async (_, url) => {
  log.info("[IPC] open-external-url", { url });
  await shell.openExternal(url);
});

ipcMain.handle("copy-to-clipboard", (_, text: string) => {
  log.info("[IPC] copy-to-clipboard", { textLength: text.length });
  clipboard.writeText(text);
});

// Authentication
ipcMain.handle("authentication-isStored", async () => {
  const authenticated = await hasLocalAccessToken();
  return authenticated;
});
ipcMain.handle("authentication-authenticate-github", () => {
  log.info("[IPC] authentication-authenticate-github");
  return authenticateWithGitHub();
});
ipcMain.handle("authentication-authenticate-github-app", () => {
  log.info("[IPC] authentication-authenticate-github-app");
  return authenticateWithGitHubApp();
});

// Store a Personal Access Token (PAT) as the access token
ipcMain.handle("authentication-store-pat", async (_, token: string) => {
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

ipcMain.handle("authentication-get-user", async () => {
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
ipcMain.handle("repositories-query", async () => {
  log.info("[IPC] repositories-query");
  return getRepositories();
});

ipcMain.handle("repository-set-enable-state", async (_, data) => {
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
ipcMain.handle("pull-requests-query", async () => {
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

ipcMain.handle("get-github-repositories", async () => {
  log.info("[IPC] get-github-repositories");
  return getRepositories();
});

ipcMain.handle("get-github-pull-request", async () => {
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
ipcMain.handle("license-activate", async (_, licenseKey: string) => {
  if (typeof licenseKey !== "string") {
    throw new Error("Invalid license key.");
  }

  log.info("[IPC] license-activate", {
    licenseKey: licenseKey.slice(0, 4) + "****",
  });

  return activateLicense(licenseKey);
});

ipcMain.handle("license-get-status", async () => {
  log.info("[IPC] license-get-status");
  return getLicenseState();
});

ipcMain.handle("license-validate", async () => {
  log.info("[IPC] license-validate");
  return validateLicense();
});

ipcMain.handle("license-set-usage", async (_, usage: LicenseUsage) => {
  log.info("[IPC] license-set-usage", { usage });

  if (usage !== "personal" && usage !== "commercial") {
    throw new Error("Invalid license usage selection.");
  }

  return setLicenseUsage(usage);
});

ipcMain.handle("license-deactivate", async () => {
  log.info("[IPC] license-deactivate");
  return deactivateLicense();
});

ipcMain.handle("license-mark-expiry-reminder-shown", async () => {
  log.info("[IPC] license-mark-expiry-reminder-shown");
  return markExpiryReminderShown();
});

// ---- End License ----

ipcMain.handle("set-application-appearance", async (_, appearance) => {
  log.info("[IPC] set-application-appearance", { appearance });

  ipcMain.emit("dispatch-application-appearance-update", null, appearance);

  return storeData({ name: "appearance", data: appearance });
});

ipcMain.handle("get-application-appearance", async () => {
  log.info("[IPC] get-application-appearance");
  return getData("appearance");
});

ipcMain.on("dispatch-application-appearance-update", (_, data) => {
  log.info("[IPC] dispatch-application-appearance-update");

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("pull-application-appearance-update", data);
  }
});

ipcMain.handle("get-application-notification", async () => {
  log.info("[IPC] get-application-notification");
  return getNotificationsSettings();
});

ipcMain.handle("set-application-toggle-notification", async (_, enable) => {
  log.info("[IPC] set-application-notification");
  return setToggleAllNotifications(enable);
});

ipcMain.handle("set-application-notification", async (_, notificationKey) => {
  log.info("[IPC] set-application-notification");
  return setNotificationSettings(notificationKey);
});

ipcMain.handle("get-application-start-at-login", async () => {
  log.info("[IPC] get-application-start-at-login");

  return getData("open_at_login");
});

// ---- Menubar Density ----
ipcMain.handle("get-menubar-density", async () => {
  log.info("[IPC] get-menubar-density");
  const appSettings = await getData("appSettings");
  // Default to 'default' if not set
  return appSettings?.menubarDensity || "default";
});

ipcMain.handle("set-menubar-density", async (_, density) => {
  log.info("[IPC] set-menubar-density", density);
  const prev = await getData("appSettings");
  const newSettings = { ...prev, menubarDensity: density };
  await storeData({ name: "appSettings", data: newSettings });
  ipcMain.emit("dispatch-menubar-density-update", null, density);
  return density;
});
// ---- End Menubar Density ----

ipcMain.handle(
  "set-application-start-at-login",
  async (_, isStartingAtLogin) => {
    log.info("[IPC] set-application-start-at-login", isStartingAtLogin);

    app.setLoginItemSettings({
      openAtLogin: isStartingAtLogin,
    });

    log.info("[IPC] set-application-start-at-login", isStartingAtLogin);
    await storeData({ name: "open_at_login", data: isStartingAtLogin });
  },
);

ipcMain.handle("get-application-refresh-pool", () => {
  log.info("[IPC] get-application-refresh-pool");

  return refreshPoll();
});

ipcMain.handle("on-application-navigate-to-route", (_, route) => {
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
