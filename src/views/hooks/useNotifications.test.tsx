/** @jest-environment jsdom */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNotifications, notificationQueryKey } from "./useNotifications";
import type { NotificationRecord } from "../../mainProcess/safeStorage/safeStorage.types";

it("a newer history push wins over a late initial snapshot", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  let receive: (history: NotificationRecord[]) => void = () => undefined;
  let finish: (history: NotificationRecord[]) => void = () => undefined;
  const pending = new Promise<NotificationRecord[]>(resolve => { finish = resolve; });
  Object.assign(window, { electronAPI: { application: {
    getNotificationHistory: () => pending,
    onNotificationUpdate: (handler: typeof receive) => { receive = handler; return handler; },
    removeOnNotificationUpdate: jest.fn(),
  } } });
  const client = new QueryClient();
  const container = document.createElement("div"), root = createRoot(container);
  const Probe = () => { const query = useNotifications(); return <span>{query.data?.length}</span>; };
  try {
    await act(async () => root.render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>));
    await act(async () => receive([{ id: "new-alert" }] as NotificationRecord[]));
    expect(client.getQueryData(notificationQueryKey)).toHaveLength(1);
    await act(async () => { finish([]); await pending; });
    expect(client.getQueryData(notificationQueryKey)).toHaveLength(1);
  } finally { await act(async () => root.unmount()); client.clear(); }
});
