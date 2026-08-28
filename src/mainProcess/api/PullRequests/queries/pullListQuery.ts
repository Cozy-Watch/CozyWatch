import { Octokit } from "@octokit/rest";
import { ipcMain } from "electron";
import Logger from "electron-log";
import { isPATAuth } from "../../githubClient";

export const pullsListQuery = async ({
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
    await octokit.paginate(octokit.rest.pulls.list, {
      owner,
      repo: name,
      state: "open",
      per_page: 100,
      headers: { "x-operation-name": operationName },
    });
  } catch (error) {
    const httpError = error as { status?: number };
    if (httpError.status === 304) {
      // Don't do anything, we already handle 304 in the after hook
      Logger.log(`[PullRequests] pullsListQuery not modified (304)`);
    } else if (httpError.status === 404) {
      Logger.log(`[PullRequests] pullsListQuery probably deleted (404)`);
    } else if (httpError.status === 403) {
      Logger.log(
        `[PullRequests] pullsListQuery forbidden (403) - likely insufficient repo access`,
      );

      if (isPATAuth()) {
        ipcMain.emit(
          "dispatch-authentication-invalid-PAT",
          null,
          "Check PAT - Pull Request Access Denied",
        );
      }
    } else {
      Logger.error(error);
      throw error;
    }
  }
};

