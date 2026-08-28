import { useMutation, useQueryClient } from "@tanstack/react-query";
import { menubarDensityQueryKey } from "./useMenubarDensityQuery";

export const useMenubarDensityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (density: "compact" | "default") => {
      return await window.electronAPI.application.setMenubarDensity(density);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(menubarDensityQueryKey, variables);
      queryClient.invalidateQueries({ queryKey: menubarDensityQueryKey });
    },
  });
};
