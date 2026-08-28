import { useMutation } from "@tanstack/react-query";

export const useGitHubAuthenticationMutation = () => {
  return useMutation({
    mutationFn: async () => {
      const response =
        await window.electronAPI.authentication.authenticateGitHub();

      return response;
    },
  });
};
