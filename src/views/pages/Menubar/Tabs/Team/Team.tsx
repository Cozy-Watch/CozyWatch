import {
  Avatar,
  Box,
  Card,
  Flex,
  Spinner,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import { PullRequestList } from "src/mainProcess/api/PullRequests/utils/getDefaultData";
import { BranchTitle } from "../../../../components/PullRequestsCard/components/BranchTitle/BranchTitle";
import { CIActions } from "../../../../components/PullRequestsCard/components/CIActions/CIActions";
import { LastUpdate } from "../../../../components/PullRequestsCard/components/LastUpdate/LastUpdate";
import { MergeInfo } from "../../../../components/PullRequestsCard/components/MergeInfo/MergeInfo";
import { Repository } from "../../../../components/PullRequestsCard/components/Repository/Repository";
import { Review } from "../../../../components/Review/Review";
import { Empty } from "../../components/Empty/Empty";
import { useTabs } from "../useTabs";

interface Props {
  pullRequests: PullRequestList;
  isCompact: boolean;
}

export const Team = ({ pullRequests, isCompact }: Props) => {
  const { isFetching, error, data } = useTabs(pullRequests);

  if (isFetching) {
    return (
      <Flex
        direction="column"
        height="100vh"
        width="100vw"
        p={isCompact ? "2" : "3"}
        align="center"
        justify="center"
      >
        <Spinner />
      </Flex>
    );
  }

  if (error) {
    return <Text color="red">Error loading pull requests</Text>;
  }

  if (!data) {
    return null;
  }

  return (
    <Flex
      gap="4"
      direction="column"
      width="100%"
      height="100%"
      px={isCompact ? "2" : "3"}
      pb={isCompact ? "2" : "3"}
      pt={isCompact ? "2" : "3"}
    >
      {data.length === 0 && <Empty />}

      {data.map(
        ({
          pr,
          reviewsAndWaitingReviews,
          actionByName,
          pullRequestUrl,
          waitingReviews,
          assignees,
        }) => {
          if (isCompact) {
            return (
              <Box width="100%" key={pr.id}>
                <Flex
                  justify="between"
                  className="mb-card-bg"
                  style={{
                    borderRadius: "var(--radius-2)",
                  }}
                  p="2"
                  width="100%"
                  direction="column"
                  gap="3"
                >
                  <Repository repositoryName={pr.head.repo.name} isCompact />

                  <BranchTitle
                    title={pr.title}
                    htmlUrl={pr.html_url}
                    isCompact
                  />

                  <MergeInfo
                    baseBranchName={pr.base.ref}
                    branchName={pr.head.ref}
                    isCompact
                  />

                  <Flex align="center" justify="between">
                    <Flex gap="3" align="center">
                      <Review
                        isCompact
                        reviewsGroupedbyUser={reviewsAndWaitingReviews}
                        waitingReviews={waitingReviews}
                      />

                      <CIActions
                        actionsByName={actionByName}
                        pullRequestLink={pullRequestUrl}
                        isCompact
                      />
                    </Flex>

                    <LastUpdate updatedAt={pr.updated_at} isCompact />
                  </Flex>
                </Flex>
              </Box>
            );
          }

          return (
            <Box width="100%" key={pr.id} height="100%">
              <Card className="shadow-medium">
                <Flex direction="column" gap="4" flexGrow="1">
                  <Review
                    reviewsGroupedbyUser={reviewsAndWaitingReviews}
                    waitingReviews={waitingReviews}
                  />

                  <Flex gap="3" width="100%" flexGrow="1">
                    <Flex gap="1">
                      <Tooltip content={pr?.user?.login || "N/A"}>
                        <Avatar
                          src={pr?.user?.avatar_url}
                          fallback={pr?.user?.login || "N/A"}
                          size="1"
                          color="amber"
                          radius="full"
                          className="accent-shadow-low"
                        />
                      </Tooltip>

                      {assignees.map(({ login, name, avatar }) => {
                        if (avatar === pr?.user?.avatar_url) {
                          return null;
                        }

                        return (
                          <Tooltip
                            key={login || name}
                            content={login || name || "N/A"}
                          >
                            <Avatar
                              src={avatar}
                              fallback={login || name || "N/A"}
                              size="1"
                              color="amber"
                              radius="full"
                              ml="-3"
                              className="accent-shadow-low"
                            />
                          </Tooltip>
                        );
                      })}
                    </Flex>

                    <Flex
                      direction="column"
                      gap="2"
                      width="100%"
                      maxWidth="100%"
                      overflow="auto"
                    >
                      <BranchTitle title={pr.title} htmlUrl={pr.html_url} />

                      <Flex gap="1" justify="between" align="center">
                        <Repository repositoryName={pr.head.repo.name} />
                      </Flex>

                      <Flex gap="1" justify="between" align="center">
                        <MergeInfo
                          baseBranchName={pr.base.ref}
                          branchName={pr.head.ref}
                        />
                      </Flex>

                      <Flex
                        align="center"
                        justify="between"
                        direction="row-reverse"
                        gap="1"
                      >
                        <LastUpdate updatedAt={pr.updated_at} />

                        <CIActions
                          actionsByName={actionByName}
                          pullRequestLink={pullRequestUrl}
                        />
                      </Flex>
                    </Flex>
                  </Flex>
                </Flex>
              </Card>
            </Box>
          );
        },
      )}
    </Flex>
  );
};
