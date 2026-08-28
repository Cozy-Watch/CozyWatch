import { useMemo } from "react";
import { PullsActions } from "src/mainProcess/api/PullRequests/utils/getDefaultData";
import { useHeader } from "../Header/useHeader";
import { usePullRequestQuery } from "../../api/usePullRequestQuery";
import { useRepositoriesQuery } from "../../api/useRepositoriesQuery";
import { useLocation } from "@tanstack/react-router";
import { getReviewsGroupedByUser } from "../../hooks/utils/getReviewsGroupedByUser";

export const useMentions = () => {
  const headerQueryInfo = useHeader();
  const pullRequestesQueryInfo = usePullRequestQuery();
  const repositoriesQueryInfo = useRepositoriesQuery();

  const location = useLocation();

  const isMy = location.pathname === "/myPullRequests/mentions";

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
      reviewPerRepoPerPullNumber,
      actionsPerRepo,
      mentions,
    } = pullRequestesQueryInfo.data;

    const { activeRepositories } = repositoriesQueryInfo.data || {};

    const activeFlatPullRequests = flatPullRequests.filter((pr) => {
      return activeRepositories ? activeRepositories[pr.base.repo.id] : true;
    });

    const pullsList = activeFlatPullRequests.filter((pr) => {
      if (isMy) {
        return (
          pr?.user?.id === headerQueryInfo.data.id ||
          pr?.assignees?.some(({ id }) => id === headerQueryInfo.data.id)
        );
      }

      return pr?.user?.id !== headerQueryInfo.data.id;
    });

    const username = headerQueryInfo.data.login;

    const myPullRequests = pullsList.filter((pr) => {
      const prMentions = Object.values(
        mentions[pr.base.repo.name] || {},
      ).flat();

      const onlyMentions = prMentions.filter((mention) => {
        return new RegExp(`@${username}(?![a-zA-Z0-9_-])`, "i").test(mention.body ?? "");
      });

      return onlyMentions.some((mention) => +mention.pullNumber === pr.number);
    });

    const reviews = reviewPerRepoPerPullNumber;
    const actionsList = actionsPerRepo;

    const pullRequeststData = myPullRequests.filter((pr) => pr.head.repo).map((pr) => {
      const prMentions = Object.values(
        mentions[pr.base.repo.name] || {},
      ).flat();

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

      const discussionForThisPR = prMentions.reduce(
        (acc, { body, user, updated_at }) => {
          return {
            ...acc,
            [user?.login || user?.id.toString() || "NA"]: {
              state: "COMMENTED",
              body: body || "",
              userAvatar: user?.avatar_url || "",
              userName: user?.login || "",
              date: updated_at,
            },
          };
        },
        reviewsAndWaitingReviews,
      );

      const assignees = (pr.assignees || []).map((assignee) => ({
        login: assignee.login,
        name: assignee.name,
        avatar: assignee.avatar_url,
      }));

      return {
        pr,
        actionByName,
        reviewsAndWaitingReviews: discussionForThisPR,
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
