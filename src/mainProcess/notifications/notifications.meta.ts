import { NotificationSettingsPerKey } from "../safeStorage/safeStorage.types";

export const NOTIFICATION_DEFAULT_SETTINGS: NotificationSettingsPerKey = {
  pullRequestsAddedNotification: {
    title: "New Pull Request",
    description: "Get notified when a new pull request is created.",
    value: true,
  },
  newReviewsNotification: {
    title: "New Review",
    description: "Get notified when a new review is added.",
    value: true,
  },
  pullRequestsRemovedNotification: {
    title: "Pull Request Closed",
    description: "Get notified when a pull request is closed.",
    value: false,
  },
  reviewsUpdateNotification: {
    title: "Review Update",
    description: "Get notified when a review is updated.",
    value: false,
  },
  ciStatusNotification: {
    title: "CI Status",
    description: "Get notified about CI status changes.",
    value: false,
  },
  mentionsNotification: {
    title: "Mentions",
    description: "Get notified you are mentioned in a comment.",
    value: false,
  },
};
