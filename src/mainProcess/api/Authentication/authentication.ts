import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";
import { ipcMain } from "electron";
import Logger from "electron-log";
import { redactDiagnosticValue } from "../../security/redactDiagnosticValue";
import { CLIENT_ID, GITHUB_APP_CLIENT_ID } from "../../keys";
import { getData } from "../../safeStorage/safeStorage";
import { Octokit } from "@octokit/rest";
import { tryOpenExternalUrl } from "../../security/externalUrl";
import { completeGitHubConnection } from "../../licensing/licenseState";
import { clearAuthenticationCodeNotification, showAuthenticationCodeNotification } from "./authenticationCodeNotification";

let attemptGeneration = 0;
let activeAttempt: object | undefined;
const cancelled = () => new Error("GitHub connection cancelled. Please try again.");

export const cancelAuthentication = () => {
  attemptGeneration++;
  activeAttempt = undefined;
  clearAuthenticationCodeNotification();
};

const runAuthentication = async <T>(work: (isCurrent: () => boolean) => Promise<T>, busy: T): Promise<T> => {
  if (activeAttempt) return busy;
  const attempt = {};
  activeAttempt = attempt;
  const generation = attemptGeneration;
  try { return await work(() => generation === attemptGeneration); }
  finally { if (activeAttempt === attempt) activeAttempt = undefined; }
};

export const authenticateWithGitHub = () => runAuthentication(performOAuthAuthentication, false);
export const authenticateWithGitHubApp = () => runAuthentication(performGitHubAppAuthentication, false);
export const authenticateWithPAT = (pat: string) => runAuthentication(
  current => performPATAuthentication(pat, current),
  { valid: false, reason: "Another GitHub connection is already in progress." },
);

const performOAuthAuthentication = async (isCurrent: () => boolean): Promise<boolean> => {
  try {
    const auth = createOAuthDeviceAuth({
      clientType: "oauth-app",
      clientId: CLIENT_ID,
      scopes: ["repo", "notifications"],
      onVerification: ({ verification_uri, user_code }) => {
        if (!isCurrent()) return;
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

    if (!isCurrent()) throw cancelled();
    await completeGitHubConnection(token, "oauth", isCurrent);
    if (!isCurrent()) throw cancelled();

    // Important to inicialize GitHub client
    ipcMain.emit("github-token-ready");

    // Notify renderer processes about successful sign-in
    ipcMain.emit("dispatch-application-sign-user", null, true);

    return true;
  } catch {
    Logger.error("GitHub authentication failed; credentials were not logged.");
    return false; // Authentication failed
  } finally {
    if (isCurrent()) clearAuthenticationCodeNotification();
  }
};

const performPATAuthentication = async (pat: string, isCurrent: () => boolean) => {
  const octokit = new Octokit({ auth: pat });

  try {
    await octokit.request("GET /user");

    if (!isCurrent()) throw cancelled();
    await completeGitHubConnection(pat, "pat", isCurrent);
    if (!isCurrent()) throw cancelled();

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

    const safeMessage = redactDiagnosticValue(
      pat ? (errorDetails.message || "").replaceAll(pat, "[redacted]") : errorDetails.message || "",
    );

    if (errorDetails.status === 401) {
      return {
        valid: false,
        reason: safeMessage || "unauthorized",
      };
    }

    return { valid: false, reason: safeMessage || "other-error" };
  }
};

const performGitHubAppAuthentication = async (isCurrent: () => boolean): Promise<boolean> => {
  try {
    const auth = createOAuthDeviceAuth({
      clientType: "github-app",
      clientId: GITHUB_APP_CLIENT_ID,
      onVerification: ({ verification_uri, user_code }) => {
        if (!isCurrent()) return;
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

    if (!isCurrent()) throw cancelled();
    await completeGitHubConnection(token, "github-app", isCurrent);
    if (!isCurrent()) throw cancelled();
    ipcMain.emit("github-token-ready");
    ipcMain.emit("dispatch-application-sign-user", null, true);

    return true;
  } catch {
    Logger.error("GitHub App authentication failed; credentials were not logged.");
    return false;
  } finally {
    if (isCurrent()) clearAuthenticationCodeNotification();
  }
};

export const hasLocalAccessToken = async () => {
  const accessToken = await getData("access_token");
  return !!accessToken;
};
