import type {
  ListCommentsData,
  PullListReview,
  PullRequestList,
} from "src/mainProcess/api/PullRequests/utils/getDefaultData";

interface GetRelevantTeamPullRequestsParams {
  comments: Record<string, Record<string, ListCommentsData>>;
  pullRequests: PullRequestList;
  reviews: Record<string, Record<string, PullListReview>>;
  user: {
    id: number;
    login: string;
  };
}

const isMentioned = (body: string | null | undefined, login: string) => {
  return new RegExp(`@${login}(?![a-zA-Z0-9_-])`, "i").test(body ?? "");
};

export const isMyPullRequest = (
  pullRequest: PullRequestList[0],
  userId: number,
) => {
  return (
    pullRequest.user?.id === userId ||
    pullRequest.assignees?.some(({ id }) => id === userId)
  );
};

export const getRelevantTeamPullRequests = ({
  comments,
  pullRequests,
  reviews,
  user,
}: GetRelevantTeamPullRequestsParams) => {
  return pullRequests.filter((pullRequest) => {
    if (isMyPullRequest(pullRequest, user.id)) {
      return false;
    }

    if (pullRequest.requested_reviewers?.some(({ id }) => id === user.id)) {
      return true;
    }

    const repositoryName = pullRequest.base.repo.name;
    const reviewsForPullRequest =
      reviews[repositoryName]?.[pullRequest.number] ?? [];

    if (reviewsForPullRequest.some((review) => review.user?.id === user.id)) {
      return true;
    }

    const commentsForRepository = Object.values(
      comments[repositoryName] ?? {},
    ).flat();
    const commentsForPullRequest = commentsForRepository.filter(
      (comment) => Number(comment.pullNumber) === pullRequest.number,
    );

    return commentsForPullRequest.some(
      (comment) =>
        comment.user?.id === user.id || isMentioned(comment.body, user.login),
    );
  });
};
