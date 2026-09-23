import {
  AlertIcon,
  BellIcon,
  CommentDiscussionIcon,
  GitPullRequestIcon,
  CodeReviewIcon,
  WorkflowIcon,
} from "@primer/octicons-react";
import { Badge, Button, Card, Flex, Select, Text } from "@radix-ui/themes";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useEffect, useState } from "react";
import type {
  NotificationRecord,
  NotificationType,
} from "../../../mainProcess/safeStorage/safeStorage.types";
import {
  notificationQueryKey,
  useNotifications,
} from "../../hooks/useNotifications";

const queryKey = notificationQueryKey;
const typeLabels: Record<NotificationType, string> = {
  pullRequest: "Pull requests",
  review: "Reviews",
  ci: "CI",
  mention: "Mentions",
  system: "System",
};

const iconForType = (type: NotificationType) => {
  if (type === "pullRequest") return <GitPullRequestIcon size={16} />;
  if (type === "review") return <CodeReviewIcon size={16} />;
  if (type === "ci") return <WorkflowIcon size={16} />;
  if (type === "mention") return <CommentDiscussionIcon size={16} />;
  return <AlertIcon size={16} />;
};

const relativeTime = (date: string) => {
  const seconds = Math.max(
    0,
    Math.round((Date.now() - new Date(date).getTime()) / 1000),
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
};

interface NotificationListProps {
  isPending: boolean;
  notifications: NotificationRecord[];
}

const NotificationList = ({
  isPending,
  notifications,
}: NotificationListProps) => {
  if (isPending) {
    return <Text color="gray">Loading notifications…</Text>;
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <Flex direction="column" align="center" gap="2" p="6">
          <BellIcon size={24} />
          <Text weight="medium">No notifications</Text>
          <Text size="2" color="gray">
            New activity will appear here.
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="2">
      {notifications.map((item) => (
        <Card
          key={item.id}
          variant="ghost"
          style={{ opacity: item.read ? 0.78 : 1 }}
        >
          <Flex gap="3" align="start">
            <Flex pt="1" style={{ color: "var(--accent-11)" }}>
              {iconForType(item.type)}
            </Flex>
            <Flex direction="column" gap="1" flexGrow="1">
              <Flex justify="between" gap="2">
                <Text weight={item.read ? "regular" : "bold"}>
                  {item.title}
                </Text>
                <Text size="1" color="gray">
                  {relativeTime(item.createdAt)}
                </Text>
              </Flex>
              <Text size="2" color="gray">
                {item.body}
              </Text>
              {!item.read && (
                <Text size="1" style={{ color: "var(--accent-11)" }}>
                  Unread
                </Text>
              )}
            </Flex>
          </Flex>
        </Card>
      ))}
    </Flex>
  );
};

export const Notifications = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("all");
  const [type, setType] = useState<NotificationType | "all">("all");
  const { data = [], isPending } = useNotifications();

  const unreadCount = data.filter((item) => !item.read).length;
  const filtered = useMemo(
    () =>
      data.filter(
        (item) =>
          (tab === "all" || !item.read) &&
          (type === "all" || item.type === type),
      ),
    [data, tab, type],
  );

  useEffect(() => {
    if (isPending) return;

    void window.electronAPI.application.markAllNotificationsRead().then(() => {
      queryClient.setQueryData<NotificationRecord[]>(queryKey, (old = []) =>
        old.map((item) => ({ ...item, read: true })),
      );
    });
  }, [isPending, queryClient]);

  return (
    <Flex direction="column" gap="4" p="4" overflow="auto" height="100%">
      <Flex align="center" justify="between">
        <Flex align="center" gap="2" style={{ color: "var(--accent-12)" }}>
          <BellIcon size={18} />
          <Text weight="bold">Notifications</Text>
          <Badge>{unreadCount > 99 ? "99+" : unreadCount}</Badge>
        </Flex>
      </Flex>

      <Flex align="center" justify="between" gap="3">
        <Flex aria-label="Notification filters" gap="2" role="group">
          {[
            { value: "all", label: "All", count: data.length },
            { value: "unread", label: "Unread", count: unreadCount },
          ].map(({ count, label, value }) => {
            const isActive = tab === value;

            return (
              <Button
                key={value}
                aria-pressed={isActive}
                onClick={() => setTab(value)}
                radius="full"
                size="1"
                variant={isActive ? "solid" : "soft"}
              >
                {label}
                <Badge ml="1" size="1" variant="solid" className="navigation-count-badge">
                  {isPending ? "…" : count > 99 ? "99+" : count}
                </Badge>
              </Button>
            );
          })}
        </Flex>
        <Select.Root
          value={type}
          onValueChange={(value) => setType(value as NotificationType | "all")}
        >
          <Select.Trigger placeholder="Filter type" />
          <Select.Content>
            <Select.Item value="all">All types</Select.Item>
            {(Object.keys(typeLabels) as NotificationType[]).map((key) => (
              <Select.Item key={key} value={key}>
                {typeLabels[key]}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>

      <NotificationList isPending={isPending} notifications={filtered} />
    </Flex>
  );
};
