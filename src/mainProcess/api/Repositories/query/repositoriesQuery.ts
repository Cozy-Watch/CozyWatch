import { ipcMain } from "electron";
import Logger from "electron-log";
import { getData, storeData } from "../../../safeStorage/safeStorage";
import {
  RepositoriesCache,
  Repository,
} from "../../../safeStorage/safeStorage.types";
import { getGithubClient, isPATAuth } from "../../githubClient";
import { readConditionalPages } from "../../utils/conditionalPages";
import { refreshCoordinator } from "../../../polling/refreshCoordinator";
import { getCachedData, setLocalCache } from "../utils/getDefaultData";

export const repositoriesQuery = async (): Promise<RepositoriesCache> => {
  const startTime = Date.now();
  const generation = refreshCoordinator.epoch;
  const assertCurrent = () => {
    if (generation !== refreshCoordinator.epoch) throw new Error("Repository discovery cancelled.");
  };

  const { activeRepositories, repositoriesByPage: savedPages } =
    await getCachedData();

  let repositoriesByPage = savedPages;
  const octokit = await getGithubClient();

  const operationValue = "repositoriesRequest";

  try {
    const pages = await readConditionalPages({
      client: octokit, key: "repositories",
      request: (page, etag) => octokit.repos.listForAuthenticatedUser({
        per_page: 100, page, visibility: "all", affiliation: "owner,collaborator,organization_member",
        headers: { "x-operation-name": operationValue, ...(etag ? { "if-none-match": etag } : {}) },
      }),
    });
    repositoriesByPage = Object.fromEntries(pages.map((repositories, index) => [String(index + 1),
      repositories.filter(({ disabled, archived }) => !disabled && !archived)
        .map(({ name, url, description, owner, html_url: htmlUrl, id }) => ({
          name, url, description, owner: owner.login, avatar: owner.avatar_url, htmlUrl, id,
        })),
    ]));
  } catch (err) {
    const httpErr = err as { status?: number };
    if (httpErr.status === 404) {
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

  const latestActiveRepositories =
    (await getData("active_repositories")) ?? activeRepositories;
  const activeRepos: Record<number, boolean> = allRepos.reduce(
    (acc, repo) => ({
      ...acc,
      [repo.id]: latestActiveRepositories[repo.id] ?? false,
    }),
    { ...latestActiveRepositories },
  );

  const data = {
    activeRepositories: activeRepos,
    etagPerPage: {},
    repositoriesByPage,
  };

  assertCurrent();
  setLocalCache(data);
  void storeData({ name: "repositories_cache", data });

  ipcMain.emit("dispatch-repository-update", null, data);

  Logger.log(`[RepositoryQuery] Finished in ${Date.now() - startTime}ms`);

  return data;
};
