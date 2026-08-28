import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKey as pullRequestQueryKey } from "../../../api/usePullRequestQuery";
import { queryKey as repositoriesQueryKey } from "../../../api/useRepositoriesQuery";

export const useActiveRepositoriesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repositorySetting: Record<string, boolean>) => {
      await window.electronAPI.repository.setEnableState(repositorySetting);
      await window.electronAPI.application.refreshPoll();
      await queryClient.invalidateQueries({ queryKey: repositoriesQueryKey });
      await queryClient.invalidateQueries({ queryKey: pullRequestQueryKey });
    },
  });
};
