import { autoUpdater, dialog } from "electron";
import type { IUpdateInfo } from "update-electron-app";
import { getReleaseViewNotes } from "./releaseViewNotes";
import { notifyAppUpdate } from "./notifyAppUpdate";

jest.mock("./releaseViewNotes", () => ({ getReleaseViewNotes: jest.fn().mockResolvedValue(null) }));

jest.mock("electron", () => ({
  autoUpdater: { quitAndInstall: jest.fn() },
  dialog: { showMessageBox: jest.fn() },
}));
jest.mock("electron-log", () => ({ warn: jest.fn() }));

const info = {
  releaseName: "Cozy Watch 0.10.0",
  releaseNotes: "Clearer overview activity and improved review cards.",
} as IUpdateInfo;
const showMessageBox = jest.mocked(dialog.showMessageBox);
beforeEach(() => jest.clearAllMocks());

it("shows release notes and lets the user defer restarting", async () => {
  showMessageBox.mockResolvedValue({ response: 1, checkboxChecked: false });
  await notifyAppUpdate(info);
  expect(showMessageBox).toHaveBeenCalledWith(expect.objectContaining({
    detail: expect.stringContaining(info.releaseNotes),
    defaultId: 1,
    cancelId: 1,
  }));
  expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
});

it("restarts only when the user chooses restart", async () => {
  showMessageBox.mockResolvedValue({ response: 0, checkboxChecked: false });
  await notifyAppUpdate(info);
  expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
});

it("handles missing notes without showing an empty What's new section", async () => {
  showMessageBox.mockResolvedValue({ response: 1, checkboxChecked: false });
  await notifyAppUpdate({ ...info, releaseNotes: "" });
  expect(showMessageBox).toHaveBeenCalledWith(expect.objectContaining({
    detail: expect.stringContaining("Release notes are unavailable"),
  }));
});

it("does not restart when the prompt fails", async () => {
  showMessageBox.mockRejectedValue(new Error("Dialog unavailable"));
  await expect(notifyAppUpdate(info)).resolves.toBeUndefined();
  expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
});

it("adds published highlights while preserving the existing release notes", async () => {
  jest.mocked(getReleaseViewNotes).mockResolvedValueOnce("New highlights from ReleaseView");
  showMessageBox.mockResolvedValue({ response: 1, checkboxChecked: false });
  await notifyAppUpdate(info);
  const options = showMessageBox.mock.calls[0][0];
  expect(options.detail).toContain("New highlights from ReleaseView");
  expect(options.detail).toContain(info.releaseNotes);
  expect(getReleaseViewNotes).toHaveBeenCalledWith(info.releaseName);
});

it("prevents overlapping update prompts and repeated requests while one is open", async () => {
  let close: (value: {response: number; checkboxChecked: boolean}) => void = () => undefined;
  showMessageBox.mockImplementationOnce(() => new Promise(resolve => { close = resolve; }));
  const first = notifyAppUpdate(info);
  await Promise.resolve();
  await notifyAppUpdate(info);
  expect(getReleaseViewNotes).toHaveBeenCalledTimes(1);
  close({ response: 1, checkboxChecked: false });
  await first;
  showMessageBox.mockResolvedValue({ response: 1, checkboxChecked: false });
  await notifyAppUpdate(info);
  expect(showMessageBox).toHaveBeenCalledTimes(2);
});
