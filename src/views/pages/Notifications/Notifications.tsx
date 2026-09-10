import {
  AlertIcon,
  BellIcon,
  CommentDiscussionIcon,
  GitPullRequestIcon,
  CodeReviewIcon,
  WorkflowIcon,
} from "@primer/octicons-react";
import { Badge, Button, Card, Flex, Select, Tabs, Text } from "@radix-ui/themes";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type {
  NotificationRecord,
  NotificationType,
} from "../../../mainProcess/safeStorage/safeStorage.types";
import { notificationQueryKey, useNotifications } from "../../hooks/useNotifications";

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
  const seconds = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
};

export const Notifications = () => {
  const queryClient = useQueryClient();
  const { notificationId } = useSearch({ from: "/notifications" });
  const [selectedId, setSelectedId] = useState<string | undefined>(notificationId);
  const [tab, setTab] = useState("all");
  const [type, setType] = useState<NotificationType | "all">("all");
  const { data = [], isPending } = useNotifications();

  const unreadCount = data.filter((item) => !item.read).length;
  const filtered = useMemo(
    () => data.filter((item) => (tab === "all" || !item.read) && (type === "all" || item.type === type)),
    [data, tab, type],
  );
  const selected = data.find((item) => item.id === selectedId);

  const selectNotification = async (item: NotificationRecord) => {
    setSelectedId(item.id);
    if (!item.read) {
      await window.electronAPI.application.markNotificationRead(item.id);
      queryClient.setQueryData<NotificationRecord[]>(queryKey, (old = []) =>
        old.map((current) => current.id === item.id ? { ...current, read: true } : current),
      );
    }
  };

  return (
    <Flex direction="column" gap="4" p="4" overflow="auto" height="100%">
      <Flex align="center" justify="between">
        <Flex align="center" gap="2" style={{ color: "var(--accent-12)" }}>
          <BellIcon size={18} />
          <Text weight="bold">Notifications</Text>
          <Badge>{unreadCount > 99 ? "99+" : unreadCount}</Badge>
        </Flex>
        <Flex gap="2">
          <Button size="1" variant="soft" disabled={unreadCount === 0} onClick={async () => {
            await window.electronAPI.application.markAllNotificationsRead();
            queryClient.setQueryData<NotificationRecord[]>(queryKey, (old = []) => old.map((item) => ({ ...item, read: true })));
          }}>Mark all as read</Button>
          <Button size="1" variant="soft" color="red" disabled={data.length === 0} onClick={async () => {
            await window.electronAPI.application.clearNotificationHistory();
            queryClient.setQueryData(queryKey, []);
            setSelectedId(undefined);
          }}>Clear</Button>
        </Flex>
      </Flex>

      <Flex align="center" justify="between" gap="3">
        <Tabs.Root value={tab} onValueChange={setTab}>
          <Tabs.List>
            <Tabs.Trigger value="all">All</Tabs.Trigger>
            <Tabs.Trigger value="unread">Unread</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
        <Select.Root value={type} onValueChange={(value) => setType(value as NotificationType | "all")}>
          <Select.Trigger placeholder="Filter type" />
          <Select.Content>
            <Select.Item value="all">All types</Select.Item>
            {(Object.keys(typeLabels) as NotificationType[]).map((key) => <Select.Item key={key} value={key}>{typeLabels[key]}</Select.Item>)}
          </Select.Content>
        </Select.Root>
      </Flex>

      {isPending ? <Text color="gray">Loading notifications…</Text> : filtered.length === 0 ? (
        <Card><Flex direction="column" align="center" gap="2" p="6"><BellIcon size={24} /><Text weight="medium">No notifications</Text><Text size="2" color="gray">New activity will appear here.</Text></Flex></Card>
      ) : (
        <Flex direction="column" gap="2">
          {filtered.map((item) => (
            <Card key={item.id} variant={selectedId === item.id ? "surface" : "ghost"} onClick={() => void selectNotification(item)} style={{ cursor: "pointer", opacity: item.read ? 0.78 : 1 }}>
              <Flex gap="3" align="start">
                <Flex pt="1" style={{ color: "var(--accent-11)" }}>{iconForType(item.type)}</Flex>
                <Flex direction="column" gap="1" flexGrow="1">
                  <Flex justify="between" gap="2"><Text weight={item.read ? "regular" : "bold"}>{item.title}</Text><Text size="1" color="gray">{relativeTime(item.createdAt)}</Text></Flex>
                  <Text size="2" color="gray">{item.body}</Text>
                  {!item.read && <Text size="1" color="violet">Unread</Text>}
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      {selected && <Card><Flex direction="column" gap="2"><Text size="1" color="gray">{typeLabels[selected.type]} · {new Date(selected.createdAt).toLocaleString()}</Text><Text weight="bold">{selected.title}</Text><Text>{selected.body}</Text>{selected.url && <Button size="2" onClick={() => window.electronAPI.openExternalLink(selected.url!)}>Open in GitHub</Button>}</Flex></Card>}
    </Flex>
  );
};
