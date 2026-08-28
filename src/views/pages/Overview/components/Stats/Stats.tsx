import { AlertIcon, CheckIcon, ClockIcon } from "@primer/octicons-react";
import { Card, Flex, Grid, Skeleton, Text } from "@radix-ui/themes";
import { usePullRequest } from "../../../../hooks/usePullRequests";
import { useOverView } from "../../useOverview";

export const Stats = () => {
  const { isFetching: isFetchingOverView } = useOverView();
  const { error, data, isFetching } = usePullRequest();

  if (isFetching || isFetchingOverView) {
    return (
      <Grid
        columns="3"
        style={{ color: "var(--accent-12)" }}
        align="center"
        gap="2"
        width="100%"
      >
        <Skeleton height="68px" width="100%" />
        <Skeleton height="68px" width="100%" />
        <Skeleton height="68px" width="100%" />
      </Grid>
    );
  }
  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!data) {
    return null;
  }

  const { waitingMyReview, waitingReview, fullyApproved, myPullRequests } =
    data;

  return (
    <>
      <Grid
        columns="3"
        style={{ color: "var(--accent-12)" }}
        align="center"
        gap="2"
        width="100%"
      >
        <Card
          className="accent-shadow-low"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-a1), var(--accent-a4), var(--accent-a1))",
          }}
        >
          <Flex
            justify="between"
            align="center"
            style={{ color: "var(--accent-10)" }}
          >
            <Flex direction="column">
              <Text size="1" style={{ color: "var(--gray-11)" }}>
                Waiting my review
              </Text>
              <Text
                size="5"
                weight="bold"
                style={{ color: "var(--accent-12)" }}
              >
                {waitingMyReview.length}
              </Text>
            </Flex>

            <AlertIcon size={20} />
          </Flex>
        </Card>

        <Card
          className="accent-shadow-low"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-a1), var(--accent-a4), var(--accent-a1))",
          }}
        >
          <Flex
            justify="between"
            align="center"
            style={{ color: "var(--accent-10)" }}
          >
            <Flex direction="column">
              <Text size="1" style={{ color: "var(--gray-11)" }}>
                Waiting to be reviewed
              </Text>
              <Text
                size="5"
                weight="bold"
                style={{ color: "var(--accent-12)" }}
              >
                {waitingReview.length}
              </Text>
            </Flex>

            <ClockIcon size={20} />
          </Flex>
        </Card>

        <Card
          className="accent-shadow-low"
          style={{
            background: `linear-gradient(135deg, var(--${fullyApproved.length === myPullRequests.length ? "green" : "accent"}-a1), var(--${fullyApproved.length === myPullRequests.length ? "green" : "accent"}-a4), var(--${fullyApproved.length === myPullRequests.length ? "green" : "accent"}-a1))`,
          }}
        >
          <Flex
            justify="between"
            align="center"
            style={{ color: "var(--accent-10)" }}
          >
            <Flex direction="column">
              <Text size="1" style={{ color: "var(--gray-11)" }}>
                Approved Pull Requests
              </Text>
              <Text
                size="5"
                weight="bold"
                style={{
                  color: `var(--${fullyApproved.length === myPullRequests.length ? "green" : "accent"}-12)`,
                }}
              >
                {fullyApproved.length} of {myPullRequests.length}
              </Text>
            </Flex>

            <Text
              style={{
                color: `var(--${fullyApproved.length === myPullRequests.length ? "green" : "accent"}-12)`,
              }}
            >
              <CheckIcon size={20} />
            </Text>
          </Flex>
        </Card>
      </Grid>
    </>
  );
};
