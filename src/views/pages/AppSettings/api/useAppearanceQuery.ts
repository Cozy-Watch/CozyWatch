import { useQuery } from "@tanstack/react-query";

export enum Appearance {
  Light = "light",
  Dark = "dark",
}

export const queryKey = ["settings", "appearance"];

export const useAppearanceQuery = () => {
  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      return window.electronAPI.application.getApplicationAppearance();
    },
  });
};
