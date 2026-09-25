import { tryOpenExternalUrl } from "../../../security/externalUrl";
import type { CacheData } from "./getDefaultData";

export const getReviewNotifications = (
  changes: CacheData["reviewUpdateList"],
) => [
  ...changes.newReview.map((review) => ({
    title: "New Review",
    body: `${review.userType === "Bot" ? "bot" : review.login} reviewed "${review.pullRequestData?.title}" and ${review.state === "APPROVED" ? "approved it" : review.state === "COMMENTED" ? "left a comment" : review.state === "DISMISSED" ? "had their review dismissed" : "requested some changes"}.`,
    onClick: () => {
      tryOpenExternalUrl(review.html_url);
    },
  })),
  ...changes.reviewChanged.map((review) => ({
    title: "Updated Review",
    body:
      review.state === "APPROVED"
        ? `"${review.pullRequestData?.title}" is now approved.`
        : `${review.userType === "Bot" ? "bot" : review.login} reviewed "${review.pullRequestData?.title}" and ${review.state === "COMMENTED" ? "left a comment" : review.state === "DISMISSED" ? "had their review dismissed" : "requested some changes"}.`,
    onClick: () => {
      tryOpenExternalUrl(review.html_url);
    },
  })),
];
