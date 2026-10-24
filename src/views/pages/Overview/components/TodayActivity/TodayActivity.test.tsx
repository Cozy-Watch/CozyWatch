/** @jest-environment jsdom */
import { Theme } from "@radix-ui/themes";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { NotificationRecord } from "../../../../../mainProcess/safeStorage/safeStorage.types";
import { useNotifications } from "../../../../hooks/useNotifications";
import { describeActivity, getTodayNotifications, TodayActivity } from "./TodayActivity";

jest.mock("@tanstack/react-router", () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock("../../../../hooks/useNotifications", () => ({
  useNotifications: jest.fn(),
}));

const mockUseNotifications = jest.mocked(useNotifications);
const today = new Date(2026, 9, 23, 12);
const notification = (
  id: string,
  createdAt: string,
  overrides: Partial<NotificationRecord> = {},
): NotificationRecord => ({
  id,
  type: "mention",
  title: "You have been mentioned",
  body: "sam mentioned you in ‘Refine dashboard’. ",
  createdAt,
  url: "https://github.com/org/repo/pull/8#issuecomment-1",
  source: { repository: "org/repo", pullNumber: 8 },
  read: false,
  ...overrides,
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  jest.useFakeTimers().setSystemTime(today);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  mockUseNotifications.mockReturnValue({
    data: [],
    isPending: false,
  } as unknown as ReturnType<typeof useNotifications>);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.useRealTimers();
});

it("keeps only today's notifications and orders them newest first", () => {
  const notifications = [
    notification("older", new Date(2026, 9, 23, 9).toISOString()),
    notification("yesterday", new Date(2026, 9, 22, 23).toISOString()),
    notification("newer", new Date(2026, 9, 23, 11).toISOString()),
  ];

  expect(getTodayNotifications(notifications, today).map(({ id }) => id)).toEqual([
    "newer",
    "older",
  ]);
});

it("explains who mentioned the user and where", () => {
  expect(
    describeActivity(
      notification("mention", today.toISOString(), {
        body: 'sam mentioned you in "Refine dashboard".',
      }),
    ),
  ).toEqual({
    title: "You were mentioned by @sam",
    body: "In “Refine dashboard”.",
  });
});

it.each([
  ["approved it", "Approved · @alex"],
  ["requested some changes", "Requested changes · @alex"],
])("states the review outcome: %s", (outcome, title) => {
  expect(
    describeActivity(
      notification("review", today.toISOString(), {
        type: "review",
        title: "New Review",
        body: `alex reviewed "Fix sync" and ${outcome}.`,
      }),
    ),
  ).toEqual({ title, body: "On “Fix sync”." });
});

it.each([
  ["success", "Checks passed"],
  ["danger", "Checks need attention"],
])("states the CI outcome: %s", (tone, title) => {
  expect(
    describeActivity(
      notification("ci", today.toISOString(), {
        type: "ci",
        title: 'CI "Unit tests" Status Update',
        body: 'Pull Request "Fix sync" status changed from success to failure.',
        tone: tone as NotificationRecord["tone"],
      }),
    ),
  ).toEqual({
    title,
    body: 'Unit tests · Pull Request "Fix sync" status changed from success to failure.',
  });
});

it("shows the event details and a direct GitHub link", async () => {
  const item = notification("mention", new Date(2026, 9, 23, 10).toISOString());
  mockUseNotifications.mockReturnValue({
    data: [item],
    isPending: false,
  } as unknown as ReturnType<typeof useNotifications>);

  await act(async () => {
    root.render(
      <Theme>
        <TodayActivity />
      </Theme>,
    );
  });

  expect(container.textContent).toContain("Today (1)");
  expect(container.textContent).toContain("sam mentioned you");
  expect(container.querySelector('a[href="https://github.com/org/repo/pull/8#issuecomment-1"]')).not.toBeNull();
});

it("does not imply all reviews are complete when no activity is recorded", async () => {
  mockUseNotifications.mockReturnValue({
    data: [notification("yesterday", new Date(2026, 9, 22, 23).toISOString())],
    isPending: false,
  } as unknown as ReturnType<typeof useNotifications>);

  await act(async () => {
    root.render(
      <Theme>
        <TodayActivity />
      </Theme>,
    );
  });

  expect(container.textContent).toContain("No updates recorded today");
  expect(container.textContent).toContain("when their notifications are enabled");
});

 it("shows a load error instead of an empty activity state", async () => {
  mockUseNotifications.mockReturnValue({ data: undefined, isPending: false, error: new Error("offline") } as unknown as ReturnType<typeof useNotifications>);
  await act(async () => { root.render(<Theme><TodayActivity /></Theme>); });
  expect(container.textContent).toContain("Could not load today’s activity");
  expect(container.textContent).not.toContain("No updates recorded today");
});
