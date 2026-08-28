import Logger from "electron-log";
import { getCachedData as getRepositoriesCacheData } from "../../Repositories/utils/getDefaultData";
import { getRepositories } from "../../Repositories/getRepositories";

export const getRepositoriesData = async () => {
  const repositoriesCache = await getRepositoriesCacheData();
  if (Object.values(repositoriesCache.etagPerPage).length === 0) {
    Logger.info(
      "[PullRequests] No ETag found, fetching repositories to populate cache"
    );
    return await getRepositories();
  }

  return repositoriesCache;
};
