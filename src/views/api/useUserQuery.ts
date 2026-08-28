import { useQuery } from "@tanstack/react-query";

export const queryKey = ["userData"];

export const useUserQuery = () => {
  return useQuery({
    staleTime: Infinity,
    queryKey,
    queryFn: async () => {
      const response = await window.electronAPI.authentication.getUser();

      return response;
    },
  });
};
