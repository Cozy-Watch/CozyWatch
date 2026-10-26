import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { LicenseState } from "../../mainProcess/licensing/licenseState.types";

export const licenseStatusQueryKey = ["license-status"];
export const useLicenseStatusQuery = () => {
  const client = useQueryClient();
  useEffect(() => {
    const handler = window.electronAPI.license.onUpdate((state: LicenseState) =>
      client.setQueryData(licenseStatusQueryKey, state),
    );
    return () => window.electronAPI.license.removeOnUpdate(handler);
  }, [client]);
  return useQuery({
    queryKey: licenseStatusQueryKey,
    queryFn: () => window.electronAPI.license.getStatus(),
    refetchInterval: 30_000,
  });
};
