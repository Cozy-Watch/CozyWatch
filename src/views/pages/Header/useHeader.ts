import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import Logger from "electron-log";
import { useLicenseStatusQuery } from "../../api/useLicenseStatusQuery";
import { useUserQuery } from "../../api/useUserQuery";
import { useEffect, useState } from "react";

export const useHeader = () => {
  const router = useRouter();
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const licenseQueryInfo = useLicenseStatusQuery();

  const queryInfo = useUserQuery();

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const handlePATErrors = (data: string) => {
      setErrors((state) => {
        if (state.includes(data)) {
          return state;
        }
        return [...state, data];
      });
    };

    const handler =
      window.electronAPI.authentication.onInvalidPATaccess(handlePATErrors);

    return () => {
      window.electronAPI.authentication.removeOnInvalidPATaccess(handler);
    };
  }, []);

  const onSignOut = async () => {
    try {
      await window.electronAPI.application.signUser(false);

      await queryClient.invalidateQueries();

      router.invalidate().finally(() => {
        navigate({ to: "/" });
      });
    } catch (err) {
      Logger.error(err);
    }
  };

  const onRefresh = () => {
    setErrors([]);
    window.electronAPI.application.refreshPoll();
  };

  return {
    ...queryInfo,
    isPending: queryInfo.isPending || licenseQueryInfo.isPending,
    error: queryInfo.error || licenseQueryInfo.error,
    data: {
      ...queryInfo.data,
      licenseState: licenseQueryInfo.data,
      errors,
    },
    action: {
      onSignOut,
      onRefresh,
    },
  };
};
