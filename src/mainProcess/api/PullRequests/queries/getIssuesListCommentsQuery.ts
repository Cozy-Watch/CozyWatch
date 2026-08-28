import { Octokit } from "@octokit/rest";
import { ipcMain } from "electron";
import Logger from "electron-log";
import { isPATAuth } from "../../githubClient";

export const getIssuesListCommentsQuery = async ({
  name,
  octokit,
  operationName,
  owner,
  pullNumber,
}: {
  name: string;
  octokit: InstanceType<typeof Octokit>;
  operationName: string;
  owner: string;
  pullNumber: string;
}) => {
  try {
    await octokit.paginate(octokit.issues.listComments, {
      owner,
      repo: name,
      issue_number: parseInt(pullNumber),
      per_page: 100,
      headers: { "x-operation-name": operationName },
    });
  } catch (error) {
    const httpError = error as { status?: number };
    if (httpError.status === 304) {
      Logger.log(
        `[PullRequests] getIssuesListCommentsQuery not modified (304)`,
      );
    } else if (httpError.status === 404) {
      Logger.log(
        `[PullRequests] getIssuesListCommentsQuery probably deleted (404)`,
      );
    } else if (httpError.status === 403) {
      Logger.log(
        `[PullRequests] getIssuesListCommentsQuery forbidden (403) - likely no Issues access`,
      );

      if (isPATAuth()) {
        ipcMain.emit(
          "dispatch-authentication-invalid-PAT",
          null,
          "Check PAT - Issues Or Contents Access Denied",
        );
      }

      // Treat as "no CI data available" and don't rethrow
    } else {
      Logger.error(error);
      throw error;
    }
  }
};

