import { app } from "electron";
import Logger from "electron-log";
import {
  updateElectronApp,
  UpdateSourceType,
} from "update-electron-app";

export const appUpdate = () => {
  if (!app.isPackaged || !__COZYWATCH_OFFICIAL_BUILD__) {
    Logger.info("[Update] Disabled for development and contributor builds");
    return;
  }

  updateElectronApp({
    logger: Logger,
    updateInterval: "1 hour",
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: "Cozy-Watch/CozyWatch",
    },
  });
};
