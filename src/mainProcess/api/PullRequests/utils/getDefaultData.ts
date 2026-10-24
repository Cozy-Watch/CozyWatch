import Logger from "electron-log";
import { getData } from "../../../safeStorage/safeStorage";
import type { Endpoints } from "@octokit/types";
import type { Octokit } from "@octokit/rest";

export type PullRequestList = Endpoints["GET /repos/{owner}/{repo}/pulls"]["response"]["data"];
export type PullListReview = Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews"]["response"]["data"];
export type PullsActions = Endpoints["GET /repos/{owner}/{repo}/actions/runs"]["response"]["data"]["workflow_runs"];

export type ListComments = Awaited<ReturnType<Octokit["rest"]["issues"]["listComments"]>>;

export type ExtendedComment = ListComments["data"][0] & { pullNumber: string };
export type ListCommentsData = ExtendedComment[];
export type ReviewComment = Pick<
  Endpoints["GET /repos/{owner}/{repo}/pulls/comments"]["response"]["data"][number],
  "body" | "updated_at" | "created_at" | "html_url" | "pull_request_url" | "user"
>;

export interface ReviewData {
  reviewId: number;
  login: string | null;
  userType: string | null;
  html_url: string;
  state: string;
  prNumber: string;
  previousState: string | null;
  pullRequestData?: PullRequestList[0];
}

export interface CIStatus {
  pullRequestId: number;
  initialRun: PullsActions[0];
  finalRun: PullsActions[0];
}

type RepositoryName = string;
type Page = string;
type PullNumber = string;
type RunName = string;

export interface CacheData {
  schemaVersion?: 2;
  etagPerRepo: {
    [key: RepositoryName]: {
      list?: Record<Page, string>;
      reviews?: Record<Page, string>;
      actions?: Record<Page, string>;
      issuecomments?: Record<Page, string>;
    };
  };
  pullRequestsPerRepo: {
    [key: RepositoryName]: Record<Page, PullRequestList>;
  };
  reviewPerRepoPerPullNumber: Record<
    RepositoryName,
    Record<PullNumber, PullListReview>
  >;
  actionsPerRepo: Record<RepositoryName, PullsActions>;

  pullRequestAddedOrRemoved: {
    added: PullRequestList;
    removed: PullRequestList;
  };
  reviewUpdateList: {
    newReview: ReviewData[];
    reviewChanged: ReviewData[];
  };

  CIStatusUpdatePerRepo: Record<RepositoryName, Record<RunName, CIStatus>>;

  mentions: Record<RepositoryName, Record<Page, ListCommentsData>>;
  reviewCommentsPerRepo: Record<RepositoryName, ReviewComment[]>;

  flatPullRequests: PullRequestList;
}

const defaultData: CacheData = {
  schemaVersion: 2,
  etagPerRepo: {},
  pullRequestsPerRepo: {},
  reviewPerRepoPerPullNumber: {},
  actionsPerRepo: {},

  pullRequestAddedOrRemoved: {
    added: [],
    removed: [],
  },

  reviewUpdateList: {
    newReview: [],
    reviewChanged: [],
  },

  CIStatusUpdatePerRepo: {},

  mentions: {},
  reviewCommentsPerRepo: {},

  flatPullRequests: [],
};

let localCache: CacheData | null = null;

export const setLocalCache = (data: CacheData | null) => {
  Logger.log("[Repositories] saving localCache");
  localCache = data;
};

export const getCachedData = async (): Promise<CacheData> => {
  if (localCache !== null) {
    Logger.log("[Repositories] using localCache");
    return {
      ...structuredClone(defaultData),
      ...localCache,
    };
  }

  const storageCache = await getData("pull_requests_cache");

  if (storageCache?.schemaVersion === 2) {
    Logger.log("[Repositories] using storageCache");
    return {
      ...structuredClone(defaultData),
      ...storageCache,
    };
  }

  Logger.log("[Repositories] no cache using defaults");
  return structuredClone(defaultData);
};
