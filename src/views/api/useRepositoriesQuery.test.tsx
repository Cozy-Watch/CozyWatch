/** @jest-environment jsdom */
// Repository pushes and initial IPC responses share one normalized shape.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRepositoriesQuery, queryKey } from "./useRepositoriesQuery";
import type { RepositoriesCache } from "../../mainProcess/safeStorage/safeStorage.types";

it("raw repository pushes update the normalized visible list", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  let receive: (value: RepositoriesCache) => void = () => undefined;
  Object.assign(window, { electronAPI: { repository: {
    onUpdate: (callback: typeof receive) => { receive = callback; return callback; },
    removeOnUpdate: jest.fn(), query: jest.fn(),
  } } });
  const client = new QueryClient();
  client.setQueryData(queryKey, { repositories: [{ id: 1, name: "old" }], activeRepositories: { 1: true } });
  const Probe = () => { const query = useRepositoriesQuery(); return <span>{query.data?.repositories.length}</span>; };
  const container = document.createElement("div"), root = createRoot(container);
  try {
    await act(async () => root.render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>));
    await act(async () => receive({ repositoriesByPage: { 1: [{ id: 1, name: "old" }, { id: 2, name: "new" }] as never }, activeRepositories: { 1: true, 2: true } }));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(client.getQueryData(queryKey)).toMatchObject({ repositories: [{ id: 1 }, { id: 2 }] });
    expect(container.textContent).toBe("2");
  } finally { await act(async () => root.unmount()); client.clear(); }
});

it("keeps an early repository push when the initial IPC response resolves later", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  let receive: (value: RepositoriesCache) => void = () => undefined;
  let resolve: (value: RepositoriesCache) => void = () => undefined;
  const response = new Promise<RepositoriesCache>(complete => { resolve = complete; });
  Object.assign(window, { electronAPI: { repository: {
    onUpdate: (callback: typeof receive) => { receive = callback; return callback; },
    removeOnUpdate: jest.fn(), query: () => response,
  } } });
  const client = new QueryClient();
  const Probe = () => { const query = useRepositoriesQuery(); return <span>{query.data?.repositories.length}</span>; };
  const container = document.createElement("div"), root = createRoot(container);
  try {
    await act(async () => root.render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>));
    await act(async () => receive({ repositoriesByPage: { 1: [{ id: 1 }, { id: 2 }] as never }, activeRepositories: { 2: true } }));
    await act(async () => { resolve({ repositoriesByPage: {}, activeRepositories: {} }); await response; });
    expect(client.getQueryData(queryKey)).toMatchObject({ repositories: [{ id: 1 }, { id: 2 }], activeRepositories: { 2: true } });
  } finally { await act(async () => root.unmount()); client.clear(); }
});
