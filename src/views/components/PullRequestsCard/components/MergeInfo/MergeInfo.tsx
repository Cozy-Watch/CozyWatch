import { ArrowRightIcon, GitMergeIcon } from "@primer/octicons-react";
import { Button, Flex, Text, Tooltip } from "@radix-ui/themes";

interface Props {
  branchName: string;
  baseBranchName: string;
  isCompact?: boolean;
}

export const MergeInfo = ({ branchName, baseBranchName, isCompact }: Props) => {
  return (
    <Flex
      align="center"
      gap="1"
      p={isCompact ? "0" : "1"}
      className="mb-text-color-heading"
      overflow="auto"
      {...(isCompact
        ? {}
        : {
            style: {
              background: "var(--gray-a2)",
              borderRadius: "4px",
            },
          })}
    >
      <Tooltip content={`Copy "${branchName}"`}>
        <Button
          variant="outline"
          size="1"
          style={{
            boxShadow: "none",
            color: "var(--gray-a11)",
            margin: "-2px",
            padding: "0",
            width: "12px",
            height: "12px",
          }}
          onClick={() => {
            navigator.clipboard.writeText(branchName);
          }}
        >
          <Flex width="12" height="12" className="mb-text-color-light">
            <GitMergeIcon size={12} />
          </Flex>
        </Button>
      </Tooltip>

      <Flex flexShrink="1" minWidth="0">
        <Text
          size="1"
          truncate
          className={
            isCompact
              ? "mb-text-color-heading"
              : "mb-text-color bright-background-text-shadow"
          }
        >
          {branchName}
        </Text>
      </Flex>

      {!isCompact && (
        <>
          <Flex width="12" height="12" className="mb-text-color">
            <ArrowRightIcon size={12} />
          </Flex>

          <Tooltip content={baseBranchName}>
            <Flex flexShrink="1" minWidth="0">
              <Text
                truncate
                size="1"
                className={
                  isCompact
                    ? "mb-text-color "
                    : "mb-text-color inverse-accent-text-shadow"
                }
                weight={isCompact ? "medium" : "regular"}
              >
                {baseBranchName}
              </Text>
            </Flex>
          </Tooltip>
        </>
      )}
    </Flex>
  );
};
