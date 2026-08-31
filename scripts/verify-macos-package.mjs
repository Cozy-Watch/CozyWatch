import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  FuseState,
  FuseV1Options,
  getCurrentFuseWire,
} from "@electron/fuses";

const execFileAsync = promisify(execFile);
const APP_NAME = "Cozy Watch.app";
const EXECUTABLE_NAME = "Cozy Watch";
const RENDERER_READY_MARKER = "COZYWATCH_RELEASE_SMOKE_RENDERER_READY";
const RENDERER_STARTUP_TIMEOUT_MS = 15_000;
const SHUTDOWN_GRACE_PERIOD_MS = 5_000;

const expectedFuseStates = new Map([
  [FuseV1Options.RunAsNode, FuseState.DISABLE],
  [FuseV1Options.EnableCookieEncryption, FuseState.ENABLE],
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable, FuseState.DISABLE],
  [FuseV1Options.EnableNodeCliInspectArguments, FuseState.DISABLE],
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation, FuseState.ENABLE],
  [FuseV1Options.OnlyLoadAppFromAsar, FuseState.ENABLE],
  [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot, FuseState.DISABLE],
  // The renderer is loaded from the packaged app's file:// URL. Electron
  // requires this privilege for file:// resources inside an ASAR archive.
  [FuseV1Options.GrantFileProtocolExtraPrivileges, FuseState.ENABLE],
  [FuseV1Options.WasmTrapHandlers, FuseState.ENABLE],
]);

const delay = (duration) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration);
  });

const findAppPath = async (outputPath) => {
  if (outputPath.endsWith(".app")) {
    return outputPath;
  }

  const expectedPath = path.join(outputPath, APP_NAME);
  const entries = await readdir(outputPath, { withFileTypes: true });
  const appDirectories = entries.filter(
    (entry) => entry.isDirectory() && entry.name.endsWith(".app"),
  );

  if (appDirectories.some((entry) => entry.name === APP_NAME)) {
    return expectedPath;
  }

  if (appDirectories.length !== 1) {
    throw new Error(
      `Expected one packaged macOS app in ${outputPath}, found ${appDirectories.length}.`,
    );
  }

  return path.join(outputPath, appDirectories[0].name);
};

const verifyFuses = async (appPath) => {
  const fuseWire = await getCurrentFuseWire(appPath);

  for (const [fuse, expectedState] of expectedFuseStates) {
    const actualState = fuseWire[fuse];

    if (actualState !== expectedState) {
      throw new Error(
        `${FuseV1Options[fuse]} is ${FuseState[actualState]}, expected ${FuseState[expectedState]}.`,
      );
    }
  }
};

const verifyTrust = async (appPath) => {
  await execFileAsync("codesign", [
    "--verify",
    "--deep",
    "--strict",
    "--verbose=2",
    appPath,
  ]);
  await execFileAsync("spctl", [
    "--assess",
    "--type",
    "execute",
    "--verbose=4",
    appPath,
  ]);
};

const verifyStartup = async (appPath) => {
  const { spawn } = await import("node:child_process");
  const userDataDirectory = await mkdtemp(
    path.join(os.tmpdir(), "cozy-watch-release-smoke-"),
  );
  const executablePath = path.join(
    appPath,
    "Contents",
    "MacOS",
    EXECUTABLE_NAME,
  );
  const output = [];
  let reportRendererReady;
  const rendererReady = new Promise((resolve) => {
    reportRendererReady = resolve;
  });
  const appProcess = spawn(
    executablePath,
    [`--user-data-dir=${userDataDirectory}`],
    {
      env: {
        ...process.env,
        COZYWATCH_RELEASE_SMOKE_TEST: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  appProcess.stdout.on("data", (chunk) => {
    output.push(chunk.toString());
    if (output.join("").includes(RENDERER_READY_MARKER)) {
      reportRendererReady({ rendererReady: true });
    }
  });
  appProcess.stderr.on("data", (chunk) => output.push(chunk.toString()));

  const startupResult = await Promise.race([
    new Promise((resolve) => {
      appProcess.once("error", (error) => resolve({ error }));
      appProcess.once("exit", (code, signal) => resolve({ code, signal }));
    }),
    rendererReady,
    delay(RENDERER_STARTUP_TIMEOUT_MS).then(() => null),
  ]);

  try {
    if (!startupResult) {
      throw new Error(
        `Packaged app did not load its renderer within ${RENDERER_STARTUP_TIMEOUT_MS}ms.\n${output.join("")}`,
      );
    }

    if (!("rendererReady" in startupResult)) {
      const detail =
        "error" in startupResult
          ? startupResult.error.message
          : `exit code ${startupResult.code}, signal ${startupResult.signal}`;
      throw new Error(
        `Packaged app terminated during startup (${detail}).\n${output.join("")}`,
      );
    }

  } finally {
    if (appProcess.exitCode === null && appProcess.signalCode === null) {
      appProcess.kill("SIGTERM");
      await Promise.race([
        new Promise((resolve) => appProcess.once("exit", resolve)),
        delay(SHUTDOWN_GRACE_PERIOD_MS),
      ]);

      if (appProcess.exitCode === null && appProcess.signalCode === null) {
        appProcess.kill("SIGKILL");
      }
    }

    await rm(userDataDirectory, { force: true, recursive: true });
  }
};

export const verifyMacosPackage = async (
  outputPath,
  { verifyTrust: shouldVerifyTrust },
) => {
  const appPath = await findAppPath(outputPath);

  await verifyFuses(appPath);

  if (shouldVerifyTrust) {
    await verifyTrust(appPath);
  }

  await verifyStartup(appPath);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outputPath = process.argv[2];

  if (!outputPath) {
    throw new Error(
      "Usage: node scripts/verify-macos-package.mjs <app-or-output-path> [--verify-trust]",
    );
  }

  await verifyMacosPackage(outputPath, {
    verifyTrust: process.argv.includes("--verify-trust"),
  });
}
