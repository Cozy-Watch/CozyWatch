/** @jest-environment jsdom */
import { Theme } from "@radix-ui/themes";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePullRequest } from "../../../../hooks/usePullRequests";
import { useOverView } from "../../useOverview";
import { Stats } from "./Stats";

jest.mock("@tanstack/react-router", () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock("../../../../hooks/usePullRequests", () => ({
  usePullRequest: jest.fn(),
}));

jest.mock("../../useOverview", () => ({
  useOverView: jest.fn(),
}));

const mockUsePullRequest = jest.mocked(usePullRequest);
const mockUseOverView = jest.mocked(useOverView);
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  mockUseOverView.mockReturnValue({ isFetching: false } as ReturnType<typeof useOverView>);
  mockUsePullRequest.mockReturnValue({
    data: {
      waitingMyReview: [],
      waitingReview: [],
      fullyApproved: [],
      myPullRequests: [],
    },
    isFetching: false,
  } as unknown as ReturnType<typeof usePullRequest>);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

it("celebrates when no reviews need the user's attention", async () => {
  await act(async () => {
    root.render(
      <Theme>
        <Stats />
      </Theme>,
    );
  });

  expect(container.textContent).toContain("Waiting my review");
  expect(container.textContent).toContain("All caught up");
  expect(container.textContent).toContain("Waiting to be reviewed");
  expect(container.textContent).toContain("No reviews outstanding");
  expect(container.querySelectorAll('[style*="green-a2"]')).toHaveLength(2);
});

it("keeps the normal attention states when reviews are waiting", async () => {
  mockUsePullRequest.mockReturnValue({
    data: {
      waitingMyReview: [{}],
      waitingReview: [{}],
      fullyApproved: [],
      myPullRequests: [{}],
    },
    isFetching: false,
  } as unknown as ReturnType<typeof usePullRequest>);

  await act(async () => {
    root.render(
      <Theme>
        <Stats />
      </Theme>,
    );
  });

  expect(container.textContent).not.toContain("All caught up");
  expect(container.textContent).not.toContain("No reviews outstanding");
});
