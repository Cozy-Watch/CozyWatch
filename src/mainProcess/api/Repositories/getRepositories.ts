import { assertMonitoringAllowed } from "../../licensing/licenseAccess";
import Logger from "electron-log";
import { RepositoriesCache } from "../../safeStorage/safeStorage.types";
import { repositoriesQuery } from "./query/repositoriesQuery";

import { refreshCoordinator } from "../../polling/refreshCoordinator";
let inFlight: { epoch: number; promise: Promise<RepositoriesCache> } | undefined;

export const getRepositories = async (): Promise<RepositoriesCache> => {
  await assertMonitoringAllowed();
  const epoch = refreshCoordinator.epoch;
  if (inFlight?.epoch === epoch) {
    Logger.info(
      "[Repositories] Request already in flight, returning existing promise"
    );
    return inFlight.promise;
  }

  Logger.info("[Repositories] No request in flight, starting new request");

  const request = { epoch, promise: repositoriesQuery() };
  inFlight = request;

  try {
    return await request.promise;
  } finally {
    if (inFlight === request) inFlight = undefined;
  }
};
