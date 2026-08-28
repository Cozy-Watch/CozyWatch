import { Octokit } from "@octokit/rest";
import { Endpoints } from "@octokit/types";
import { after, before } from "../../hooks/hooksCallback";
import { CacheData } from "../utils/getDefaultData";

export type PullsList =
  Endpoints["GET /repos/{owner}/{repo}/pulls"]["response"];

interface Args {
  octokit: Octokit;
  operationName: string;
  cache: CacheData;
}

export const registerPullList = ({ octokit, operationName, cache }: Args) => {
  octokit.hook.before(
    "request",
    before({
      name: operationName,
      callback: (options, page) => {
        const urlParts = options.url.split("/");
        const repoName = urlParts[5];

        if (page && cache.etagPerRepo?.[repoName]?.list?.[page]) {
          options.headers["if-none-match"] =
            cache.etagPerRepo?.[repoName]?.list?.[page];
        }
      },
    }),
  );

  octokit.hook.after(
    "request",
    after<PullsList["data"]>({
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
                list: {
                  ...(cache.etagPerRepo?.[repoName]?.list ?? {}),
                  [page]: etag,
                },
              },
            };
          }

          cache.pullRequestsPerRepo = {
            ...cache.pullRequestsPerRepo,
            [repoName]: {
              ...(cache.pullRequestsPerRepo?.[repoName] || {}),
              [page]: response.data,
            },
          };
        }
      },
    }),
  );
};
