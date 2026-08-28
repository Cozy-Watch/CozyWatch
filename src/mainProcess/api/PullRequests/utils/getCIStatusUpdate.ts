import { CacheData, PullsActions, CIStatus } from "./getDefaultData";

type WorkflowRun = PullsActions[0];

const groupByActionName = (
  acc: Record<string, WorkflowRun>,
  run: WorkflowRun
) => {
  if (!run.name) {
    return acc;
  }

  if (
    acc[run.name] &&
    new Date(acc[run.name].updated_at || acc[run.name].created_at || 0) >
      new Date(run.updated_at || run.created_at || 0)
  ) {
    return acc;
  }

  return {
    ...acc,
    [run.name]: run,
  };
};

interface Params {
  repositoryName: string;
  initialCache: CacheData;
  finalCache: CacheData;
  userId: number;
}

export const getCIStatusUpdate = ({
  repositoryName,
  initialCache,
  finalCache,
  userId,
}: Params): Record<string, CIStatus> => {
  const finalPullRequests = Object.values(
    finalCache.pullRequestsPerRepo[repositoryName] || {}
  )
    .flat()
    .filter(
      (pr) =>
        pr?.user?.id === userId ||
        pr?.assignees?.some((assignee) => assignee.id === userId) ||
        pr?.requested_reviewers?.some((reviewer) => reviewer.id === userId)
    );

  const initialWorkflowRuns = initialCache.actionsPerRepo[repositoryName] || [];
  const finalWorkflowRuns = finalCache.actionsPerRepo[repositoryName] || [];

  const finalPullRequestId = finalPullRequests.map((pr) => pr.id);

  const initialCIInRepository = initialWorkflowRuns.filter((run) =>
    run.pull_requests?.some((pr) => finalPullRequestId.includes(pr.id))
  );

  const initialLatestRunByActionName = initialCIInRepository.reduce(
    groupByActionName,
    {}
  );

  const finalCIInRepository = finalWorkflowRuns.filter((run) =>
    run.pull_requests?.some((pr) => finalPullRequestId.includes(pr.id))
  );

  const finalLatestRunByActionName = finalCIInRepository.reduce(
    groupByActionName,
    {}
  );

  const actionChanged = Object.keys(finalLatestRunByActionName).reduce(
    (
      acc: Record<string, { initialRun: WorkflowRun; finalRun: WorkflowRun }>,
      runName
    ) => {
      const initialRun = initialLatestRunByActionName[runName];
      const finalRun = finalLatestRunByActionName[runName];

      if (initialRun && finalRun) {
        if (initialRun.conclusion !== finalRun.conclusion) {
          return {
            ...acc,
            [runName]: { initialRun, finalRun },
          };
        }
      }

      return acc;
    },
    {}
  );

  return actionChanged;
};
