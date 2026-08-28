import { getReviewStatusUpdate } from "../getReviewStatusUpdate";
import { finalPullRequestCache } from "../tests/mocks/finalCache.mock";
import { initialPullRequestCache } from "../tests/mocks/initialCache.mock";

describe("getReviewStatusUpdate", () => {
  it("should correctly identify PR status update", () => {
    const reviewUpdateByPRnumber = getReviewStatusUpdate({
      repositoryName: "CozyWatch",
      initialCache: initialPullRequestCache,
      finalCache: finalPullRequestCache,
      userId: 776452,
    });

    const { newReview, reviewChanged } = reviewUpdateByPRnumber;

    expect(newReview.length).toBe(2);
    expect(newReview[0].prNumber).toBe("1");
    expect(newReview[1].prNumber).toBe("2");
    expect(newReview[1].pullRequestData).toBeDefined();
    expect(reviewChanged.length).toBe(1);
    expect(reviewChanged[0].prNumber).toBe("1");
    expect(reviewChanged[0].pullRequestData).toBeDefined();
  });
});
