/** @jest-environment jsdom */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePullRequestQuery, queryKey } from "./usePullRequestQuery";
import type { CacheData } from "../../mainProcess/api/PullRequests/utils/getDefaultData";

it("keeps the newest cached PR snapshot when an older IPC response arrives and removes its listener on unmount", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  let receive: (value: CacheData) => void = () => undefined;
  let resolve: (value: CacheData) => void = () => undefined;
  const response = new Promise<CacheData>(complete => { resolve = complete; });
  const removeOnUpdate = jest.fn();
  const onUpdate = jest.fn((callback: typeof receive) => { receive = callback; return callback; });
  Object.assign(window, { electronAPI: { pullRequest: {
    onUpdate,
    removeOnUpdate, query: () => response,
  } } });
  const client = new QueryClient();
  const Probe = () => { const query = usePullRequestQuery(); return <span>{query.data?.flatPullRequests.length}</span>; };
  const container = document.createElement("div"), root = createRoot(container);
  const pushed = { flatPullRequests: [{ id: 1 }, { id: 2 }] } as CacheData;
  try {
    await act(async () => root.render(<QueryClientProvider client={client}><Probe /><Probe /></QueryClientProvider>));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    await act(async () => receive(pushed));
    const cached = client.getQueryData(queryKey);
    await act(async () => receive(JSON.parse(JSON.stringify(pushed))));
    expect(client.getQueryData(queryKey)).toBe(cached);
    await act(async () => { resolve({ flatPullRequests: [] } as unknown as CacheData); await response; });
    expect(client.getQueryData(queryKey)).toBe(cached);
    expect(client.getQueryData<CacheData>(queryKey)?.flatPullRequests).toHaveLength(2);
  } finally {
    await act(async () => root.unmount());
    expect(removeOnUpdate).toHaveBeenCalledTimes(1);
    expect(removeOnUpdate).toHaveBeenCalledWith(receive);
    client.clear();
  }
});
