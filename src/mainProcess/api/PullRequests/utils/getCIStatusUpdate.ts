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
        const sameHead = Boolean(run.head_sha && run.head_sha === pr.head?.sha);
        if (!sameHead || (run.pull_requests?.length && !linked)) continue;
        const key = `${run.workflow_id ?? run.name}:${pr.id}`;
        const previous = latest.get(key);
        const order = previous ?
          (run.run_number ?? 0) - (previous.run_number ?? 0) ||
          (run.id === previous.id ? (run.run_attempt ?? 1) - (previous.run_attempt ?? 1) : 0) ||
          Date.parse(run.created_at) - Date.parse(previous.created_at) ||
          Date.parse(run.updated_at) - Date.parse(previous.updated_at) : 1;
        if (order >= 0) latest.set(key, run);
      }
    }
    return latest;
  };
  const initial = group(initialCache.actionsPerRepo[repositoryName] ?? []);
  const final = group(finalCache.actionsPerRepo[repositoryName] ?? []);
  const changes: Record<string, CIStatus> = {};
  for (const [key, finalRun] of final) {
    const initialRun = initial.get(key);
    if (initialRun && initialRun.conclusion !== finalRun.conclusion) changes[key] = { initialRun, finalRun, pullRequestId: Number(key.slice(key.lastIndexOf(":") + 1)) };
  }
  return changes;
};
