import { Octokit } from "@octokit/rest";
import { ipcMain } from "electron";
import Logger from "electron-log";
import { readConditionalPages } from "../../utils/conditionalPages";
import type { CacheData } from "../utils/getDefaultData";
import { isPATAuth } from "../../githubClient";

export const getIssuesListCommentsQuery = async ({
  name,
  octokit,
  operationName,
  owner,
  pullNumber,
  cache,
}: {
  name: string;
  octokit: InstanceType<typeof Octokit>;
  operationName: string;
  owner: string;
  pullNumber: string;
  cache: CacheData;
}) => {
  try {
    const repo = `${owner}/${name}`.toLowerCase();
    const pages = await readConditionalPages({
      client: octokit, key: `comments:${repo}/${pullNumber}`,
      request: (page, etag) => octokit.issues.listComments({
        owner, repo: name, issue_number: Number(pullNumber), page, per_page: 100,
        headers: { "x-operation-name": operationName, ...(etag ? { "if-none-match": etag } : {}) },
      }),
    });
    const retained = Object.fromEntries(Object.entries(cache.mentions[repo] ?? {})
      .filter(([key]) => !key.startsWith(`${pullNumber}_`)));
    cache.mentions = {
      ...cache.mentions,
      [repo]: { ...retained, ...Object.fromEntries(pages.map((comments, index) => [
        `${pullNumber}_${index + 1}`, comments.map(comment => ({ ...comment, pullNumber })),
      ])) },
    };
  } catch (error) {
    const httpError = error as { status?: number };
    if (httpError.status === 404) {
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

