import { PullListReview } from "src/mainProcess/api/PullRequests/utils/getDefaultData";

export const getLatestReviewByUser = (humanReviews: PullListReview) => {
  return humanReviews.reduce(
    (acc, review) => {
      if (review?.user?.id) {
        const existingReview = acc[review.user.id];
        // Only update if this review is newer than the existing one
        if (!existingReview) {
          return {
            ...acc,
            [review.user.id]: review,
          };
        }

        // Compare timestamps if both exist
        if (review.submitted_at && existingReview.submitted_at) {
          if (
            new Date(review.submitted_at).getTime() >
            new Date(existingReview.submitted_at).getTime()
          ) {
            return {
              ...acc,
              [review.user.id]: review,
            };
          }
        }
      }
      return acc;
    },
    {} as Record<number, (typeof humanReviews)[0]>
  );
};
