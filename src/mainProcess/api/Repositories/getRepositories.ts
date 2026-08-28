import Logger from "electron-log";
import { RepositoriesCache } from "../../safeStorage/safeStorage.types";
import { repositoriesQuery } from "./query/repositoriesQuery";

let inFlightPromise: Promise<RepositoriesCache> | null = null;

export const getRepositories = async (): Promise<RepositoriesCache> => {
  if (inFlightPromise) {
    Logger.info(
      "[Repositories] Request already in flight, returning existing promise"
    );
    return inFlightPromise;
  }

  Logger.info("[Repositories] No request in flight, starting new request");

  inFlightPromise = repositoriesQuery();

  try {
    return await inFlightPromise;
  } finally {
    inFlightPromise = null;
  }
};
