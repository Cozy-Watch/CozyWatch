import { autoUpdater, dialog } from "electron";
import Logger from "electron-log";
import type { IUpdateInfo } from "update-electron-app";

import { getReleaseViewNotes } from "./releaseViewNotes";

const MAX_RELEASE_NOTES_LENGTH = 6000;

let promptOpen = false;

export const notifyAppUpdate = async (info: IUpdateInfo) => {
  if (promptOpen) return;
  promptOpen = true;
  try {
    await showAppUpdate(info);
  } catch {
    Logger.warn("[Update] Could not display the update prompt");
  } finally {
    promptOpen = false;
  }
};

const showAppUpdate = async ({ releaseName, releaseNotes }: IUpdateInfo) => {
  const publishedNotes = await getReleaseViewNotes(releaseName);
  const existingNotes = releaseNotes?.trim();
  const notes = [publishedNotes, existingNotes].filter(Boolean).join("\n\n");
  const detail = notes
    ? `What’s new\n\n${notes.slice(0, MAX_RELEASE_NOTES_LENGTH)}${notes.length > MAX_RELEASE_NOTES_LENGTH ? "\n…" : ""}\n\nRestart Cozy Watch to finish installing this update.`
    : "This update is ready to install. Release notes are unavailable for this version.\n\nRestart Cozy Watch to finish installing this update.";

  const { response } = await dialog.showMessageBox({
    type: "info",
    title: "Cozy Watch update",
    message: releaseName?.trim()
      ? `${releaseName.trim()} is ready to install`
      : "A Cozy Watch update is ready to install",
    detail,
    buttons: ["Restart and update", "Later"],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  });
  if (response !== 0) return;
  autoUpdater.quitAndInstall();
};
