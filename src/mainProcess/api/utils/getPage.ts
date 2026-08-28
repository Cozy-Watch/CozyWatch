import type { RequestOptions } from "@octokit/types";

export const getPage = (options: RequestOptions): string => {
  const page = options.request?.parameters?.page;

  if (!page && options.url) {
    const params = new URLSearchParams(options.url);
    const pageParam = params.get("page");

    if (pageParam) {
      return pageParam;
    }
  }

  return page ?? "1";
};
