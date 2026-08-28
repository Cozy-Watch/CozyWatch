import Logger from "electron-log";
import { CacheData } from "./getDefaultData";

interface Params {
  repositoryName: string;
  initialCache: CacheData;
  finalCache: CacheData;
  userId: number;
}

export const getAddedRemovedPRId = ({
  repositoryName,
  finalCache,
  initialCache,
  userId,
}: Params) => {
  const allInitial = Object.values(
    initialCache.pullRequestsPerRepo[repositoryName] || {}
  ).flat();
  const initial = allInitial.filter(
    (pr) =>
      pr?.user?.id === userId ||
      pr?.assignees?.some((assignee) => assignee.id === userId) ||
      pr?.requested_reviewers?.some((reviewer) => reviewer.id === userId)
  );

  const initialIds = initial.map((pr) => pr.id);

  const allFinal = Object.values(
    finalCache.pullRequestsPerRepo[repositoryName] || {}
  ).flat();

  const final = allFinal.filter(
    (pr) =>
      pr?.user?.id === userId ||
      pr?.assignees?.some((assignee) => assignee.id === userId) ||
      pr?.requested_reviewers?.some((reviewer) => reviewer.id === userId)
  );

  const finalIds = final.map((pr) => pr.id);

  const removed = initialIds.filter((id) => !finalIds.includes(id));
  const added = finalIds.filter((id) => !initialIds.includes(id));

  return { added, removed };
};
