import { LinkExternalIcon } from "@primer/octicons-react";
import { Flex, Tooltip, Button, Text } from "@radix-ui/themes";

interface Props {
  title: string;
  htmlUrl: string;
  isCompact?: boolean;
}

export const BranchTitle = ({ title, htmlUrl, isCompact }: Props) => {
  return (
    <Flex align="center" maxWidth="80%">
      <Text
        className={
          isCompact
            ? "mb-text-color-heading"
            : "mb-text-color inverse-accent-text-shadow"
        }
        size={isCompact ? "1" : "2"}
        truncate
      >
        {title}
      </Text>

      <Tooltip content="View on GitHub">
        <Button
          variant="outline"
          size="1"
          className="mb-text-color"
          style={{
            width: "12px",
            height: "12px",
            boxShadow: "none",
          }}
          onClick={() => {
            window.electronAPI.openExternalLink(htmlUrl);
          }}
        >
          <Flex width="12" height="12" className="mb-text-color-light">
            <LinkExternalIcon size={12} />
          </Flex>
        </Button>
      </Tooltip>
    </Flex>
  );
};
