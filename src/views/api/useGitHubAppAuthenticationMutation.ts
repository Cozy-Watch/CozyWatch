import { useMutation } from "@tanstack/react-query";

export const useGitHubAppAuthenticationMutation = () => {
  return useMutation({
    mutationFn: async () => {
      const response =
        await window.electronAPI.authentication.authenticateGitHubApp();

      return response;
    },
  });
};
