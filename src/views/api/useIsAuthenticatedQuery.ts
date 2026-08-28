import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const queryKey = ["app", "isAuthenticated"];

export const useIsAuthenticatedQuery = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleSignOut = (isSigned: boolean) => {
      queryClient.setQueryData(queryKey, isSigned);
    };

    const handler = window.electronAPI.application.onSignUser(handleSignOut);

    return () => {
      window.electronAPI.application.removeOnSignUser(handler);
    };
  }, []);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await window.electronAPI.authentication.isStored();

      return response;
    },
  });
};
