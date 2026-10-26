import { GearIcon } from "@primer/octicons-react";
import { Flex, IconButton, Tooltip } from "@radix-ui/themes";
import { DashboardButton } from "./DashboardButton";

export const HeaderEmpty = ({ isCompact }: { isCompact: boolean }) => (
  <Flex className="menubar-header" align="center" justify="between">
    <DashboardButton isCompact={isCompact} />
    <Tooltip content="Settings">
      <IconButton
        variant="ghost"
        size={isCompact ? "1" : "2"}
        aria-label="Settings"
        onClick={() => window.electronAPI.application.navigateToRoute("settings")}
      >
        <GearIcon size={18} />
      </IconButton>
    </Tooltip>
  </Flex>
);
