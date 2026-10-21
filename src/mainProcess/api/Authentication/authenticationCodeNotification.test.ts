import { EventEmitter } from "node:events";
const created: Array<EventEmitter & { show: jest.Mock; close: jest.Mock }> = [];
const supported = jest.fn(() => true);
jest.mock("electron", () => ({
  Notification: Object.assign(jest.fn(() => {
    const notification = Object.assign(new EventEmitter(), { show: jest.fn(), close: jest.fn() });
    created.push(notification);
    return notification;
  }), { isSupported: supported }),
}));
jest.mock("electron-log", () => ({ warn: jest.fn() }));
jest.mock("../../security/externalUrl", () => ({ tryOpenExternalUrl: jest.fn() }));
import { Notification } from "electron";
import { tryOpenExternalUrl } from "../../security/externalUrl";
import { clearAuthenticationCodeNotification, showAuthenticationCodeNotification } from "./authenticationCodeNotification";

beforeEach(() => { clearAuthenticationCodeNotification(); created.length = 0; jest.clearAllMocks(); supported.mockReturnValue(true); });
afterEach(() => clearAuthenticationCodeNotification());

it("immediately shows the code and opens the verification page on click", () => {
  showAuthenticationCodeNotification("ABCD-EFGH", "https://github.com/login/device");
  expect(Notification).toHaveBeenCalledWith(expect.objectContaining({ body: expect.stringContaining("ABCD-EFGH") }));
  expect(created[0].show).toHaveBeenCalledTimes(1);
  created[0].emit("click");
  expect(tryOpenExternalUrl).toHaveBeenCalledWith("https://github.com/login/device");
});
it("closes the previous code and clears the current notification after authentication", () => {
  showAuthenticationCodeNotification("OLD-CODE", "https://github.com/login/device");
  const previous = created[0];
  showAuthenticationCodeNotification("NEW-CODE", "https://github.com/login/device");
  expect(previous.close).toHaveBeenCalledTimes(1);
  clearAuthenticationCodeNotification();
  expect(created[1].close).toHaveBeenCalledTimes(1);
});
it("does not block authentication when notifications are unsupported", () => {
  supported.mockReturnValue(false);
  expect(() => showAuthenticationCodeNotification("ABCD-EFGH", "https://github.com/login/device")).not.toThrow();
  expect(Notification).not.toHaveBeenCalled();
});
