import { getRelevantTeamPullRequests } from "../getRelevantTeamPullRequests";
import {
  createSyntheticCacheFixture,
  SYNTHETIC_USER_ID,
  SYNTHETIC_USERNAME,
} from "../../../../mainProcess/api/PullRequests/utils/tests/mocks/syntheticCache.mock";

describe("getRelevantTeamPullRequests", () => {
  it("keeps only pull requests connected to the signed-in user", () => {
    const { comments, finalCache, pullRequests, reviews } =
      createSyntheticCacheFixture();
    const submittedReview = structuredClone(reviews.newReviewer40);
    if (!submittedReview.user) {
      throw new Error("Synthetic review must have an author.");
    }
    submittedReview.user.id = SYNTHETIC_USER_ID;
    submittedReview.user.login = SYNTHETIC_USERNAME;

    const mention = structuredClone(comments.added);
    mention.id = 404;
    mention.pullNumber = "7";

    const authoredComment = structuredClone(comments.existing);
    if (!authoredComment.user) {
      throw new Error("Synthetic comment must have an author.");
    }
    authoredComment.body = "I left feedback on this pull request";
    authoredComment.id = 405;
    authoredComment.pullNumber = "8";
    authoredComment.user.id = SYNTHETIC_USER_ID;
    authoredComment.user.login = SYNTHETIC_USERNAME;

    const relevantPullRequests = getRelevantTeamPullRequests({
      comments: {
        ...finalCache.mentions,
        "synthetic-repository": {
          ...finalCache.mentions["synthetic-repository"],
          "7": [mention],
          "8": [authoredComment],
        },
      },
      pullRequests: [
        ...Object.values(pullRequests),
        { ...pullRequests.unrelated, id: 106, number: 6 },
        { ...pullRequests.unrelated, id: 107, number: 7 },
        { ...pullRequests.unrelated, id: 108, number: 8 },
      ],
      reviews: {
        ...finalCache.reviewPerRepoPerPullNumber,
        "synthetic-repository": {
          ...finalCache.reviewPerRepoPerPullNumber["synthetic-repository"],
          "6": [submittedReview],
        },
      },
      user: {
        id: SYNTHETIC_USER_ID,
        login: SYNTHETIC_USERNAME,
      },
    });

    expect(relevantPullRequests.map((pullRequest) => pullRequest.number)).toEqual(
      [4, 6, 7, 8],
    );
  });
});
