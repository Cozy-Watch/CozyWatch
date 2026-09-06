import Logger from "electron-log";
import { getGithubClient } from "../githubClient";
import {
  getPreviousWeekStart,
  getWeekRange,
} from "../../../weeklyRecap/metrics";
import type { PersonalWeeklyRecap } from "../../../weeklyRecap/types";

const OPERATION = "weeklyRecapPersonal";
const PER_PAGE = 100;

const searchCount = async (query: string) => {
  const octokit = await getGithubClient();
  const repositories = new Set<string>();
  let total = 0;
  let page = 1;

  while (true) {
    const response = await octokit.rest.search.issuesAndPullRequests({
      q: query,
      per_page: PER_PAGE,
      page,
      headers: { "x-operation-name": OPERATION },
    });

    total = response.data.total_count;
    response.data.items.forEach((item) => {
      repositories.add(item.repository_url);
    });

    if (
      response.data.items.length < PER_PAGE ||
      page * PER_PAGE >= total ||
      page >= 10
    ) {
      break;
    }
    page += 1;
  }

  return { total, repositories };
};

const weekQuery = (weekStart: string) => {
  const { weekEnd } = getWeekRange(weekStart);
  return { from: weekStart, to: weekEnd };
};

export const getPersonalWeeklyRecap = async (
  weekStart: string,
): Promise<PersonalWeeklyRecap> => {
  const startedAt = Date.now();
  const current = weekQuery(weekStart);
  const previousWeekStart = getPreviousWeekStart(weekStart);
  const previous = weekQuery(previousWeekStart);

  const [merged, reviewed, previousMerged] = await Promise.all([
    searchCount(
      `is:pr is:merged author:@me merged:${current.from}..${current.to}`,
    ),
    searchCount(
      `is:pr reviewed-by:@me -author:@me updated:${current.from}..${current.to}`,
    ),
    searchCount(
      `is:pr is:merged author:@me merged:${previous.from}..${previous.to}`,
    ),
  ]);

  Logger.info(`[WeeklyRecap] personal recap in ${Date.now() - startedAt}ms`);

  return {
    weekStart,
    weekEnd: current.to,
    mergedCount: merged.total,
    reviewedCount: reviewed.total,
    repositoryCount: merged.repositories.size,
    previousMergedCount: previousMerged.total,
    fetchedAt: new Date().toISOString(),
  };
};
