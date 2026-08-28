import { Octokit } from "@octokit/rest";
import { after, before } from "../../hooks/hooksCallback";
import { CacheData, ListCommentsData } from "../utils/getDefaultData";

interface Args {
  octokit: Octokit;
  operationName: string;
  cache: CacheData;
}

export const registerListIssuesComments = ({
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
        const pullNumber = urlParts[7];

        if (page) {
          const etag =
            cache.etagPerRepo?.[repoName]?.issuecomments?.[`${pullNumber}_${page}`] ??
            cache.etagPerRepo?.[repoName]?.issuecomments?.[page];
          if (etag) {
            options.headers["if-none-match"] = etag;
          }
        }
      },
    })
  );

  octokit.hook.after(
    "request",
    after<ListCommentsData>({
      name: operationName,
      callback: (response, options, page) => {
        const etag = response.headers?.etag;
        const urlParts = options.url.split("/");

        const repoName = urlParts[5];
        const pullNumber = urlParts[7];

        if (page) {
          if (etag) {
            cache.etagPerRepo = {
              ...cache.etagPerRepo,
              [repoName]: {
                ...(cache.etagPerRepo?.[repoName] ?? {}),
                issuecomments: {
                  ...(cache.etagPerRepo?.[repoName]?.issuecomments ?? {}),
                  [`${pullNumber}_${page}`]: etag,
                },
              },
            };
          }

          if (response.data.length > 0) {
            cache.mentions = {
              ...cache.mentions,
              [repoName]: {
                ...(cache.mentions?.[repoName] || {}),
                [`${pullNumber}_${page}`]: response.data.map((data) => ({ ...data, pullNumber })),
              },
            };
          }
        }
      },
    })
  );
};
