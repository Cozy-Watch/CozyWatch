/** @jest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthenticationNotice } from "./AuthenticationNotice";

let container: HTMLDivElement;
let root: Root;
let client: QueryClient;
const getNotice = jest.fn();

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.assign(window, { electronAPI: { authentication: { getNotice } } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
});

const render = async () => {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <AuthenticationNotice />
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
};

it("shows the saved recovery explanation as an alert", async () => {
  getNotice.mockResolvedValue("Your PAT may have expired or been revoked.");
  await render();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "Your PAT may have expired or been revoked.",
  );
});

it("shows no warning for a new or successfully reconnected session", async () => {
  getNotice.mockResolvedValue(null);
  await render();
  expect(container.querySelector('[role="alert"]')).toBeNull();
});
