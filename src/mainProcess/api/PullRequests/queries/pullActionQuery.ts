import { Octokit } from "@octokit/rest";
import { ipcMain } from "electron";
import Logger from "electron-log";
import { readConditionalPages } from "../../utils/conditionalPages";
import type { CacheData } from "../utils/getDefaultData";
import { isPATAuth } from "../../githubClient";

export const pullActionsQuery = async ({
  name,
  octokit,
  operationName,
  owner,
  cache,
}: {
  name: string;
  octokit: InstanceType<typeof Octokit>;
  operationName: string;
  owner: string;
  cache: CacheData;
}) => {
  try {
    const repo = `${owner}/${name}`.toLowerCase();
    const pages = await readConditionalPages({
      client: octokit, key: `workflows:${repo}`, maxPages: 10,
      request: async (page, etag) => {
        const response = await octokit.actions.listWorkflowRunsForRepo({
          owner, repo: name, event: "pull_request", per_page: 100, page,
          headers: { "x-operation-name": operationName, ...(etag ? { "if-none-match": etag } : {}) },
        });
        return { data: response.data.workflow_runs, headers: response.headers };
      },
    });
    // Replace the retained set, including empty results, only after full revalidation.
    const unique = new Map(pages.flat().map(run => [run.id, run]));
    cache.actionsPerRepo = {
      ...cache.actionsPerRepo,
      [repo]: [...unique.values()].sort((a, b) =>
        Date.parse(b.updated_at || b.created_at) - Date.parse(a.updated_at || a.created_at) || b.id - a.id,
      ).slice(0, 100),
    };
  } catch (error) {
    const httpError = error as { status?: number };
    if (httpError.status === 404) {
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
