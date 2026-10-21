import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { CacheData as PullRequestData } from "src/mainProcess/api/PullRequests/utils/getDefaultData";

export const queryKey = ["pullRequests"];

const snapshots = new WeakMap<QueryClient, { data?: PullRequestData; sequence: number }>();

export const usePullRequestQuery = () => {
  const queryClient = useQueryClient();
  let snapshot = snapshots.get(queryClient);
  if (!snapshot) {
    snapshot = { sequence: 0 };
    snapshots.set(queryClient, snapshot);
  }

  useEffect(() => {
    const handleUpdate = (data: PullRequestData) => {
      snapshot.data = data;
      snapshot.sequence += 1;
      queryClient.setQueryData(queryKey, (oldData: PullRequestData) => {
        if (!oldData) {
          return data;
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
  }, [queryClient]);

  return useQuery<PullRequestData>({
    staleTime: Infinity,
    queryKey: queryKey,
    queryFn: async () => {
      const updateSequenceAtStart = snapshot.sequence;
      const response = await window.electronAPI.pullRequest.query();

      // A background update can arrive while the initial snapshot IPC is pending.
      // Keep that newer push instead of replacing it with the earlier snapshot.
      return snapshot.sequence > updateSequenceAtStart &&
        snapshot.data
        ? snapshot.data
        : response;
    },
  });
};
