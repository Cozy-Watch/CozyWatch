import { Box, Card, Flex, Spinner, Switch, Text } from "@radix-ui/themes";

import { useState } from "react";
import { PullRequestList } from "src/mainProcess/api/PullRequests/utils/getDefaultData";
import { BranchTitle } from "../../../../components/PullRequestsCard/components/BranchTitle/BranchTitle";
import { CIActions } from "../../../../components/PullRequestsCard/components/CIActions/CIActions";
import { LastUpdate } from "../../../../components/PullRequestsCard/components/LastUpdate/LastUpdate";
import { MergeInfo } from "../../../../components/PullRequestsCard/components/MergeInfo/MergeInfo";
import { Repository } from "../../../../components/PullRequestsCard/components/Repository/Repository";
import { Review } from "../../../../components/Review/Review";
import { MergePullRequestAction } from "../../../../components/MergePullRequestAction/MergePullRequestAction";
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
      gap="2"
      direction="column"
      width="100%"
      minHeight="100%"
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
                  <Flex gap="2" justify="between">
                    <Repository repositoryName={pr.head.repo.name} isCompact />
                    <LastUpdate updatedAt={pr.updated_at} isCompact />
                  </Flex>

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
                    <MergePullRequestAction pullRequest={pr} />
                  </Flex>
                </Flex>
              </Box>
            );
          }

          return (
            <Box width="100%" key={pr.id}>
              <Card className="shadow-medium">
                <Flex direction="column" gap="4" flexGrow="1">
                  <Flex align="center" justify="between">
                    <Review
                      reviewsGroupedbyUser={reviewsAndWaitingReviews}
                      waitingReviews={waitingReviews}
                    />

                    <Flex flexGrow="1" justify="end">
                      <LastUpdate updatedAt={pr.updated_at} />
                    </Flex>
                  </Flex>

                  <Flex gap="3" width="100%" flexGrow="1">
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
                        <MergePullRequestAction pullRequest={pr} />

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
