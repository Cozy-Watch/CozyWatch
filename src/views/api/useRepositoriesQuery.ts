import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { RepositoriesCache } from "src/mainProcess/safeStorage/safeStorage.types";

export const queryKey = ["repoData"];
const normalize = (data: RepositoriesCache) => ({
  repositories: Object.values(data.repositoriesByPage || {}).flat(),
  activeRepositories: data.activeRepositories ?? {},
});
type RepositoryData = ReturnType<typeof normalize>;
const snapshots = new WeakMap<QueryClient, { sequence: number }>();

export const useRepositoriesQuery = () => {
  const queryClient = useQueryClient();
  let snapshot = snapshots.get(queryClient);
  if (!snapshot) {
    snapshot = { sequence: 0 };
    snapshots.set(queryClient, snapshot);
  }

  useEffect(() => {
    const handler = window.electronAPI.repository.onUpdate((data) => {
      snapshot.sequence++;
      queryClient.setQueryData(queryKey, normalize(data));
    });
    return () => window.electronAPI.repository.removeOnUpdate(handler);
  }, [queryClient]);

  return useQuery({
    staleTime: Infinity,
    queryKey,
    queryFn: async () => {
      const sequence = snapshot.sequence;
      const response = await window.electronAPI.repository.query();
      // A newer push wins over the earlier in-flight IPC snapshot.
      const latest = queryClient.getQueryData<RepositoryData>(queryKey);
      return snapshot.sequence > sequence && latest ? latest : normalize(response);
    },
  });
};
