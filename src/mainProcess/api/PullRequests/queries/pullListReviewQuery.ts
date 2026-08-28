import { Octokit } from "@octokit/rest";
import { ipcMain } from "electron";
import Logger from "electron-log";
import { isPATAuth } from "../../githubClient";

export const pullsListReviewsQuery = async ({
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
    await octokit.paginate(octokit.rest.pulls.listReviews, {
      owner,
      repo: name,
      pull_number: parseInt(pullNumber),
      per_page: 100,
      headers: { "x-operation-name": operationName },
    });
  } catch (error) {
    const httpError = error as { status?: number };
    if (httpError.status === 304) {
      // Don't do anything, we already handle 304 in the after hook
      Logger.log(`[PullRequests] pullsListReviewsQuery not modified (304)`);
    } else if (httpError.status === 404) {
      Logger.log(`[PullRequests] pullsListReviewsQuery probably deleted (404)`);
    } else if (httpError.status === 403) {
      Logger.log(
        `[PullRequests] pullsListReviewsQuery forbidden (403) - likely insufficient repo access`,
      );

      if (isPATAuth()) {
        ipcMain.emit(
          "dispatch-authentication-invalid-PAT",
          null,
          "Check PAT - Pull Request Access Denied",
        );
      }

      // Treat as "no PR review data available" and don't rethrow
    } else {
      Logger.error(error);
      throw error;
    }
  }
};
