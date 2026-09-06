import { useMutation } from "@tanstack/react-query";

export const useActiveRepositoriesMutation = () => {
  return useMutation({
    mutationFn: async (repositorySetting: Record<string, boolean>) => {
      await window.electronAPI.repository.setEnableState(repositorySetting);
      window.electronAPI.application.refreshPoll();
    },
  });
};
