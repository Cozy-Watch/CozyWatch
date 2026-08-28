import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  RepositoriesCache,
  Repository,
} from "src/mainProcess/safeStorage/safeStorage.types";

export const queryKey = ["repoData"];

export const useRepositoriesQuery = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleUpdate = (data: RepositoriesCache) => {
      queryClient.setQueryData(queryKey, (oldData: RepositoriesCache) => {
        if (!oldData) {
          return oldData;
        }

        return {
          ...oldData,
          ...data,
        };
      });
    };

    const handler = window.electronAPI.repository.onUpdate(handleUpdate);

    return () => {
      window.electronAPI.repository.removeOnUpdate(handler);
    };
  }, []);

  return useQuery({
    staleTime: Infinity,
    queryKey: queryKey,
    queryFn: async () => {
      const response = await window.electronAPI.repository.query();
      const { repositoriesByPage, activeRepositories } = response;

      const repositories = Object.values(
        repositoriesByPage || {}
      ).flat() as Repository[];

      return {
        repositories,
        activeRepositories: activeRepositories ?? {},
      };
    },
  });
};
