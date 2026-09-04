import { CommentDiscussionIcon } from "@primer/octicons-react";
import { Badge, Box, Callout, Flex, Heading } from "@radix-ui/themes";
import { useLocation } from "@tanstack/react-router";
import { PullRequestCard } from "../../components/PullRequestsCard/PullRequestsCard";
import { useMentions } from "./useMentions";
import { LoadingPage } from "../../components/LoadingPage/LoadingPage";

export const Mentions = () => {
  const { error, data, isFetching } = useMentions();
  const location = useLocation();

  if (isFetching && !data) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <Flex
        direction="column"
        flexGrow="1"
        height="100%"
        width="100%"
        align="center"
        justify="center"
      >
        <Callout.Root>
          <Callout.Text>{error.message}</Callout.Text>
        </Callout.Root>
      </Flex>
    );
  }

  if (!data) {
    return null;
  }

  const isMy = location.pathname === "/myPullRequests/mentions";

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
        <Badge
          size="1"
          color="bronze"
          className="bright-background-text-shadow"
        >
          {isMy ? "My Pull Requests" : "Team Pull Requests"}
        </Badge>

        <Heading
          weight="bold"
          style={{ color: "var(--accent-12)" }}
          className="bright-background-text-shadow"
        >
          <Flex align="center" gap="2">
            <CommentDiscussionIcon size={16} />
            Mentions ({data.length})
          </Flex>
        </Heading>
      </Flex>

      <Flex direction="column" gap="6" p="4">
        {data.map(
          ({
            pr,
            reviewsAndWaitingReviews,
            actionByName,
            pullRequestUrl,
            waitingReviews,
            labels,
            assignees,
          }) => {
            return (
              <Box width="100%" key={pr.id}>
                <PullRequestCard
                  waitingReviews={waitingReviews}
                  reviewsGroupedbyUser={reviewsAndWaitingReviews}
                  avatarUrl={pr?.user?.avatar_url}
                  login={pr?.user?.login}
                  title={pr.title}
                  htmlUrl={pr.html_url}
                  baseBranchName={pr.base.ref}
                  branchName={pr.head.ref}
                  repositoryName={pr.head.repo.name}
                  updatedAt={pr.updated_at}
                  actionsByName={actionByName}
                  pullRequestLink={pullRequestUrl}
                  labels={labels}
                  assignees={assignees}
                />
              </Box>
            );
          }
        )}
      </Flex>
    </Flex>
  );
};
