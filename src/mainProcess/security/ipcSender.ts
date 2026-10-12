import type { IpcMainInvokeEvent } from "electron";
import { isAllowedRendererUrl } from "./externalUrl";

export const isTrustedRendererSender = (
  event: IpcMainInvokeEvent,
  trustedWebContentsIds: readonly number[],
  rendererUrl: string,
) => {
  if (!trustedWebContentsIds.includes(event.sender.id)) return false;
  const frame = event.senderFrame;
  if (!frame || frame !== event.sender.mainFrame) return false;
  return isAllowedRendererUrl(frame.url, rendererUrl);
};
