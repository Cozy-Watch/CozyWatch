import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKey } from "./useAppearanceQuery";
import { Appearance } from "./useAppearanceQuery";

export const useAppearanceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appearance: Appearance | null) => {
      return await window.electronAPI.application.setApplicationAppearance(
        appearance
      );
    },

    onSuccess: (data, appearance) => {
      queryClient.setQueryData(queryKey, (oldData: Appearance | undefined) => {
        if (!oldData) {
          return oldData;
        }

        return appearance;
      });

      queryClient.invalidateQueries({
        queryKey: queryKey,
      });
    },
  });
};
