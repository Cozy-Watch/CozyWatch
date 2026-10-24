import {
  BellIcon,
  CheckCircleIcon,
  CodeReviewIcon,
  CommentDiscussionIcon,
  GitPullRequestIcon,
  LinkExternalIcon,
  WorkflowIcon,
} from "@primer/octicons-react";
import { Badge, Button, Card, Flex, Skeleton, Text } from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import type { NotificationRecord, NotificationType } from "../../../../../mainProcess/safeStorage/safeStorage.types";
import { GitHubLink } from "../../../../components/ActivityContent/GitHubLink";
import { useNotifications } from "../../../../hooks/useNotifications";

const iconForType = (type: NotificationType) => {
  if (type === "pullRequest") return <GitPullRequestIcon size={16} />;
  if (type === "review") return <CodeReviewIcon size={16} />;
  if (type === "ci") return <WorkflowIcon size={16} />;
  if (type === "mention") return <CommentDiscussionIcon size={16} />;
  return <BellIcon size={16} />;
};

const colorForActivity = (item: NotificationRecord) => {
  if (item.tone === "success") return "var(--green-11)";
  if (item.tone === "danger") return "var(--red-11)";
  if (item.tone === "neutral") return "var(--gray-11)";
  return "var(--accent-11)";
};

const formatTime = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));

const activitySource = (item: NotificationRecord) =>
  [
    item.source?.repository,
    item.source?.pullNumber ? `#${item.source.pullNumber}` : undefined,
    item.source?.branch,
  ]
    .filter(Boolean)
    .join(" · ");

export const getTodayNotifications = (
  notifications: NotificationRecord[],
  now = new Date(),
) =>
  notifications
    .filter((item) => dayjs(item.createdAt).isSame(now, "day"))
    .sort(
      (first, second) =>
        Date.parse(second.createdAt) - Date.parse(first.createdAt),
    );

export const describeActivity = (item: NotificationRecord) => {
  if (item.type === "mention") {
    const mention = item.body.match(/^(.+?) mentioned you in "(.+)"\.$/);
    if (mention) {
      return {
        title: `You were mentioned by @${mention[1]}`,
        body: `In “${mention[2]}”.`,
      };
    }

    const reviewMention = item.body.match(
      /^(.+?) mentioned you in a review comment on (.+)\.$/,
    );
    if (reviewMention) {
      return {
        title: `You were mentioned by @${reviewMention[1]}`,
        body: `In a review comment on ${reviewMention[2]}.`,
      };
    }
  }

  if (item.type === "review") {
    const review = item.body.match(
      /^(.+?) reviewed "(.+)" and (approved it|left a comment|had their review dismissed|requested some changes)\.$/,
    );
    if (review) {
      const [, reviewer, pullRequestTitle, outcome] = review;
      const messages: Record<string, string> = {
        "approved it": "Approved",
        "left a comment": "Left review feedback",
        "had their review dismissed": "Review dismissed",
        "requested some changes": "Requested changes",
      };

      return {
        title: `${messages[outcome]} · @${reviewer}`,
        body: `On “${pullRequestTitle}”.`,
      };
    }

    const approved = item.body.match(/^"(.+)" is now approved\.$/);
    if (approved) {
      return {
        title: "PR approved",
        body: `“${approved[1]}” is now approved.`,
      };
    }
  }

  if (item.type === "ci") {
    const workflow = item.title.match(/^CI "(.+)" Status Update$/)?.[1];
    const title = item.tone === "success"
      ? "Checks passed"
      : item.tone === "danger"
        ? "Checks need attention"
        : "Checks status changed";
    return {
      title,
      body: [workflow, item.body].filter(Boolean).join(" · "),
    };
  }

  if (item.type === "pullRequest") {
    if (item.title === "New Review Request") {
      return { title: "Review requested", body: item.body };
    }
    if (item.title === "Review Request Removed") {
      return { title: "Review request removed", body: item.body };
    }
    if (item.title === "Closed Pull Request") {
      return { title: "PR closed", body: item.body };
    }
    if (item.title === "New Pull Request" && item.body.startsWith("You have opened")) {
      return { title: "Your PR is open", body: item.body };
    }
    if (item.title === "New Pull Request") {
      return { title: "PR assigned to you", body: item.body };
    }
  }

  return { title: item.title, body: item.body };
};

export const TodayActivity = () => {
  const { data = [], isPending, error } = useNotifications();
  const navigate = useNavigate();
  const notifications = getTodayNotifications(data);

  return (
    <Flex direction="column" gap="3" pt="4">
      <Flex align="center" justify="between">
        <Flex align="center" gap="2" style={{ color: "var(--accent-12)" }}>
          <BellIcon size={16} />
          <Text weight="bold">Today ({notifications.length})</Text>
        </Flex>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="1"
            onClick={() => navigate({ to: "/notifications" })}
          >
            See all
          </Button>
        )}
      </Flex>

      {isPending ? (
        <Flex direction="column" gap="2">
          <Skeleton height="68px" />
          <Skeleton height="68px" />
        </Flex>
      ) : error && data.length === 0 ? (
        <Text size="2" color="gray" role="status">
          Could not load today’s activity. Your review counts are shown above.
        </Text>
      ) : notifications.length === 0 ? (
        <Card variant="ghost">
          <Flex align="center" gap="3" p="2">
            <Flex style={{ color: "var(--green-11)" }}>
              <CheckCircleIcon size={20} />
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                No updates recorded today
              </Text>
              <Text size="1" color="gray">
                Mentions, reviews, and CI updates appear here when their notifications are enabled.
              </Text>
            </Flex>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="2">
          {notifications.slice(0, 5).map((item) => {
            const source = activitySource(item);
            const activity = describeActivity(item);

            return (
              <Card key={item.id} variant="ghost">
                <Flex gap="3" align="start">
                  <Flex pt="1" style={{ color: colorForActivity(item) }}>
                    {iconForType(item.type)}
                  </Flex>
                  <Flex direction="column" gap="1" flexGrow="1" style={{ minWidth: 0 }}>
                    <Flex align="center" justify="between" gap="2">
                      <Text size="2" weight="medium">
                        {activity.title}
                      </Text>
                      <Text size="1" color="gray" style={{ flexShrink: 0 }}>
                        {formatTime(item.createdAt)}
                      </Text>
                    </Flex>
                    <Text size="2" color="gray">
                      {activity.body}
                    </Text>
                    {(source || item.url) && (
                      <Flex align="center" justify="between" gap="2">
                        {source && (
                          <Badge color="gray" variant="soft" style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                            {source}
                          </Badge>
                        )}
                        {item.url && (
                          <GitHubLink href={item.url}>
                            <Flex as="span" align="center" gap="1">
                              Open <LinkExternalIcon size={12} aria-hidden="true" />
                            </Flex>
                          </GitHubLink>
                        )}
                      </Flex>
                    )}
                  </Flex>
                </Flex>
              </Card>
            );
          })}
          {notifications.length > 5 && (
            <Text size="1" color="gray">
              {notifications.length - 5} more updates today. See all to view them.
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  );
};
