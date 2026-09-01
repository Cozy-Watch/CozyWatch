import type { IpcRendererEvent } from "electron";
import { CacheData as PullRequestDTO } from "./mainProcess/api/PullRequests/utils/getDefaultData";
import {
  RepositoriesCache,
  User,
  Appearance,
  NotificationSettingsPerKey,
} from "./mainProcess/safeStorage/safeStorage.types";
import {
  LicenseState,
  LicenseUsage,
} from "./mainProcess/licensing/licenseState.types";

export {};

type GetRepositories = Omit<RepositoriesCache, "lastFetched">;
type IpcListener<T> = (event: IpcRendererEvent, data: T) => void;
type AuthenticationCode = {
  verification_uri: string;
  user_code: string;
};

declare global {
  const __COZYWATCH_OFFICIAL_BUILD__: boolean;
  const __COZYWATCH_DIAGNOSTICS_BUILD__: boolean;

  interface Window {
    electronAPI: {
      application: {
        setApplicationAppearance: (appearance: Appearance | null) => void;
        getApplicationAppearance: () => Promise<Appearance | null>;

        // Menubar Density
        getMenubarDensity: () => Promise<"compact" | "default">;
        setMenubarDensity: (
          density: "compact" | "default",
        ) => Promise<"compact" | "default">;

        onApplicationAppearanceUpdate: (
          callback: (data: Appearance) => void,
        ) => IpcListener<Appearance>;
        removeOnApplicationAppearanceUpdate: (
          callback: IpcListener<Appearance>,
        ) => void;

        onSignOut: (callback: (data: boolean) => void) => IpcListener<boolean>;
        removeOnSignOut: (callback: IpcListener<boolean>) => void;

        signUser: (status: boolean) => void;
        onSignUser: (callback: (status: boolean) => void) => IpcListener<boolean>;
        removeOnSignUser: (handler: IpcListener<boolean>) => void;

        getNotificationsSettings: () => Promise<NotificationSettingsPerKey>;
        setToggleAllNotifications: (enabled: boolean) => Promise<void>;
        setNotificationSetting: ({
          checked,
          key,
        }: {
          checked: boolean;
          key: string;
        }) => Promise<NotificationSettingsPerKey>;

        getStartAtLogin: () => Promise<boolean>;
        setStartAtLogin: (isOpenAtLogin: boolean) => Promise<boolean>;

        refreshPoll: () => void;

        getDiagnosticsStatus: () => Promise<{ enabled: boolean }>;
        exportDiagnosticsBundle: () => Promise<{ saved: boolean }>;
        reportRendererReady: () => Promise<void>;

        navigateToRoute: (route: "settings" | "signIn") => void;
        onNavigateToRoute: (
          callback: (route: "settings" | "signIn") => void,
        ) => IpcListener<"settings" | "signIn">;
        removeOnNavigateToRoute: (
          callback: IpcListener<"settings" | "signIn">,
        ) => void;
      };

      // Security Storage
      deleteAllData: () => void;

      authentication: {
        isStored: () => Promise<boolean>;
        authenticateGitHub: () => Promise<boolean>;
        authenticateGitHubApp: () => Promise<boolean>;
        storePAT: (token: string) => Promise<{
          success: boolean;
          reason?: string;
          isRemoteValidation?: boolean;
        }>;
        onAuthenticationCode: (
          callback: (data: AuthenticationCode) => void,
        ) => IpcListener<AuthenticationCode>;
        removeAuthenticationCode: (
          callback: IpcListener<AuthenticationCode>,
        ) => void;
        getUser: () => Promise<User>;

        onInvalidPATaccess: (
          callback: (message: string) => void,
        ) => IpcListener<string>;
        removeOnInvalidPATaccess: (callback: IpcListener<string>) => void;
      };

      repository: {
        query: () => Promise<GetRepositories>;
        onUpdate: (
          callback: (data: RepositoriesCache) => void,
        ) => IpcListener<RepositoriesCache>;
        removeOnUpdate: (callback: IpcListener<RepositoriesCache>) => void;
        setEnableState: (
          activeRepositories: Record<number, boolean>,
        ) => Promise<unknown>;
      };

      pullRequest: {
        query: () => Promise<PullRequestDTO>;
        onUpdate: (
          callback: (data: PullRequestDTO) => void,
        ) => IpcListener<PullRequestDTO>;
        removeOnUpdate: (callback: IpcListener<PullRequestDTO>) => void;
      };

      // License Key
      license: {
        activate: (licenseKey: string) => Promise<LicenseState>;
        getStatus: () => Promise<LicenseState>;
        validate: () => Promise<LicenseState>;
        setUsage: (usage: LicenseUsage) => Promise<LicenseState>;
        deactivate: () => Promise<LicenseState>;
        markExpiryReminderShown: () => Promise<LicenseState>;
      };

      // Open external URL
      openExternalLink: (url: string) => void;
      // Copy to Clipboard
      copyToClipboard: (text: string) => void;
    };
  }
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
