import { AuthenticateDTO } from "./mainProcess/api/Authentication/authentication";
import { CacheData as PullRequestDTO } from "./mainProcess/api/PullRequests/utils/getDefaultData";
import {
  StoreDataName,
  RepositoriesCache,
  User,
  Appearance,
  PullRequests,
  NotificationSettingsPerKey,
  NotificationSetting,
} from "./mainProcess/safeStorage/safeStorage.types";
import {
  LicenseState,
  LicenseUsage,
} from "./mainProcess/licensing/licenseState.types";

export {};

interface GetRepositories extends Omit<RepositoriesCache, "lastFetched"> {}

declare global {
  const __COZYWATCH_OFFICIAL_BUILD__: boolean;

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

        onApplicationAppearanceUpdate: (callback) => Promise<any>;
        removeOnApplicationAppearanceUpdate: (callback) => Promise<any>;

        onSignOut: (callback) => void;
        removeOnSignOut: (callback) => void;

        signUser: (status: boolean) => void;
        onSignUser: (callback: (status: boolean) => void) => void;
        removeOnSignUser: (handleSettingRoute: any) => void;

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

        navigateToRoute: (route: "settings" | "signIn") => void;
        onNavigateToRoute: (
          callback: (route: "settings" | "signIn") => void,
        ) => void;
        removeOnNavigateToRoute: (callback) => void;
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
        onAuthenticationCode: (callback) => Promise<any>;
        removeAuthenticationCode: (callback) => Promise<any>;
        getUser: () => Promise<User>;

        onInvalidPATaccess: (callback) => Promise<any>;
        removeOnInvalidPATaccess: (callback) => Promise<any>;
      };

      repository: {
        query: () => Promise<GetRepositories>;
        onUpdate: (callback: (data: RepositoriesCache) => void) => Promise<any>;
        removeOnUpdate: (callback) => Promise<any>;
        setEnableState: (
          activeRepositories: Record<number, boolean>,
        ) => Promise<any>;
      };

      pullRequest: {
        query: () => Promise<PullRequestDTO>;
        onUpdate: (callback: (data: PullRequestDTO) => void) => Promise<any>;
        removeOnUpdate: (callback) => Promise<any>;
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
