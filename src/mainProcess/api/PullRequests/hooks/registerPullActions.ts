import { Octokit } from "@octokit/rest";
import { after, before } from "../../hooks/hooksCallback";
import { Endpoints } from "@octokit/types";
import { CacheData } from "../utils/getDefaultData";

export type PullsActions =
  Endpoints["GET /repos/{owner}/{repo}/actions/runs"]["response"];

interface Args {
  octokit: Octokit;
  operationName: string;
  cache: CacheData;
}

export const registerPullActions = ({
  octokit,
  operationName,
  cache,
}: Args) => {
  octokit.hook.before(
    "request",
    before({
      name: operationName,
      callback: (options, page) => {
        const urlParts = options.url.split("/");

        const repoName = urlParts[5];

        if (page && cache.etagPerRepo?.[repoName]?.actions?.[page]) {
          options.headers["if-none-match"] =
            cache.etagPerRepo?.[repoName]?.actions?.[page];
        }
      },
    }),
  );

  octokit.hook.after(
    "request",
    after<PullsActions["data"]>({
      name: operationName,
      callback: (response, options, page) => {
        const etag = response.headers?.etag;

        if (page) {
          const urlParts = options.url.split("/");
          const repoName = urlParts[5];

          if (etag) {
            cache.etagPerRepo = {
              ...cache.etagPerRepo,
              [repoName]: {
                ...(cache.etagPerRepo?.[repoName] ?? {}),
                actions: {
                  ...(cache.etagPerRepo?.[repoName]?.actions ?? {}),
                  [page]: etag,
                },
              },
            };
          }

          if (response.data.workflow_runs.length > 0) {
            const newRuns = response.data.workflow_runs;
            const existing = cache.actionsPerRepo?.[repoName] || [];
            const newIds = new Set(newRuns.map((r) => r.id));
            cache.actionsPerRepo = {
              ...cache.actionsPerRepo,
              [repoName]: [...newRuns, ...existing.filter((r) => !newIds.has(r.id))].slice(0, 100),
            };
          }
        }
      },
    }),
  );
};
