import { Button, Tooltip } from "@radix-ui/themes";

export const DashboardButton = ({ isCompact }: { isCompact: boolean }) => (
  <Tooltip content="Open dashboard">
    <Button
      className="menubar-dashboard-link"
      variant="ghost"
      size={isCompact ? "1" : "2"}
      aria-label="Open dashboard"
      onClick={() => window.electronAPI.application.navigateToRoute("overview")}
    >
      <img src="./images/armchair.png" width={isCompact ? 24 : 28} height={isCompact ? 24 : 28} alt="" />
      <span>Cozy Watch</span>
    </Button>
  </Tooltip>
);
