import { useMemo } from "react";
import { useHeader } from "../Header/useHeader";
import { usePullRequestQuery } from "../../api/usePullRequestQuery";

export const useMenubar = () => {
  const pullRequestesQueryInfo = usePullRequestQuery();

  const headerQueryInfo = useHeader();

  const data = useMemo(() => {
    if (!pullRequestesQueryInfo.data || !headerQueryInfo.data) {
      return null;
    }

    const { flatPullRequests } = pullRequestesQueryInfo.data;

    const myPullRequests = flatPullRequests.filter((pr) => {
      return (
        pr?.user?.id === headerQueryInfo.data.id ||
        pr?.assignees?.some(({ id }) => id === headerQueryInfo.data.id)
      );
    });

    const teamPullRequests = flatPullRequests.filter((pr) => {
      return pr?.user?.id !== headerQueryInfo.data.id;
    });

    return {
      myPullRequests,
      teamPullRequests,
      headerData: headerQueryInfo.data,
    };
  }, [pullRequestesQueryInfo.data, headerQueryInfo.data]);

  return {
    ...pullRequestesQueryInfo,
    ...headerQueryInfo,
    error: pullRequestesQueryInfo.error || headerQueryInfo.error,
    isPending: pullRequestesQueryInfo.isPending || headerQueryInfo.isPending,
    data,
  };
};
