import { app } from "electron";
import Logger from "electron-log";
import {
  updateElectronApp,
  UpdateSourceType,
} from "update-electron-app";

import { notifyAppUpdate } from "./notifyAppUpdate";

export const appUpdate = () => {
  if (!app.isPackaged || !__COZYWATCH_OFFICIAL_BUILD__) {
    Logger.info("[Update] Disabled for development and contributor builds");
    return;
  }

  updateElectronApp({
    logger: Logger,
    onNotifyUser: (info) => { void notifyAppUpdate(info); },
    updateInterval: "1 hour",
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: "Cozy-Watch/CozyWatch",
    },
  });
};
