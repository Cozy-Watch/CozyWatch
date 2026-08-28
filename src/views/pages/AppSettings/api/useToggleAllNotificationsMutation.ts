import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NotificationSettingsPerKey } from "src/mainProcess/safeStorage/safeStorage.types";
import { queryKey } from "./useNotificationsQuery";

export const useToggleAllNotificationsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enable: boolean) => {
      return await window.electronAPI.application.setToggleAllNotifications(
        enable
      );
    },

    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKey,
        (oldData: NotificationSettingsPerKey | undefined) => {
          if (!oldData) {
            return oldData;
          }

          return data;
        }
      );

      queryClient.invalidateQueries({
        queryKey: queryKey,
      });
    },
  });
};
