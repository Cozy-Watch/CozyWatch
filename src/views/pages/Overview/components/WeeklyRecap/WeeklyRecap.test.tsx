/** @jest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WeeklyRecap } from "./WeeklyRecap";
import { getLastCompletedWeekStart } from "../../../../../weeklyRecap/metrics";
import type { PersonalWeeklyRecap } from "../../../../../weeklyRecap/types";

jest.mock("../../../../api/useUserQuery", () => ({
  useUserQuery: () => ({ data: { id: 1 } }),
}));

let container: HTMLDivElement;
let root: Root;
let client: QueryClient;
const personal = jest.fn();
const recap: PersonalWeeklyRecap = {
  weekStart: getLastCompletedWeekStart(),
  weekEnd: "2026-10-11",
  mergedCount: 7,
  reviewedCount: 3,
  repositoryCount: 2,
  previousMergedCount: 5,
  fetchedAt: new Date().toISOString(),
};

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.assign(window, { electronAPI: { weeklyRecap: { personal } } });
  personal.mockReset().mockResolvedValue(recap);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
});

const render = async (visible: boolean) => {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        {visible ? <WeeklyRecap /> : null}
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
};

it("keeps the weekly stats when leaving and returning to Overview without refetching fresh data", async () => {
  await render(true);
  await render(true);
  expect(container.textContent).toContain("You shipped 7 PRs");
  await render(false);
  await render(true);
  expect(container.textContent).toContain("You shipped 7 PRs");
  expect(personal).toHaveBeenCalledTimes(1);
});

it("keeps stale stats visible during background refresh and after a refresh failure", async () => {
  client.setQueryData(["weeklyRecap", 1, recap.weekStart], recap, { updatedAt: 1 });
  let rejectRefresh!: (reason: Error) => void;
  personal.mockImplementation(() => new Promise((_, reject) => { rejectRefresh = reject; }));
  await render(true);
  expect(container.textContent).toContain("You shipped 7 PRs");
  expect(container.querySelector('[aria-label="Refreshing weekly recap"]')).not.toBeNull();

  await act(async () => {
    rejectRefresh(new Error("Offline"));
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  expect(container.textContent).toContain("You shipped 7 PRs");
  expect(container.querySelector('[aria-label="Refreshing weekly recap"]')).toBeNull();
});
