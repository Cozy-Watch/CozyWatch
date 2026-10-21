/** @jest-environment jsdom */
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import { GithubAuthentication } from "./GithubAuthentication";
jest.mock("./api/usePATauthenticationMutation", () => ({ usePATauthenticationMutation: () => ({ error: null, mutateAsync: jest.fn() }) }));
jest.mock("./useGithubAuthentication", () => ({ useAuthentication: () => ({
  data: { authData: { user_code: "ABCD-EFGH", verification_uri: "https://github.com/login/device" } },
  action: { authenticate: jest.fn(), authenticateGitHubApp: jest.fn(), setAuthData: jest.fn() },
}) }));
jest.mock("../../api/useLicenseStatusQuery", () => ({ useLicenseStatusQuery: () => ({ data: { status: "trial" } }) }));
const writeText = jest.fn();
let container: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  writeText.mockReset();
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<Theme><GithubAuthentication /></Theme>));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const copy = async () => {
  const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Copy code");
  if (!button) throw new Error("Copy button missing");
  await act(async () => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
};
it("copies the displayed code and confirms what to do next", async () => {
  writeText.mockResolvedValue(undefined);
  await copy();
  expect(writeText).toHaveBeenCalledWith("ABCD-EFGH");
  expect(container.querySelector('[role="status"]')?.textContent).toContain("Paste it on GitHub");
});
it("offers manual copying when clipboard access fails", async () => {
  writeText.mockRejectedValue(new Error("Clipboard unavailable"));
  await copy();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("copy it manually");
});
