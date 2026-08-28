import { shell } from "electron";
import type { WebContents } from "electron";
import log from "electron-log/main";

const EXTERNAL_URL_PROTOCOL = "https:";

export const isSafeExternalUrl = (url: unknown): url is string => {
  if (typeof url !== "string") {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.protocol === EXTERNAL_URL_PROTOCOL &&
      parsedUrl.hostname.length > 0
    );
  } catch {
    return false;
  }
};

export const openExternalUrl = async (url: unknown) => {
  if (!isSafeExternalUrl(url)) {
    throw new Error("Only valid HTTPS URLs can be opened externally.");
  }

  await shell.openExternal(url);
};

export const tryOpenExternalUrl = (url: unknown) => {
  if (!isSafeExternalUrl(url)) {
    log.warn("[Security] blocked unsafe external URL", { url });
    return false;
  }

  void shell.openExternal(url).catch((error) => {
    log.warn("[Security] failed to open external URL", { error, url });
  });
  return true;
};

export const isAllowedRendererUrl = (url: string, rendererUrl: string) => {
  try {
    const allowedUrl = new URL(rendererUrl);
    const targetUrl = new URL(url);

    if (allowedUrl.protocol === "file:") {
      return (
        targetUrl.protocol === "file:" &&
        targetUrl.pathname === allowedUrl.pathname
      );
    }

    return targetUrl.origin === allowedUrl.origin;
  } catch {
    return false;
  }
};

export const protectWebContents = (
  webContents: WebContents,
  rendererUrl: string,
) => {
  const preventUnexpectedNavigation = (event: Electron.Event, url: string) => {
    if (!isAllowedRendererUrl(url, rendererUrl)) {
      log.warn("[Security] blocked navigation", { url });
      event.preventDefault();
    }
  };

  webContents.on("will-navigate", preventUnexpectedNavigation);
  webContents.on("will-redirect", preventUnexpectedNavigation);
  webContents.setWindowOpenHandler(({ url }) => {
    tryOpenExternalUrl(url);

    return { action: "deny" };
  });
};
