import { Octokit } from "@octokit/rest";
import { ipcMain } from "electron";
import Logger from "electron-log";
import { isPATAuth } from "../../githubClient";

export const pullActionsQuery = async ({
  name,
  octokit,
  operationName,
  owner,
}: {
  name: string;
  octokit: InstanceType<typeof Octokit>;
  operationName: string;
  owner: string;
}) => {
  try {
    await octokit.paginate(octokit.actions.listWorkflowRunsForRepo, {
      owner,
      repo: name,
      event: "pull_request",
      per_page: 100,
      headers: { "x-operation-name": operationName },
    });
  } catch (error) {
    const httpError = error as { status?: number };
    if (httpError.status === 304) {
      Logger.log(`[PullRequests] pullActionsQuery not modified (304)`);
    } else if (httpError.status === 404) {
      Logger.log(`[PullRequests] pullActionsQuery probably deleted (404)`);
    } else if (httpError.status === 403) {
      Logger.log(
        `[PullRequests] pullActionsQuery forbidden (403) - likely no Actions access`,
      );

      if (isPATAuth()) {
        ipcMain.emit(
          "dispatch-authentication-invalid-PAT",
          null,
          "Check PAT - Actions Access Denied",
        );
      }

      // Treat as "no CI data available" and don't rethrow
    } else {
      Logger.error(error);
      throw error;
    }
  }
};
