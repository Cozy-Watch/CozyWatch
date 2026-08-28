import {
  CheckCircleFillIcon,
  XCircleFillIcon,
  CommentIcon,
  ClockIcon,
} from "@primer/octicons-react";
import { Avatar, Flex, Tooltip } from "@radix-ui/themes";
import { State } from "../../Reviews.meta";
import { getHumanState } from "../../Review.utils";

const ICON_MAP = {
  APPROVED: (
    <Flex
      position="absolute"
      align="center"
      justify="center"
      width="10px"
      height="10px"
      bottom="0"
      right="-2px"
      style={{
        color: "var(--green-10)",
        borderRadius: "50%",
        border: "1px solid var(--gray-1)",
        backgroundColor: "var(--green-1)",
      }}
    >
      <CheckCircleFillIcon size={9} />
    </Flex>
  ),
  CHANGES_REQUESTED: (
    <Flex
      position="absolute"
      align="center"
      justify="center"
      width="10px"
      height="10px"
      bottom="0"
      right="-2px"
      style={{
        color: "var(--red-10)",
        borderRadius: "50%",
        border: "1px solid var(--gray-1)",
        backgroundColor: "var(--red-1)",
      }}
    >
      <XCircleFillIcon size={10} />
    </Flex>
  ),
  COMMENTED: (
    <Flex
      position="absolute"
      align="center"
      justify="center"
      width="10px"
      height="10px"
      bottom="0"
      right="-2px"
      style={{
        color: "var(--yellow-1)",
        borderRadius: "50%",
        border: "1px solid var(--gray-1)",
        backgroundColor: "var(--yellow-10)",
      }}
    >
      <CommentIcon size={5} />
    </Flex>
  ),
  NO_FEEDBACK: (
    <Flex
      position="absolute"
      align="center"
      justify="center"
      width="10px"
      height="10px"
      bottom="0"
      right="-2px"
      style={{
        color: "var(--blue-1)",
        backgroundColor: "var(--blue-10)",
        borderRadius: "50%",
      }}
    >
      <ClockIcon size={11} />
    </Flex>
  ),
};

interface Props {
  state: string;
  userAvatar: string;
  userName: string;
  isFirst?: boolean;
}

export const ReviewAvatar = ({
  state: baseState,
  userAvatar,
  userName,
  isFirst = true,
}: Props) => {
  const state = baseState as State;
  const humanState = getHumanState(state);
  return (
    <Flex position="relative">
      <Tooltip
        side="bottom"
        content={userName ? `${humanState} by ${userName}` : "N/A"}
      >
        <Avatar
          src={userAvatar}
          fallback={userName || "N/A"}
          size="1"
          radius="full"
          ml={isFirst ? "0" : "-3"}
        />
      </Tooltip>

      {ICON_MAP[state || "NO_FEEDBACK"]}
    </Flex>
  );
};
