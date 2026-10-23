import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { NotificationRecord } from "../../mainProcess/safeStorage/safeStorage.types";

export const notificationQueryKey = ["notifications"];
const snapshots = new WeakMap<QueryClient, { sequence: number }>();

export const useNotifications = () => {
  const queryClient = useQueryClient();
  let snapshot = snapshots.get(queryClient);
  if (!snapshot) {
    snapshot = { sequence: 0 };
    snapshots.set(queryClient, snapshot);
  }
  const query = useQuery<NotificationRecord[]>({
    queryKey: notificationQueryKey,
    queryFn: async () => {
      const sequence = snapshot.sequence;
      const history = await window.electronAPI.application.getNotificationHistory();
      const latest = queryClient.getQueryData<NotificationRecord[]>(notificationQueryKey);
      return snapshot.sequence > sequence && latest ? latest : history;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    const handler = window.electronAPI.application.onNotificationUpdate((history) => {
      snapshot.sequence++;
      queryClient.setQueryData(notificationQueryKey, history);
    });
    return () => window.electronAPI.application.removeOnNotificationUpdate(handler);
  }, [queryClient]);

  return query;
};
