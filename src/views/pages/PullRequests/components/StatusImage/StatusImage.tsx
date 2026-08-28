import { Tooltip } from "@radix-ui/themes";

const imagesMap = {
  APPROVED: "approved@2x.png",
  COMMENTED: "commented@2x.png",
  CHANGES_REQUESTED: "changes@2x.png",
};

type StatusKey = keyof typeof imagesMap;

interface Props {
  status: StatusKey;
}

export const StatusImage = ({ status }: Props) => {
  const readableStatus =
    status === "APPROVED"
      ? "Approved"
      : status === "COMMENTED"
        ? "Commented"
        : "Changes Requested";

  return (
    <Tooltip content={readableStatus}>
      <img
        src={`./images/${imagesMap[status]}`}
        width="14"
        height="14"
        alt={readableStatus}
      />
    </Tooltip>
  );
};
