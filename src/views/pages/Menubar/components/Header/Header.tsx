import { BellIcon, GearIcon, KebabHorizontalIcon, RocketIcon, SyncIcon } from "@primer/octicons-react";
import { Avatar, DropdownMenu, Flex, IconButton, Text, Tooltip } from "@radix-ui/themes";
import { useNotifications } from "../../../../hooks/useNotifications";
import { DashboardButton } from "./DashboardButton";

interface Props {
  avatarUrl?: string;
  login?: string;
  name?: string | null;
  isCompact: boolean;
}

export const Header = ({ avatarUrl, login, name, isCompact }: Props) => {
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const accountName = name || login || "GitHub account";

  return (
    <Flex className="menubar-header" align="center" justify="between">
      <DashboardButton isCompact={isCompact} />
      <Flex className="menubar-header-actions" align="center" gap="2">
        <Tooltip content="Notifications">
          <IconButton
            className="menubar-notifications-button"
            variant="ghost"
            size={isCompact ? "1" : "2"}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            onClick={() => window.electronAPI.application.navigateToRoute("notifications")}
          >
            <BellIcon size={18} />
            {unreadCount > 0 && <span className="menubar-unread-dot" aria-hidden="true" />}
          </IconButton>
        </Tooltip>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton variant="ghost" size={isCompact ? "1" : "2"} aria-label="Open app menu">
              <KebabHorizontalIcon size={18} />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" size="2">
            <Flex align="center" gap="2" px="2" py="2">
              <Avatar src={avatarUrl} size="1" radius="full" fallback={(login || accountName).slice(0, 2)} />
              <Text className="menubar-menu-account" size="2" title={accountName}>{accountName}</Text>
            </Flex>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onSelect={() => window.electronAPI.application.navigateToRoute("overview")}>
              <RocketIcon size={16} /> Dashboard
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => window.electronAPI.application.navigateToRoute("settings")}>
              <GearIcon size={16} /> Settings
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => window.electronAPI.application.refreshPoll()}>
              <SyncIcon size={16} /> Refresh
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Flex>
    </Flex>
  );
};
