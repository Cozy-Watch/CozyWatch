import { PullsListReview as ResponsePullsListReview } from "../hooks/registerPullListReviews";
import { CacheData, ReviewData } from "./getDefaultData";

type LatestAcc = ResponsePullsListReview["data"]["0"];

const sortReviewsByDate = (a: LatestAcc, b: LatestAcc) => {
  if (a.submitted_at && b.submitted_at) {
    return (
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );
  }

  return 0;
};

interface ReviewStatusUpdate {
  newReview: ReviewData[];
  reviewChanged: ReviewData[];
}

interface Params {
  repositoryName: string;
  initialCache: CacheData;
  finalCache: CacheData;
  userId: number;
}

export const getReviewStatusUpdate = ({
  repositoryName,
  initialCache,
  finalCache,
  userId,
}: Params): ReviewStatusUpdate => {
  const pullRequestList = Object.values(
    finalCache.pullRequestsPerRepo[repositoryName] || []
  ).flat();

  const initialCacheReviews =
    initialCache.reviewPerRepoPerPullNumber[repositoryName] || {};

  const finalCacheReviews =
    finalCache.reviewPerRepoPerPullNumber[repositoryName] || {};

  const finalPullRequestNumberList = Object.keys(finalCacheReviews);

  const reviewsUpdate = finalPullRequestNumberList.reduce<ReviewStatusUpdate>(
    (acc, prNumber) => {
      const finalReviews = finalCacheReviews[prNumber] || [];
      const initialReviews = initialCacheReviews[prNumber] || [];

      const pullRequestData = pullRequestList.find((pr) => {
        return pr.number === Number(prNumber);
      });

      if (pullRequestData?.user?.id !== userId) {
        return acc;
      }

      const finalReviewByUserId = finalReviews.reduce(
        (reviewsAcc: Record<string, LatestAcc[]>, review) => {
          if (!review.user?.id) {
            return reviewsAcc;
          }

          return {
            ...reviewsAcc,
            [review.user.id]: [...(reviewsAcc[review.user.id] || []), review],
          };
        },
        {}
      );
      const initialReviewByUserId = initialReviews.reduce(
        (reviewsAcc: Record<string, LatestAcc[]>, review) => {
          if (!review.user?.id) {
            return reviewsAcc;
          }

          return {
            ...reviewsAcc,
            [review.user.id]: [...(reviewsAcc[review.user.id] || []), review],
          };
        },
        {}
      );

      const sortFinalUserReviewsByDate = Object.keys(
        finalReviewByUserId
      ).reduce((acc: Record<string, LatestAcc[]>, userId) => {
        const userReviews = finalReviewByUserId[userId].sort(sortReviewsByDate);

        return {
          ...acc,
          [userId]: userReviews,
        };
      }, {});

      const sortInitialUserReviewsByDate = Object.keys(
        initialReviewByUserId
      ).reduce((acc: Record<string, LatestAcc[]>, userId) => {
        const userReviews =
          initialReviewByUserId[userId].sort(sortReviewsByDate);

        return {
          ...acc,
          [userId]: userReviews,
        };
      }, {});

      const { newReview, reviewChanged } = Object.entries(
        sortFinalUserReviewsByDate
      ).reduce(
        (
          acc: { newReview: ReviewData[]; reviewChanged: ReviewData[] },
          [userId, review]
        ) => {
          const { id, user, html_url, state } = review[0];

          const latestInitialReview = sortInitialUserReviewsByDate[userId]?.[0];

          const data = {
            reviewId: id,
            login: user?.login ?? null,
            userType: user?.type ?? null,
            html_url,
            state,
            previousState: latestInitialReview?.state || null,
            prNumber: prNumber,
            pullRequestData,
          };

          if (!latestInitialReview) {
            // NEW REVIEWER

            return {
              ...acc,
              newReview: [...acc.newReview, data],
            };
          }

          if (latestInitialReview) {
            if (review[0].state !== latestInitialReview.state) {
              // REVIEW CHANGED

              return {
                ...acc,
                reviewChanged: [...acc.reviewChanged, data],
              };
            } else {
              // NO CHANGE
              return acc;
            }
          }

          return acc;
        },
        { newReview: [], reviewChanged: [] }
      );

      return {
        ...acc,
        newReview: [...acc.newReview, ...newReview],
        reviewChanged: [...acc.reviewChanged, ...reviewChanged],
      };
    },
    { newReview: [], reviewChanged: [] }
  );

  return reviewsUpdate;
};
