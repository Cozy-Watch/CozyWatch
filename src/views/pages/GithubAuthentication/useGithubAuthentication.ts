import { useNavigate } from "@tanstack/react-router";
import Logger from "electron-log";
import { useEffect, useRef, useState } from "react";
import { useGitHubAppAuthenticationMutation } from "../../api/useGitHubAppAuthenticationMutation";
import { useGitHubAuthenticationMutation } from "../../api/useGithubAuthenticationMutation";
import { useQueryClient } from "@tanstack/react-query";

interface AuthData {
  verification_uri: string;
  user_code: string;
}

export const useAuthentication = () => {
  const [authData, setAuthData] = useState<AuthData | null>(null);

  const queryClient = useQueryClient();
  const connecting = useRef(false);
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync: startAuthentication } =
    useGitHubAuthenticationMutation();

  const { mutateAsync: startAppAuthentication } =
    useGitHubAppAuthenticationMutation();

  const navigate = useNavigate({ from: "/" });

  useEffect(() => {
    const handleAuthCode = (data: AuthData) => {
      setAuthData(data);
    };

    const handler =
      window.electronAPI.authentication.onAuthenticationCode(handleAuthCode);

    return () => {
      window.electronAPI.authentication.removeAuthenticationCode(handler);
    };
  }, []);

  const connect = async (start: () => Promise<boolean>) => {
    if (connecting.current) return;
    connecting.current = true;
    setPending(true);
    setError(null);
    try {
      if (!(await start())) throw new Error("Authentication was not completed");
      await queryClient.invalidateQueries();
      await navigate({ to: "/settings", search: { tab: "repositories" } });
    } catch {
      Logger.warn("[Authentication] Connection was not completed");
      setAuthData(null);
      setError("GitHub connection wasn’t completed. The code may have expired or the connection was interrupted. Please try again.");
    } finally {
      connecting.current = false;
      setPending(false);
    }
  };
  const authenticate = () => connect(startAuthentication);
  const authenticateGitHubApp = () => connect(startAppAuthentication);

  return {
    data: {
      authData,
      isPending,
      error,
    },
    action: {
      authenticate,
      authenticateGitHubApp,
      setAuthData,
    },
  };
};
