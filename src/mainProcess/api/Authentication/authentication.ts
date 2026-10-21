import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";
import { ipcMain } from "electron";
import Logger from "electron-log";
import { CLIENT_ID, GITHUB_APP_CLIENT_ID } from "../../keys";
import { getData, storeData } from "../../safeStorage/safeStorage";
import { Octokit } from "@octokit/rest";
import { tryOpenExternalUrl } from "../../security/externalUrl";
import { getLicenseState, startTrialAfterGitHubConnection } from "../../licensing/licenseState";
import { clearAuthenticationCodeNotification, showAuthenticationCodeNotification } from "./authenticationCodeNotification";

export const authenticateWithGitHub = async (): Promise<boolean> => {
  try {
    const auth = createOAuthDeviceAuth({
      clientType: "oauth-app",
      clientId: CLIENT_ID,
      scopes: ["repo", "notifications"],
      onVerification: ({ verification_uri, user_code }) => {
        ipcMain.emit("dispatch-authentication-auth-code", null, {
          verification_uri,
          user_code,
        });

        showAuthenticationCodeNotification(user_code, verification_uri);
        tryOpenExternalUrl(verification_uri);
      },
    });

    const { token } = await auth({ type: "oauth" });

    if (!token) {
      throw new Error("No token received");
    }

    await getLicenseState();
    // Store the token securely
    if (!(await storeData({ name: "access_token", data: token }))) throw new Error("Unable to securely save your GitHub connection.");
    await storeData({ name: "auth_type", data: "oauth" });

    await storeData({ name: "authentication_notice", data: null });

    await startTrialAfterGitHubConnection();

    // Important to inicialize GitHub client
    ipcMain.emit("github-token-ready");

    // Notify renderer processes about successful sign-in
    ipcMain.emit("dispatch-application-sign-user", null, true);

    return true;
  } catch (err) {
    Logger.error("Error during authentication:", err);
    return false; // Authentication failed
  } finally {
    clearAuthenticationCodeNotification();
  }
};

export const authenticateWithPAT = async (pat: string) => {
  const octokit = new Octokit({ auth: pat });

  try {
    await octokit.request("GET /user");

    await getLicenseState();
    // Store the token securely
    if (!(await storeData({ name: "access_token", data: pat }))) throw new Error("Unable to securely save your GitHub connection.");
    await storeData({ name: "auth_type", data: "pat" });

    await storeData({ name: "authentication_notice", data: null });

    await startTrialAfterGitHubConnection();

    // Important to initialize GitHub client
    ipcMain.emit("github-token-ready");

    // Notify renderer processes about successful sign-in
    ipcMain.emit("dispatch-application-sign-user", null, true);

    return { valid: true, reason: "all good" };
  } catch (error: unknown) {
    const errorDetails =
      typeof error === "object" && error !== null
        ? (error as { status?: number; message?: string })
        : {};

    if (errorDetails.status === 401) {
      return {
        valid: false,
        reason: errorDetails.message || "unauthorized",
      };
    }

    return { valid: false, reason: errorDetails.message || "other-error" };
  }
};

export const authenticateWithGitHubApp = async (): Promise<boolean> => {
  try {
    const auth = createOAuthDeviceAuth({
      clientType: "github-app",
      clientId: GITHUB_APP_CLIENT_ID,
      onVerification: ({ verification_uri, user_code }) => {
        ipcMain.emit("dispatch-authentication-auth-code", null, {
          verification_uri,
          user_code,
        });

        showAuthenticationCodeNotification(user_code, verification_uri);
        tryOpenExternalUrl(verification_uri);
      },
    });

    const { token } = await auth({ type: "oauth" });

    if (!token) {
      throw new Error("No token received");
    }

    await getLicenseState();
    if (!(await storeData({ name: "access_token", data: token }))) throw new Error("Unable to securely save your GitHub connection.");
    await storeData({ name: "auth_type", data: "github-app" });

    await storeData({ name: "authentication_notice", data: null });

    await startTrialAfterGitHubConnection();
    ipcMain.emit("github-token-ready");
    ipcMain.emit("dispatch-application-sign-user", null, true);

    return true;
  } catch (err) {
    Logger.error("Error during GitHub App authentication:", err);
    return false;
  } finally {
    clearAuthenticationCodeNotification();
  }
};

export const hasLocalAccessToken = async () => {
  const accessToken = await getData("access_token");
  return !!accessToken;
};
