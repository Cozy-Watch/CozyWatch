import { useQuery } from "@tanstack/react-query";

export const queryKey = ["settings", "notifications"];

export const useNotificationQuery = () => {
  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      return window.electronAPI.application.getNotificationsSettings();
    },
  });
};
