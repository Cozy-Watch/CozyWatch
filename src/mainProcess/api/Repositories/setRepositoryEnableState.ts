import { ipcMain } from "electron";
import Logger from "electron-log";
import { storeData } from "../../safeStorage/safeStorage";
import { getCachedData as pullRequestCachedData } from "../PullRequests/utils/getDefaultData";
import { getCachedData, setLocalCache } from "./utils/getDefaultData";

export const setRepositoryEnableState = async (
  activeRepository: Record<string, boolean>
) => {
  Logger.log("[Repositories] setRepositoryEnableState");

  const currentCache = await getCachedData();
  const pullRequestsCache = await pullRequestCachedData();

  const activeRepositories: Record<number, boolean> = {
    ...currentCache.activeRepositories,
    ...activeRepository,
  };

  const data = {
    ...currentCache,
    activeRepositories,
  };

  setLocalCache(data);

  const flatPullRequests = Object.values(
    pullRequestsCache.pullRequestsPerRepo || {}
  )
    .flatMap((value) => {
      return Object.values(value).flat();
    })
    .filter((pr) => {
      return activeRepositories?.[pr.base.repo.id];
    })
    .sort((a, b) => {
      const dateA = new Date(a.updated_at);
      const dateB = new Date(b.updated_at);
      return dateB.getTime() - dateA.getTime();
    });

  const pullRequestsData = {
    ...pullRequestsCache,
    flatPullRequests,
  };

  ipcMain.emit("dispatch-pull-request-update", null, pullRequestsData);

  storeData({ name: "pull_requests_cache", data: pullRequestsData });

  storeData({ name: "repositories_cache", data });
};
