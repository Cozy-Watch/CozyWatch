import { Endpoints } from "@octokit/types";
import Logger from "electron-log";

export type PullsActions =
  Endpoints["GET /repos/{owner}/{repo}/actions/runs"]["response"]["data"]["workflow_runs"];

interface Params {
  workflowRuns: PullsActions;
  prId: number;
}
export const getCiData = ({ workflowRuns, prId }: Params) => {
  const runsForPr = (workflowRuns || []).filter((run) =>
    run.pull_requests?.some((linkedPr) => linkedPr.id === prId)
  );

  const latestRuns = runsForPr.reduce<
    Record<string, (typeof runsForPr)[number]>
  >((acc, run) => {
    const key = run.name ?? "default";
    const existing = acc[key];

    if (!existing || new Date(run.updated_at) > new Date(existing.updated_at)) {
      acc[key] = run;
    }

    return acc;
  }, {});

  return Object.values(latestRuns).map((run) => {
    const { status, conclusion, id, html_url, updated_at, name } = run;

    return {
      status,
      conclusion,
      runId: id,
      html_url,
      updated_at,
      name,
    };
  });
};
