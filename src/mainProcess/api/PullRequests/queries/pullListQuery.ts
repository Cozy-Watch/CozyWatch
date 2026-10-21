import { Octokit } from "@octokit/rest";
import { ipcMain } from "electron";
import Logger from "electron-log";
import { isPATAuth } from "../../githubClient";
import type { CacheData, PullRequestList } from "../utils/getDefaultData";

type PullPage = { data: PullRequestList; etag?: string; next: boolean };
const pageCaches = new WeakMap<Octokit, Map<string, PullPage[]>>();

export const pullsListQuery = async ({
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
    let clientPages = pageCaches.get(octokit);
    if (!clientPages) {
      clientPages = new Map();
      pageCaches.set(octokit, clientPages);
    }
    const key = `${owner}/${name}`.toLowerCase();
    const oldPages = clientPages.get(key) || [];
    const pages: PullPage[] = [];
    for (let page = 1; ; page++) {
      const old = oldPages[page - 1];
      let value: PullPage;
      try {
        const response = await octokit.rest.pulls.list({
          owner, repo: name, state: "open", per_page: 100, page,
          headers: { "x-operation-name": operationName, ...(old?.etag ? { "if-none-match": old.etag } : {}) },
        });
        value = { data: response.data, etag: response.headers.etag, next: /rel="next"/.test(response.headers.link || "") };
      } catch (error) {
        if ((error as { status?: number }).status !== 304 || !old) throw error;
        const headers = (error as { response?: { headers?: Record<string, string> } }).response?.headers;
        // A review sweep can reconcile reviewers in the app cache without
        // changing the server's list ETag. Preserve that newer derived snapshot.
        const current = cache.pullRequestsPerRepo[key]?.[String(page)];
        const samePage = current && cache.etagPerRepo[key]?.list?.[String(page)] === old.etag &&
          current.length === old.data.length && current.every((pr, index) => pr.id === old.data[index].id);
        value = {
          ...old, data: samePage ? current : old.data, etag: headers?.etag ?? old.etag,
          next: headers?.link !== undefined ? /rel="next"/.test(headers.link) : old.next || old.data.length === 100,
        };
      }
      pages.push(value);
      if (!value.next) break;
    }
    // Publish only a complete page set. A shorter list removes old terminal pages.
    clientPages.set(key, pages);
    cache.pullRequestsPerRepo = {
      ...cache.pullRequestsPerRepo,
      [key]: Object.fromEntries(pages.map((page, index) => [String(index + 1), page.data])),
    };
    cache.etagPerRepo = {
      ...cache.etagPerRepo,
      [key]: { ...cache.etagPerRepo[key], list: Object.fromEntries(pages.flatMap((page, index) => page.etag ? [[String(index + 1), page.etag]] : [])) },
    };
  } catch (error) {
    const httpError = error as { status?: number };
    if (httpError.status === 404) {
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

