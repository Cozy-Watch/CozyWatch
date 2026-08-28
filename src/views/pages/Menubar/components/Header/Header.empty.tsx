import { GearIcon, SyncIcon } from "@primer/octicons-react";
import { Avatar, Button, Flex } from "@radix-ui/themes";

interface Props {
  isCompact: boolean;
}

export const HeaderEmpty = ({ isCompact }: Props) => {
  return (
    <Flex align="center" justify="between">
      <Flex
        width={isCompact ? "25px" : "40px"}
        height={isCompact ? "25px" : "40px"}
        style={
          isCompact
            ? {
                borderRadius: "var(--radius-4)",
                border: "1px solid var(--white-a12)",
                background: "var(--white-a10)",
                padding: "1px",
              }
            : {}
        }
        align="center"
        justify="center"
      >
        <img
          src={`./images/armchair.png`}
          width={isCompact ? "20px" : "40px"}
          height={isCompact ? "20px" : "40px"}
          style={{ borderRadius: isCompact ? 5 : 10 }}
        />
      </Flex>

      <Flex align="center" gap={isCompact ? "1" : "2"}>
        <Button
          variant="outline"
          style={{ boxShadow: "none", color: "var(--accent-12)" }}
          onClick={() => {
            window.electronAPI.application.navigateToRoute("settings");
          }}
        >
          <GearIcon size={16} />
        </Button>

        <Button
          variant="outline"
          style={{ boxShadow: "none", color: "var(--accent-12)" }}
          onClick={() => {}}
        >
          <SyncIcon size={16} />
        </Button>

        <Avatar
          ml="2"
          src="./images/catSittingAvatar.png"
          size={isCompact ? "1" : "3"}
          radius="full"
          fallback={"Coz"}
        />
      </Flex>
    </Flex>
  );
};
