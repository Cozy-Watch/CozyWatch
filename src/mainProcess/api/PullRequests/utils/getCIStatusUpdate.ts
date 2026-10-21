import type { CacheData, PullsActions, CIStatus } from "./getDefaultData";

type WorkflowRun = PullsActions[number];
interface Params {
  repositoryName: string;
  initialCache: CacheData;
  finalCache: CacheData;
  userId: number;
}

export const getCIStatusUpdate = ({ repositoryName, initialCache, finalCache, userId }: Params): Record<string, CIStatus> => {
  const pulls = Object.values(finalCache.pullRequestsPerRepo[repositoryName] ?? {}).flat().filter(pr =>
    pr.user?.id === userId || pr.assignees?.some(user => user.id === userId) || pr.requested_reviewers?.some(user => user.id === userId),
  );
  const group = (runs: WorkflowRun[]) => {
    const latest = new Map<string, WorkflowRun>();
    for (const run of runs) {
      if (!run.name) continue;
      for (const pr of pulls) {
        const linked = run.pull_requests?.some(link => link.id === pr.id || link.number === pr.number);
        const sameHead = !run.pull_requests?.length && run.head_sha && run.head_sha === pr.head?.sha;
        if (!linked && !sameHead) continue;
        const key = `${run.workflow_id ?? run.name}:${pr.id}`;
        const previous = latest.get(key);
        if (!previous || Date.parse(run.updated_at || run.created_at) >= Date.parse(previous.updated_at || previous.created_at)) latest.set(key, run);
      }
    }
    return latest;
  };
  const initial = group(initialCache.actionsPerRepo[repositoryName] ?? []);
  const final = group(finalCache.actionsPerRepo[repositoryName] ?? []);
  const changes: Record<string, CIStatus> = {};
  for (const [key, finalRun] of final) {
    const initialRun = initial.get(key);
    if (initialRun && initialRun.conclusion !== finalRun.conclusion) changes[key] = { initialRun, finalRun };
  }
  return changes;
};
