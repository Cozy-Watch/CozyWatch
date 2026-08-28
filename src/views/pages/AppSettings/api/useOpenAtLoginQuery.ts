import { useQuery } from "@tanstack/react-query";

export const queryKey = ["settings", "open-at-login"];

export const useOpenAtLoginQuery = () => {
  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      const value = await window.electronAPI.application.getStartAtLogin();

      return value;
    },
  });
};
