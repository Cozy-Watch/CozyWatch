import type { Endpoints } from "@octokit/types";
import { ipcMain } from "electron";
import Logger from "electron-log";
import { storeData } from "../../../safeStorage/safeStorage";
import {
  RepositoriesCache,
  Repository,
} from "../../../safeStorage/safeStorage.types";
import { getGithubClient, isPATAuth } from "../../githubClient";
import { after, before } from "../../hooks/hooksCallback";
import { getCachedData, setLocalCache } from "../utils/getDefaultData";

type UserReposResponse = Endpoints["GET /user/repos"]["response"]["data"];

export const repositoriesQuery = async (): Promise<RepositoriesCache> => {
  const startTime = Date.now();

  const { activeRepositories, etagPerPage, repositoriesByPage } =
    await getCachedData();

  const octokit = await getGithubClient();

  const operationValue = "repositoriesRequest";

  try {
    octokit.hook.before(
      "request",
      before({
        name: operationValue,
        callback: (options, page) => {
          if (page && etagPerPage[page]) {
            Logger.info("[Repository Query]-[Hook]-[Before] update headers");
            options.headers["if-none-match"] = etagPerPage[page];
          }
        },
      }),
    );

    octokit.hook.after(
      "request",
      after<UserReposResponse>({
        name: operationValue,
        callback: (response, _, page) => {
          Logger.log(`[Repository Query]-[Hook]-[After] New Data`);
          const etag = response.headers?.etag;

          if (page) {
            Logger.log(`[Repository Query]-[Hook]-[After] Page exists`);
            const repositories = response.data
              .filter(({ disabled, archived }) => !disabled && !archived)
              .map(
                ({ name, url, description, owner, html_url: htmlUrl, id }) => ({
                  name,
                  url,
                  description,
                  owner: owner.login,
                  avatar: owner.avatar_url,
                  htmlUrl,
                  id,
                }),
              );

            repositoriesByPage[page] = repositories;

            if (etag) {
              Logger.log(`[Repository Query]-[Hook]-[After] Etag updated`);
              etagPerPage[page] = etag;
            }
          }
        },
      }),
    );

    await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
      per_page: 100,
      visibility: "all",
      affiliation: "owner,collaborator,organization_member",
      headers: { "x-operation-name": operationValue },
    });
  } catch (err) {
    const httpErr = err as { status?: number };
    if (httpErr.status === 304) {
      // Don't do anything, we already handle 304 in the after hook
      Logger.log(`[RepositoryQuery] repositoriesQuery not modified (304)`);
    } else if (httpErr.status === 404) {
      Logger.log(`[RepositoryQuery] repositoriesQuery probably deleted (404)`);
    } else if (httpErr.status === 403) {
      Logger.log(
        `[RepositoryQuery] repositoriesQuery forbidden (403) - likely insufficient repo access`,
      );

      if (isPATAuth()) {
        ipcMain.emit(
          "dispatch-authentication-invalid-PAT",
          null,
          "Check PAT - Repository Access Denied",
        );
      }

      // Treat as "no repositories data available" and don't rethrow
    } else {
      Logger.log(`[RepositoryQuery] ${(err as Error).message}`);
      throw err;
    }
  }

  const allRepos: Repository[] = Object.values(repositoriesByPage).flat();

  const activeRepos: Record<number, boolean> = allRepos.reduce((acc, repo) => {
    return {
      ...acc,
      [repo.id]: activeRepositories[repo.id] ?? false,
    };
  }, {});

  const data = {
    activeRepositories: activeRepos,
    etagPerPage,
    repositoriesByPage,
  };

  setLocalCache(data);
  storeData({ name: "repositories_cache", data });

  ipcMain.emit("dispatch-repository-update", null, data);

  Logger.log(`[RepositoryQuery] Finished in ${Date.now() - startTime}ms`);

  return data;
};
