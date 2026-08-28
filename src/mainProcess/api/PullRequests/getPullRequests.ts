import Logger from "electron-log";
import {
  pullRequestQuery,
  PullRequestQueryResult,
} from "./queries/getPullRequestQuery";

let inFlightPromiseee: Promise<PullRequestQueryResult> | null = null;

export const getPullRequests = async (): Promise<PullRequestQueryResult> => {
  Logger.info("[PullRequests] Query starting");

  // If cache is empty, proceed with the full query as before
  if (inFlightPromiseee) {
    Logger.info(
      "[PullRequests] Request already in flight, returning existing promise"
    );
    return inFlightPromiseee;
  }

  Logger.info("[PullRequests] No cache available, starting new request");

  inFlightPromiseee = pullRequestQuery();

  try {
    return await inFlightPromiseee;
  } catch (error) {
    Logger.error("[PullRequests] Error during request", error);
    throw error;
  } finally {
    Logger.info("[PullRequests] Finally clearing inFlightPromiseee");
    inFlightPromiseee = null;
  }
};
