import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { PublisherGithub } from "@electron-forge/publisher-github";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config();

const isOfficialBuild = process.env.COZYWATCH_OFFICIAL_BUILD === "true";
const appleCredentials = {
  appleId: process.env.APPLE_ID,
  appleIdPassword: process.env.APPLE_PASSWORD,
  teamId: process.env.APPLE_TEAM_ID,
};

const getElectronExecutablePath = (buildPath: string, platform: string) => {
  const basePath = path.resolve(buildPath, "../..");

  if (platform === "darwin" || platform === "mas") {
    return path.join(basePath, "MacOS", "Electron");
  }

  return path.join(
    basePath,
    platform === "win32" ? "electron.exe" : "electron",
  );
};

if (
  isOfficialBuild &&
  (!appleCredentials.appleId ||
    !appleCredentials.appleIdPassword ||
    !appleCredentials.teamId)
) {
  throw new Error(
    "Official builds require APPLE_ID, APPLE_PASSWORD, and APPLE_TEAM_ID.",
  );
}

const config: ForgeConfig = {
  hooks: {
    packageAfterCopy: async (
      resolvedConfig,
      buildPath,
      _electronVersion,
      platform,
      arch,
    ) => {
      const { flipFuses, FuseV1Options, FuseVersion } = await import(
        "@electron/fuses"
      );
      const osxSignConfig = resolvedConfig.packagerConfig.osxSign;
      const hasOsxSignConfig =
        (typeof osxSignConfig === "object" &&
          Boolean(Object.keys(osxSignConfig).length)) ||
        Boolean(osxSignConfig);

      await flipFuses(getElectronExecutablePath(buildPath, platform), {
        version: FuseVersion.V1,
        resetAdHocDarwinSignature:
          !hasOsxSignConfig &&
          (platform === "darwin" || platform === "mas") &&
          arch === "arm64",
        strictlyRequireAllFuses: true,
        [FuseV1Options.RunAsNode]: false,
        [FuseV1Options.EnableCookieEncryption]: true,
        [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
        [FuseV1Options.EnableNodeCliInspectArguments]: false,
        [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
        [FuseV1Options.OnlyLoadAppFromAsar]: true,
        [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: true,
        [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
        [FuseV1Options.WasmTrapHandlers]: true,
      });
    },
  },
  packagerConfig: {
    asar: true,
    name: "Cozy Watch",
    icon: "public/images/icon",
    appCategoryType: "public.app-category.developer-tools",
    appBundleId: "com.app.cozywatch",
    osxUniversal: {},
    ...(isOfficialBuild
      ? {
          osxSign: process.env.APPLE_SIGNING_IDENTITY
            ? { identity: process.env.APPLE_SIGNING_IDENTITY }
            : {},
          osxNotarize: {
            appleId: appleCredentials.appleId!,
            appleIdPassword: appleCredentials.appleIdPassword!,
            teamId: appleCredentials.teamId!,
          },
        }
      : {}),
  },
  // rebuildConfig: {},
  makers: [
    new MakerDMG({
      background: "./assets/dmg-background.png",
      icon: "./assets/dmg-icon.png",
      iconSize: 100,
      title: "CozyWatchInstaller",
      overwrite: true,
      additionalDMGOptions: {
        window: {
          size: {
            width: 658,
            height: 498,
          },
        },
      },
      format: "UDZO",
    }),
    new MakerZIP({}, ["darwin"]),
    new MakerSquirrel({}),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: "Cozy-Watch",
        name: "publicCozyWatch",
      },
      draft: false,
      prerelease: false,
      generateReleaseNotes: true,
    }),
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.mts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.mts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mts",
        },
      ],
    }),
  ],
};

export default config;
