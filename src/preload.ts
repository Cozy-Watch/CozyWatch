// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import { CacheData as PullRequest } from "./mainProcess/api/PullRequests/utils/getDefaultData";
import {
  Appearance,
  RepositoriesCache,
} from "./mainProcess/safeStorage/safeStorage.types";

type IpcListener<T> = (event: IpcRendererEvent, data: T) => void;
type AuthenticationCode = {
  verification_uri: string;
  user_code: string;
};

contextBridge.exposeInMainWorld("electronAPI", {
  application: {
    // Application Settings
    setApplicationAppearance: (appearance: Appearance | null) => {
      return ipcRenderer.invoke("set-application-appearance", appearance);
    },
    getApplicationAppearance: (): Promise<Appearance | null> => {
      return ipcRenderer.invoke("get-application-appearance");
    },

    // Menubar Density
    getMenubarDensity: (): Promise<"compact" | "default"> => {
      return ipcRenderer.invoke("get-menubar-density");
    },
    setMenubarDensity: (density: "compact" | "default") => {
      return ipcRenderer.invoke("set-menubar-density", density);
    },

    onApplicationAppearanceUpdate: (callback: (data: Appearance) => void) => {
      const handler: IpcListener<Appearance> = (_event, data) => callback(data);
      ipcRenderer.on("pull-application-appearance-update", handler);
      return handler;
    },
    removeOnApplicationAppearanceUpdate: (handler: IpcListener<Appearance>) =>
      ipcRenderer.removeListener("pull-application-appearance-update", handler),

    // ----- SIGN IN / SIGN OUT -----
    signUser: (isSignIn: boolean) => {
      return ipcRenderer.invoke("on-application-sign-user", isSignIn);
    },
    onSignUser: (callback: (isSignIn: boolean) => void) => {
      const handler: IpcListener<boolean> = (_event, data) => {
        callback(data);
      };
      ipcRenderer.on("sign-user", handler);
      return handler;
    },
    removeOnSignUser: (handler: IpcListener<boolean>) =>
      ipcRenderer.removeListener("sign-user", handler),
    // ----------

    onSignOut: (callback: (data: boolean) => void) => {
      const handler: IpcListener<boolean> = (_event, data) => {
        callback(data);
      };
      ipcRenderer.on("app-sign-out", handler);
      return handler;
    },

    removeOnSignOut: (handler: IpcListener<boolean>) =>
      ipcRenderer.removeListener("app-sign-out", handler),

    getNotificationsSettings: () => {
      return ipcRenderer.invoke("get-application-notification");
    },

    setToggleAllNotifications: (enabled: boolean) => {
      return ipcRenderer.invoke("set-application-toggle-notification", enabled);
    },

    setNotificationSetting: ({
      checked,
      key,
    }: {
      checked: boolean;
      key: string;
    }) => {
      return ipcRenderer.invoke("set-application-notification", {
        checked,
        key,
      });
    },

    getStartAtLogin: () => {
      return ipcRenderer.invoke("get-application-start-at-login");
    },

    setStartAtLogin: (isOpenAtLogin: boolean) => {
      return ipcRenderer.invoke(
        "set-application-start-at-login",
        isOpenAtLogin,
      );
    },

    refreshPoll: () => {
      return ipcRenderer.invoke("get-application-refresh-pool");
    },

    getDiagnosticsStatus: (): Promise<{ enabled: boolean }> =>
      ipcRenderer.invoke("diagnostics-get-status"),
    exportDiagnosticsBundle: (): Promise<{ saved: boolean }> =>
      ipcRenderer.invoke("diagnostics-export-bundle"),
    reportRendererReady: () => ipcRenderer.invoke("diagnostics-renderer-ready"),

    navigateToRoute: (route: "settings" | "signIn") => {
      return ipcRenderer.invoke("on-application-navigate-to-route", route);
    },

    onNavigateToRoute: (callback: (route: "settings" | "signIn") => void) => {
      const handler: IpcListener<"settings" | "signIn"> = (_event, data) => {
        callback(data);
      };
      ipcRenderer.on("navigate-to-route", handler);
      return handler;
    },

    removeOnNavigateToRoute: (
      handler: IpcListener<"settings" | "signIn">,
    ) =>
      ipcRenderer.removeListener("navigate-to-route", handler),
  },

  // TO REMOVE THIS
  signOut: () => ipcRenderer.invoke("signOut"),

  openExternalLink: (url: string) => {
    ipcRenderer.invoke("open-external-url", url);
  },
  copyToClipboard: (text: string) => {
    ipcRenderer.invoke("copy-to-clipboard", text);
  },

  // GitHub API
  authentication: {
    isStored: () => ipcRenderer.invoke("authentication-isStored"),
    authenticateGitHub: () =>
      ipcRenderer.invoke("authentication-authenticate-github"),
    authenticateGitHubApp: () =>
      ipcRenderer.invoke("authentication-authenticate-github-app"),
    storePAT: (token: string) =>
      ipcRenderer.invoke("authentication-store-pat", token),
    removeAuthenticationCode: (handler: IpcListener<AuthenticationCode>) =>
      ipcRenderer.removeListener("authentication-auth-code", handler),
    onAuthenticationCode: (callback: (data: AuthenticationCode) => void) => {
      const handler: IpcListener<AuthenticationCode> = (_event, data) => {
        callback(data);
      };
      ipcRenderer.on("authentication-auth-code", handler);
      return handler;
    },
    getUser: () => ipcRenderer.invoke("authentication-get-user"),

    onInvalidPATaccess: (callback: (message: string) => void) => {
      const handler: IpcListener<string> = (_event, data) => {
        callback(data);
      };
      ipcRenderer.on("authentication-invalid-PAT", handler);
      return handler;
    },

    removeOnInvalidPATaccess: (handler: IpcListener<string>) =>
      ipcRenderer.removeListener("authentication-invalid-PAT", handler),
  },

  // License Key
  license: {
    activate: (licenseKey: string) => {
      return ipcRenderer.invoke("license-activate", licenseKey);
    },
    getStatus: () => {
      return ipcRenderer.invoke("license-get-status");
    },
    validate: () => {
      return ipcRenderer.invoke("license-validate");
    },
    setUsage: (usage: "personal" | "commercial") => {
      return ipcRenderer.invoke("license-set-usage", usage);
    },
    deactivate: () => {
      return ipcRenderer.invoke("license-deactivate");
    },
    markExpiryReminderShown: () => {
      return ipcRenderer.invoke("license-mark-expiry-reminder-shown");
    },
  },

  repository: {
    query: () => ipcRenderer.invoke("repositories-query"),
    onUpdate: (callback: (data: RepositoriesCache) => void) => {
      const handler: IpcListener<RepositoriesCache> = (_event, data) =>
        callback(data);
      ipcRenderer.on("repository-update", handler);
      return handler;
    },
    removeOnUpdate: (handler: IpcListener<RepositoriesCache>) =>
      ipcRenderer.removeListener("repository-update", handler),
    setEnableState: (activeRepository: Record<number, boolean>) =>
      ipcRenderer.invoke("repository-set-enable-state", activeRepository),
  },

  pullRequest: {
    query: () => ipcRenderer.invoke("pull-requests-query"),
    onUpdate: (callback: (data: PullRequest) => void) => {
      const handler: IpcListener<PullRequest> = (_event, data) => callback(data);
      ipcRenderer.on("pull-request-update", handler);
      return handler;
    },
    removeOnUpdate: (handler: IpcListener<PullRequest>) =>
      ipcRenderer.removeListener("pull-request-update", handler),
  },
});
