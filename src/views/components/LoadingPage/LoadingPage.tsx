import { AlertIcon, ClockIcon } from "@primer/octicons-react";
import { Badge, Flex, Heading, Skeleton } from "@radix-ui/themes";
import { PullRequestLoading } from "../PullRequestsCard/PullRequestsCard.loading";

export const LoadingPage = () => {
  return (
    <Flex direction="column" overflow="auto">
      <Flex
        top="0"
        position="sticky"
        direction="column"
        gap="3"
        align="start"
        justify="center"
        p="4"
        style={{
          borderRadius: "8px",
          backdropFilter: "blur(9px)",
          zIndex: 2,
          maskImage: `linear-gradient(to bottom,black 0% 100%,red 0% 100%)`,
        }}
      >
        <Skeleton>
          <Badge
            size="1"
            color="bronze"
            className="bright-background-text-shadow"
          >
            Loading Pull Requests
          </Badge>
        </Skeleton>

        <Heading
          weight="bold"
          style={{ color: "var(--accent-12)" }}
          className="bright-background-text-shadow"
        >
          <Flex align="center" gap="2">
            <Skeleton>
              <ClockIcon size={16} /> : <AlertIcon size={16} />
            </Skeleton>

            <Skeleton>"Pending Reviews"</Skeleton>
          </Flex>
        </Heading>
      </Flex>

      <Flex direction="column" gap="6" p="4">
        {[1, 2, 3, 4].map((i) => (
          <PullRequestLoading key={i} />
        ))}
      </Flex>
    </Flex>
  );
};
