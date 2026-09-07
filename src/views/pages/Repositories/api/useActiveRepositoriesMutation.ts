import { useMutation } from "@tanstack/react-query";
import Logger from "electron-log";

export const useActiveRepositoriesMutation = () => {
  return useMutation({
    mutationFn: async (repositorySetting: Record<string, boolean>) => {
      await window.electronAPI.repository.setEnableState(repositorySetting);
      void window.electronAPI.application.refreshPoll().catch((error) => {
        Logger.error("Failed to refresh repositories", error);
      });
    },
  });
};
