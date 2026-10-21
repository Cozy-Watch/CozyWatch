/** @jest-environment jsdom */
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import { Header } from "./Header";
import { useNotifications } from "../../../../hooks/useNotifications";

jest.mock("../../../../hooks/useNotifications", () => ({ useNotifications: jest.fn() }));
const navigate = jest.fn();
const refresh = jest.fn();
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.assign(window, { electronAPI: { application: { navigateToRoute: navigate, refreshPoll: refresh } } });
  jest.mocked(useNotifications).mockReturnValue({ data: [{ id: "unread", read: false }] } as ReturnType<typeof useNotifications>);
  navigate.mockClear(); refresh.mockClear();
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const render = async () => {
  await act(async () => root.render(<Theme><Header isCompact={false} name="Alex River" login="alex-river" /></Theme>));
};
const click = async (element: Element | null) => {
  if (!element) throw new Error("Expected a control");
  await act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
};

it("opens the dashboard from the brand and notification history from the bell", async () => {
  await render();
  await click(container.querySelector('[aria-label="Open dashboard"]'));
  expect(navigate).toHaveBeenLastCalledWith("overview");
  await click(container.querySelector('[aria-label="Notifications, 1 unread"]'));
  expect(navigate).toHaveBeenLastCalledWith("notifications");
  expect(container.querySelectorAll("button")).toHaveLength(3);
  expect(container.textContent).not.toContain("Dashboard");
  expect(container.querySelector(".menubar-unread-dot")).not.toBeNull();
});

