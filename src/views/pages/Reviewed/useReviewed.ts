import { useMemo } from "react";
import { PullsActions } from "src/mainProcess/api/PullRequests/utils/getDefaultData";
import { useUserQuery } from "../../api/useUserQuery";
import { usePullRequestQuery } from "../../api/usePullRequestQuery";
import { useLocation } from "@tanstack/react-router";
import { useRepositoriesQuery } from "../../api/useRepositoriesQuery";
import { getReviewsGroupedByUser } from "../../hooks/utils/getReviewsGroupedByUser";
import {
  getRelevantTeamPullRequests,
  isMyPullRequest,
} from "../../hooks/utils/getRelevantTeamPullRequests";

export const useReviewed = () => {
  const headerQueryInfo = useUserQuery();
  const pullRequestesQueryInfo = usePullRequestQuery();
  const repositoriesQueryInfo = useRepositoriesQuery();
  const location = useLocation();

  const isMy = location.pathname === "/myPullRequests/reviewed";

  const data = useMemo(() => {
    if (
      !pullRequestesQueryInfo.data ||
      !headerQueryInfo.data ||
      !repositoriesQueryInfo.data
    ) {
      return null;
    }

    const {
      flatPullRequests,
      mentions,
      reviewPerRepoPerPullNumber,
      actionsPerRepo,
    } =
      pullRequestesQueryInfo.data;

    const { activeRepositories } = repositoriesQueryInfo.data || {};

    const activeFlatPullRequests = flatPullRequests.filter((pr) => {
      return activeRepositories ? activeRepositories[pr.base.repo.id] : true;
    });

    const reviews = reviewPerRepoPerPullNumber;
    const actionsList = actionsPerRepo;
    const pullsList = isMy
      ? activeFlatPullRequests.filter(
          (pr) =>
            (pr.requested_reviewers?.length ?? 0) === 0 &&
            isMyPullRequest(pr, headerQueryInfo.data.id),
        )
      : getRelevantTeamPullRequests({
          comments: mentions,
          pullRequests: activeFlatPullRequests,
          reviews,
          user: headerQueryInfo.data,
        });

    const pullRequeststData = pullsList
      .filter((pr) => {
        const repositoryName = pr.head.repo.name;
        const pullNumber = pr.number;

        const reviewsForThisPR = reviews?.[repositoryName]?.[pullNumber] || [];

        return reviewsForThisPR.some((review) => {
          if (isMy) {
            return review.user?.id !== headerQueryInfo.data?.id;
          }

          return review.user?.id === headerQueryInfo.data?.id;
        });
      })
      .map((pr) => {
        const repositoryName = pr.head.repo.name;
        const pullNumber = pr.number;

        const reviewsForThisPR = reviews?.[repositoryName]?.[pullNumber] || [];
        const actionsForThisPr = (actionsList?.[repositoryName] || []).filter(
          (run) => run.head_sha === pr.head.sha,
        );

        const actionByName = actionsForThisPr.reduce(
          (acc: Record<string, PullsActions[0][]>, action) => {
            if (!action.name) return acc;
            return {
              ...acc,
              [action.name]: [...(acc[action.name] || []), action],
            };
          },
          {},
        );

        const pendingReviews = (pr?.requested_reviewers || []).map(
          (reviewer) => {
            const key = reviewer?.login || reviewer?.id.toString();
            return {
              [key]: {
                state: "NO_FEEDBACK",
                userAvatar: reviewer.avatar_url,
                userName: reviewer.login,
                body: "",
                date: "",
              },
            };
          },
        );

        const waitingReviews = pendingReviews.length;

        const reviewsGroupedbyUser = getReviewsGroupedByUser(reviewsForThisPR);

        const reviewsAndWaitingReviews = pendingReviews.reduce(
          (acc, review) => ({ ...acc, ...review }),
          reviewsGroupedbyUser,
        );

        const assignees = (pr.assignees || []).map((assignee) => ({
          login: assignee.login,
          name: assignee.name,
          avatar: assignee.avatar_url,
        }));

        return {
          pr,
          actionByName,
          reviewsAndWaitingReviews,
          waitingReviews,
          pullRequestUrl: pr.html_url,
          labels: pr.labels,
          assignees,
        };
      });

    return pullRequeststData;
  }, [
    pullRequestesQueryInfo.data,
    headerQueryInfo.data,
    repositoriesQueryInfo.data,
    isMy,
  ]);

  return {
    ...headerQueryInfo,
    ...pullRequestesQueryInfo,
    ...repositoriesQueryInfo,
    isFetching:
      headerQueryInfo.isFetching ||
      pullRequestesQueryInfo.isFetching ||
      repositoriesQueryInfo.isFetching,
    error:
      headerQueryInfo.error ||
      pullRequestesQueryInfo.error ||
      repositoriesQueryInfo.error,
    data,
  };
};
