import { getReviewStatusUpdate } from "../getReviewStatusUpdate";
import {
  createSyntheticCacheFixture,
  SYNTHETIC_REPOSITORY_NAME,
  SYNTHETIC_USER_ID,
} from "./mocks/syntheticCache.mock";

describe("getReviewStatusUpdate", () => {
  it("returns the exact new and changed review contract from the cache pair", () => {
    const { finalCache, initialCache, pullRequests, reviews } =
      createSyntheticCacheFixture();

    expect(
      getReviewStatusUpdate({
        repositoryName: SYNTHETIC_REPOSITORY_NAME,
        initialCache,
        finalCache,
        userId: SYNTHETIC_USER_ID,
      }),
    ).toStrictEqual({
      newReview: [
        {
          reviewId: reviews.newReviewer30.id,
          login: "reviewer-30",
          userType: "User",
          html_url: reviews.newReviewer30.html_url,
          state: "COMMENTED",
          previousState: null,
          prNumber: "1",
          pullRequestData: pullRequests.existing,
        },
        {
          reviewId: reviews.newReviewer40.id,
          login: "reviewer-40",
          userType: "User",
          html_url: reviews.newReviewer40.html_url,
          state: "APPROVED",
          previousState: null,
          prNumber: "2",
          pullRequestData: pullRequests.added,
        },
      ],
      reviewChanged: [
        {
          reviewId: reviews.finalReviewer20Latest.id,
          login: "reviewer-20",
          userType: "User",
          html_url: reviews.finalReviewer20Latest.html_url,
          state: "APPROVED",
          previousState: "CHANGES_REQUESTED",
          prNumber: "1",
          pullRequestData: pullRequests.existing,
        },
      ],
    });
  });

  it("uses each reviewer's latest submitted state", () => {
    const { finalCache, initialCache, reviews } =
      createSyntheticCacheFixture();

    const result = getReviewStatusUpdate({
      repositoryName: SYNTHETIC_REPOSITORY_NAME,
      initialCache,
      finalCache,
      userId: SYNTHETIC_USER_ID,
    });

    expect(result.reviewChanged[0]).toMatchObject({
      reviewId: reviews.finalReviewer20Latest.id,
      previousState: reviews.initialReviewer20Latest.state,
      state: reviews.finalReviewer20Latest.state,
    });
  });

  it("ignores unchanged reviews and reviews on another user's pull request", () => {
    const { finalCache, initialCache } = createSyntheticCacheFixture();

    const result = getReviewStatusUpdate({
      repositoryName: SYNTHETIC_REPOSITORY_NAME,
      initialCache,
      finalCache,
      userId: SYNTHETIC_USER_ID,
    });

    expect(
      [...result.newReview, ...result.reviewChanged].map(
        ({ reviewId }) => reviewId,
      ),
    ).toStrictEqual([203, 204, 202]);
  });
});
