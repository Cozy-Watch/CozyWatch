/** @jest-environment jsdom */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { AccountQueryProvider } from "./AccountQueryProvider";
import { queryKey } from "./useIsAuthenticatedQuery";

it("isolates both windows across logout and reconnect, including late results", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const listeners = new Set<(signed: boolean) => void>();
  Object.assign(window, { electronAPI: { application: {
    onSignUser: (handler: (signed: boolean) => void) => { listeners.add(handler); return handler; },
    removeOnSignUser: (handler: (signed: boolean) => void) => listeners.delete(handler),
  } } });
  let completeOldRequest: (value: string) => void = () => undefined;
  const pending = new Promise<string>(resolve => { completeOldRequest = resolve; });
  const clients: QueryClient[] = [];
  const Probe = () => {
    const client = useQueryClient();
    if (!clients.includes(client)) clients.push(client);
    const auth = useQuery({ queryKey, queryFn: async () => true, staleTime: Infinity });
    const user = useQuery({ queryKey: ["userData"], queryFn: () => pending, enabled: auth.data === true });
    return <span>{auth.data ? user.data || "loading" : "signed out"}</span>;
  };
  const containers = [document.createElement("div"), document.createElement("div")];
  const roots = containers.map(container => createRoot(container));
  const send = (value: boolean) => listeners.forEach(listener => listener(value));
  try {
    await act(async () => roots.forEach(root => root.render(<AccountQueryProvider><Probe /></AccountQueryProvider>)));
    const oldClients = [...clients];
    oldClients.forEach(client => client.setQueryData(["weeklyRecap", 1], { private: true }));
    await act(async () => send(false));
    await act(async () => { completeOldRequest("old private user"); await pending; });
    expect(containers.map(container => container.textContent)).toEqual(["signed out", "signed out"]);
    oldClients.forEach(client => expect(client.getQueryCache().getAll()).toHaveLength(0));
    await act(async () => send(true));
    const newClients = clients.slice(-2);
    newClients.forEach(client => expect(client.getQueryData(["weeklyRecap", 1])).toBeUndefined());
    expect(newClients.every(client => !oldClients.includes(client))).toBe(true);
  } finally {
    await act(async () => roots.forEach(root => root.unmount()));
    clients.forEach(client => client.clear());
  }
});
