import { AlertIcon, CheckIcon, ClockIcon } from "@primer/octicons-react";
import { Button, Card, Flex, Grid, Skeleton, Text } from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import { usePullRequest } from "../../../../hooks/usePullRequests";
import { useOverView } from "../../useOverview";

export const Stats = () => {
  const { isFetching: isFetchingOverView } = useOverView();
  const { error, data, isFetching } = usePullRequest();
  const navigate = useNavigate();

  if ((isFetching || isFetchingOverView) && !data) {
    return (
      <Grid
        columns="3"
        style={{ color: "var(--accent-12)" }}
        align="stretch"
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
  const nothingToReview = waitingMyReview.length === 0;
  const nothingAwaitingReview = waitingReview.length === 0;

  return (
    <>
      <Grid
        columns="3"
        style={{ color: "var(--accent-12)" }}
        align="stretch"
        gap="2"
        width="100%"
      >
        <Button
          variant="ghost"
          style={{
            height: "100%",
            padding: 0,
            width: "100%",
            margin: 0,
          }}
          onClick={() => navigate({ to: "/teamPullRequest/pendingReviews" })}
        >
          <Card
            className="accent-shadow-low"
            style={{
              background: nothingToReview
                ? "linear-gradient(135deg, var(--green-a2), var(--green-a4), var(--green-a2))"
                : "linear-gradient(135deg, var(--accent-a1), var(--accent-a4), var(--accent-a1))",
              width: "100%",
              height: "100%",
            }}
          >
            <Flex
              justify="between"
              align="center"
              style={{ color: nothingToReview ? "var(--green-11)" : "var(--accent-10)" }}
            >
              <Flex direction="column">
                <Text size="2" style={{ color: "var(--gray-11)" }}>
                  Waiting my review
                </Text>
                <Text
                  size="5"
                  weight="bold"
                  style={{ color: nothingToReview ? "var(--green-12)" : "var(--accent-12)" }}
                >
                  {waitingMyReview.length}
                </Text>
                {nothingToReview && (
                  <Text size="1" style={{ color: "var(--green-11)" }}>
                    All caught up
                  </Text>
                )}
              </Flex>

              {nothingToReview ? <CheckIcon size={20} /> : <AlertIcon size={20} />}
            </Flex>
          </Card>
        </Button>

        <Button
          variant="ghost"
          style={{ height: "100%", padding: 0, width: "100%", margin: 0 }}
          onClick={() => navigate({ to: "/myPullRequests/pendingReviews" })}
        >
          <Card
            className="accent-shadow-low"
            style={{
              background: nothingAwaitingReview
                ? "linear-gradient(135deg, var(--green-a2), var(--green-a4), var(--green-a2))"
                : "linear-gradient(135deg, var(--accent-a1), var(--accent-a4), var(--accent-a1))",
              width: "100%",
              height: "100%",
            }}
          >
            <Flex
              justify="between"
              align="center"
              style={{ color: nothingAwaitingReview ? "var(--green-11)" : "var(--accent-10)" }}
            >
              <Flex direction="column">
                <Text size="2" style={{ color: "var(--gray-11)" }}>
                  Waiting to be reviewed
                </Text>
                <Text
                  size="5"
                  weight="bold"
                  style={{ color: nothingAwaitingReview ? "var(--green-12)" : "var(--accent-12)" }}
                >
                  {waitingReview.length}
                </Text>
                {nothingAwaitingReview && (
                  <Text size="1" style={{ color: "var(--green-11)" }}>
                    No reviews outstanding
                  </Text>
                )}
              </Flex>

              {nothingAwaitingReview ? <CheckIcon size={20} /> : <ClockIcon size={20} />}
            </Flex>
          </Card>
        </Button>

        <Button
          variant="ghost"
          style={{ height: "100%", padding: 0, width: "100%", margin: 0 }}
          onClick={() => navigate({ to: "/myPullRequests/fullyApproved" })}
        >
          <Card
            className="accent-shadow-low"
            style={{
              background: `linear-gradient(135deg, var(--${fullyApproved.length === myPullRequests.length ? "green" : "accent"}-a1), var(--${fullyApproved.length === myPullRequests.length ? "green" : "accent"}-a4), var(--${fullyApproved.length === myPullRequests.length ? "green" : "accent"}-a1))`,
              width: "100%",
              height: "100%",
            }}
          >
            <Flex
              justify="between"
              align="center"
              style={{ color: "var(--accent-10)" }}
            >
              <Flex direction="column">
                <Text size="2" style={{ color: "var(--gray-11)" }}>
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
        </Button>
      </Grid>
    </>
  );
};
