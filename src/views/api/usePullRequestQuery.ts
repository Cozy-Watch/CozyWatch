import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { CacheData as PullRequestData } from "src/mainProcess/api/PullRequests/utils/getDefaultData";

export const queryKey = ["pullRequests"];

export const usePullRequestQuery = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleUpdate = (data: PullRequestData) => {
      queryClient.setQueryData(queryKey, (oldData: PullRequestData) => {
        if (!oldData) {
          return oldData;
        }

        return {
          ...oldData,
          ...data,
        };
      });
    };

    const handler = window.electronAPI.pullRequest.onUpdate(handleUpdate);

    return () => {
      window.electronAPI.pullRequest.removeOnUpdate(handler);
    };
  }, []);

  return useQuery<PullRequestData>({
    staleTime: Infinity,
    queryKey: queryKey,
    queryFn: async () => {
      const response = await window.electronAPI.pullRequest.query();

      return response;
    },
  });
};
