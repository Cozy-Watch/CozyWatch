import { useQuery } from "@tanstack/react-query";

export const queryKey = ["app", "isAuthenticated"];

// Authentication events replace the entire cache in AccountQueryProvider.
export const useIsAuthenticatedQuery = () => useQuery({
  queryKey,
  queryFn: () => window.electronAPI.authentication.isStored(),
});
