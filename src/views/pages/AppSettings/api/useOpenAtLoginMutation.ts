import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKey } from "./useOpenAtLoginQuery";

export const useOpenAtLoginMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isChecked: boolean) => {
      return await window.electronAPI.application.setStartAtLogin(isChecked);
    },

    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKey, (oldData: boolean | undefined) => {
        return variables;
      });

      queryClient.invalidateQueries({
        queryKey: queryKey,
      });
    },
  });
};
