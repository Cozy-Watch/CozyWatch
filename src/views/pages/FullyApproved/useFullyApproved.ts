import { useMemo } from "react";
import { PullsActions } from "src/mainProcess/api/PullRequests/utils/getDefaultData";
import { useHeader } from "../Header/useHeader";
import { usePullRequestQuery } from "../../api/usePullRequestQuery";
import { useRepositoriesQuery } from "../../api/useRepositoriesQuery";
import { useLocation } from "@tanstack/react-router";
import { getFullyApproved } from "../../hooks/utils/getFullyApproved";
import { getReviewsGroupedByUser } from "../..//hooks/utils/getReviewsGroupedByUser";
import {
  getRelevantTeamPullRequests,
  isMyPullRequest,
} from "../../hooks/utils/getRelevantTeamPullRequests";

export const useFullyApproved = () => {
  const headerQueryInfo = useHeader();
  const pullRequestesQueryInfo = usePullRequestQuery();
  const repositoriesQueryInfo = useRepositoriesQuery();

  const location = useLocation();

  const isMy = location.pathname === "/myPullRequests/fullyApproved";

  const data = useMemo(() => {
    if (
      !pullRequestesQueryInfo.data ||
      !headerQueryInfo.data ||
      !repositoriesQueryInfo.data
    ) {
      return null;
    }

    const { id: userId, login } = headerQueryInfo.data;
    if (userId === undefined || !login) {
      return null;
    }

    const {
      flatPullRequests,
      reviewPerRepoPerPullNumber,
      actionsPerRepo,
    } = pullRequestesQueryInfo.data;

    const { activeRepositories } = repositoriesQueryInfo.data || {};

    const activeFlatPullRequests = flatPullRequests.filter((pr) => {
      return activeRepositories[pr.base.repo.id];
    });

    const reviews = reviewPerRepoPerPullNumber;
    const actionsList = actionsPerRepo;
    const pullRequestFullList = isMy
      ? activeFlatPullRequests.filter((pr) =>
          isMyPullRequest(pr, userId),
        )
      : getRelevantTeamPullRequests({
          comments: pullRequestesQueryInfo.data.mentions,
          pullRequests: activeFlatPullRequests,
          reviews,
          user: { id: userId, login },
        });

    const fullyApprovedPullRequests = getFullyApproved({
      pullRequests: pullRequestFullList,
      reviews: reviews,
    });

    const pullRequeststData = fullyApprovedPullRequests.map((pr) => {
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

      const pendingReviews = (pr?.requested_reviewers || []).map((reviewer) => {
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
      });

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
