jest.mock("electron", () => ({ shell: { openExternal: jest.fn() } }));
import type { IpcMainInvokeEvent } from "electron";
import { isTrustedRendererSender } from "./ipcSender";

const rendererUrl = "file:///app/renderer/index.html";
const mainFrame = { url: `${rendererUrl}#/menubar` };
const sender = { id: 1, mainFrame, getURL: () => rendererUrl };
const event = { sender, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent;

describe("IPC sender security", () => {
  it("accepts the trusted main frame with an app route", () => {
    expect(isTrustedRendererSender(event, [1], rendererUrl)).toBe(true);
  });
  it("rejects another window", () => {
    expect(isTrustedRendererSender(event, [2], rendererUrl)).toBe(false);
  });
  it.each([null, { url: rendererUrl }, { url: "https://attacker.example" }])(
    "rejects missing or child frames even when the window is trusted",
    (senderFrame) => {
      expect(isTrustedRendererSender({ ...event, senderFrame } as IpcMainInvokeEvent, [1], rendererUrl)).toBe(false);
    },
  );
  it("rejects a main frame that navigated away", () => {
    const frame = { url: "https://attacker.example" };
    const navigated = { sender: { ...sender, mainFrame: frame }, senderFrame: frame } as unknown as IpcMainInvokeEvent;
    expect(isTrustedRendererSender(navigated, [1], rendererUrl)).toBe(false);
  });
});
