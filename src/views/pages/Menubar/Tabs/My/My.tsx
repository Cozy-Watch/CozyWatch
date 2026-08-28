import {
  Avatar,
  Box,
  Card,
  Flex,
  Spinner,
  Switch,
  Text,
  Tooltip,
} from "@radix-ui/themes";

import { useState } from "react";
import { PullRequestList } from "src/mainProcess/api/PullRequests/utils/getDefaultData";
import { BranchTitle } from "../../../../components/PullRequestsCard/components/BranchTitle/BranchTitle";
import { CIActions } from "../../../../components/PullRequestsCard/components/CIActions/CIActions";
import { LastUpdate } from "../../../../components/PullRequestsCard/components/LastUpdate/LastUpdate";
import { MergeInfo } from "../../../../components/PullRequestsCard/components/MergeInfo/MergeInfo";
import { Repository } from "../../../../components/PullRequestsCard/components/Repository/Repository";
import { Review } from "../../../../components/Review/Review";
import { useTabs } from "../useTabs";
import { Empty } from "../../components/Empty/Empty";

interface Props {
  pullRequests: PullRequestList;
  isCompact: boolean;
}

export const My = ({ pullRequests, isCompact }: Props) => {
  const [isWaitingForReview, setIsWaitingForReview] = useState(false);
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

  const myPullRequestsCount = data.filter(({ waitingReviews }) => {
    return isWaitingForReview ? waitingReviews > 0 : true;
  });

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
      <Flex align="center" gap="2" py="4" mt="-4" mb="-4">
        <Switch
          size="1"
          checked={isWaitingForReview}
          onCheckedChange={async (checked) => {
            setIsWaitingForReview(checked);
          }}
        />
        <Text size={isCompact ? "1" : "2"} className="mb-text-color-heading">
          Show waiting for review
        </Text>
      </Flex>

      {myPullRequestsCount.length === 0 && (
        <Empty>
          <Text style={{ color: "var(--white-a11)" }}>
            {isWaitingForReview
              ? "There are no pending reviews."
              : "You have no open pull requests."}
          </Text>
        </Empty>
      )}

      {myPullRequestsCount.map(
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
            <Box width="100%" key={pr.id}>
              <Card className="shadow-medium">
                <Flex direction="column" gap="4" flexGrow="1">
                  <Review
                    reviewsGroupedbyUser={reviewsAndWaitingReviews}
                    waitingReviews={waitingReviews}
                  />

                  <Flex gap="3" width="100%" flexGrow="1">
                    <Flex gap="1">
                      <Tooltip
                        content={`Assigned to: ${pr?.user?.login || "N/A"}, ${assignees
                          .map(({ login, name }) => login || name)
                          .join(", ")}`}
                      >
                        <Flex>
                          <Avatar
                            src={pr?.user?.avatar_url}
                            fallback={pr?.user?.login || "N/A"}
                            size="1"
                            color="amber"
                            radius="full"
                            className="accent-shadow-low"
                          />

                          {assignees.map(({ login, name, avatar }) => {
                            if (avatar === pr?.user?.avatar_url) {
                              return null;
                            }

                            return (
                              <Avatar
                                key={login || name}
                                src={avatar}
                                fallback={login || name || "N/A"}
                                size="1"
                                color="amber"
                                radius="full"
                                ml="-4"
                                className="accent-shadow-low"
                              />
                            );
                          })}
                        </Flex>
                      </Tooltip>
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

                      <Flex
                        gap="1"
                        justify="between"
                        align="center"
                        maxWidth="100%"
                      >
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
