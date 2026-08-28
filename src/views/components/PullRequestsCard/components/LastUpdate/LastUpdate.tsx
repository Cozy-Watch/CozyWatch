import { Text } from "@radix-ui/themes";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface Props {
  updatedAt: string;
  isCompact?: boolean;
}

export const LastUpdate = ({ updatedAt, isCompact }: Props) => {
  return (
    <Text
      className={
        isCompact
          ? "mb-text-color"
          : "mb-text-color bright-background-text-shadow"
      }
      size="1"
    >
      {dayjs(updatedAt).toNow()}
    </Text>
  );
};
