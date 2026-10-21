import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { queryKey } from "./useIsAuthenticatedQuery";

/** Each window owns a fresh cache and component tree for each GitHub session. */
export const AccountQueryProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState(() => ({ client: new QueryClient(), generation: 0 }));
  const current = useRef(session);

  useEffect(() => {
    const handler = window.electronAPI.application.onSignUser((signedIn) => {
      const previous = current.current;
      // cancelQueries cancels retries and prevents late IPC results being applied.
      void previous.client.cancelQueries();
      previous.client.clear();
      const client = new QueryClient();
      client.setQueryData(queryKey, signedIn);
      const next = { client, generation: previous.generation + 1 };
      current.current = next;
      setSession(next);
    });
    return () => window.electronAPI.application.removeOnSignUser(handler);
  }, []);

  return <QueryClientProvider key={session.generation} client={session.client}>{children}</QueryClientProvider>;
};
