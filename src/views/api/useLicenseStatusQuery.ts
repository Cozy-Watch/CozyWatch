import { useQuery } from "@tanstack/react-query";

export const licenseStatusQueryKey = ["license-status"];

export const useLicenseStatusQuery = () =>
  useQuery({
    queryKey: licenseStatusQueryKey,
    queryFn: () => window.electronAPI.license.getStatus(),
  });
