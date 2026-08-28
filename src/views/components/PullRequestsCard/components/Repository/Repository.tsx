import { RepoIcon } from "@primer/octicons-react";
import { Flex, Text } from "@radix-ui/themes";

interface Props {
  repositoryName: string;
  isCompact?: boolean;
}

export const Repository = ({ repositoryName, isCompact }: Props) => {
  return (
    <Flex
      align="center"
      gap="1"
      p={isCompact ? "0" : "1"}
      className="mb-text-color"
      {...(isCompact
        ? {}
        : {
            style: {
              background: "var(--gray-a2)",
              borderRadius: "4px",
            },
          })}
    >
      <Flex width="12" height="12" className="mb-text-color-light">
        <RepoIcon size={12} />
      </Flex>

      <Flex maxWidth="160px">
        <Text
          truncate
          size="1"
          className={
            isCompact
              ? "mb-text-color"
              : "mb-text-color bright-background-text-shadow"
          }
        >
          {repositoryName}
        </Text>
      </Flex>
    </Flex>
  );
};
