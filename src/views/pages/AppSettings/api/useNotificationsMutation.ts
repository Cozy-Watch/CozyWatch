import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  NotificationKey,
  NotificationSettingsPerKey,
} from "src/mainProcess/safeStorage/safeStorage.types";
import { queryKey } from "./useNotificationsQuery";

export const useNotificationsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ checked, key }: { checked: boolean; key: string }) => {
      return await window.electronAPI.application.setNotificationSetting({
        checked,
        key,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        queryKey,
        (oldData: NotificationSettingsPerKey | undefined) => {
          if (!oldData) {
            return oldData;
          }

          const notificationKey = variables.key as NotificationKey;
          return {
            ...oldData,
            [notificationKey]: {
              ...oldData[notificationKey],
              value: variables.checked,
            },
          };
        }
      );

      queryClient.invalidateQueries({
        queryKey: queryKey,
      });
    },
  });
};
