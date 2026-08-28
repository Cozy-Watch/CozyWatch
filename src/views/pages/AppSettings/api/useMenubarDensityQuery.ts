import { useQuery } from "@tanstack/react-query";

export const menubarDensityQueryKey = ["menubarDensity"];

export const useMenubarDensityQuery = () => {
  return useQuery({
    queryKey: menubarDensityQueryKey,
    queryFn: async () => {
      return await window.electronAPI.application.getMenubarDensity();
    },
    initialData: "default",
  });
};
