import {
  AlertIcon,
  CheckIcon,
  ClockIcon,
  CommentDiscussionIcon,
  EyeIcon,
  HomeIcon,
  PersonIcon,
} from "@primer/octicons-react";
import { Badge, Button, Flex, Separator, Text } from "@radix-ui/themes";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../../../../context/Auth/useAuth";
import { usePullRequest } from "../../../../hooks/usePullRequests";
import { SidebarLoading } from "./Sidebar.loading";

export const Sidebar = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return <SidebarContent />;
};
const SidebarContent = () => {
  const { data, isFetching } = usePullRequest();

  const location = useLocation();

  const navigation = useNavigate({ from: location.pathname });

  if (isFetching) {
    return <SidebarLoading />;
  }

  if (!data) {
    return null;
  }

  const {
    waitingReview,
    reviewed,
    waitingMyReview,
    reviewedByMe,
    mentionsInTeamsPr,
    mentionsInMyPr,
    teamFullyApproved,
    fullyApproved,
  } = data;

  return (
    <Flex position="sticky" direction="column" minWidth="260px" width="260px">
      <Flex position="absolute" top="0" left="0" width="100%" height="100%">
        <Flex direction="column" gap="3" justify="between" flexGrow="1" p="4">
          <Flex direction="column" gap="3">
            <Text size="1" className="inverse-accent-text-shadow" weight="bold">
              OVERVIEW
            </Text>

            <Button
              variant={location.pathname === "/overview" ? "solid" : "soft"}
              onClick={() => {
                navigation({ to: "/overview" });
              }}
            >
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <HomeIcon size={16} />
                  <Text className="inverse-accent-text-shadow">Home</Text>
                </Flex>
              </Flex>
            </Button>

            <Text size="1" className="inverse-accent-text-shadow" weight="bold">
              MY PULL REQUESTS
            </Text>

            <Button
              variant={
                location.pathname === "/myPullRequests/fullyApproved"
                  ? "solid"
                  : "soft"
              }
              onClick={() => {
                navigation({ to: "/myPullRequests/fullyApproved" });
              }}
            >
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <CheckIcon size={16} />{" "}
                  <Text className="inverse-accent-text-shadow">
                    Fully Approved
                  </Text>
                </Flex>
                <Badge
                  variant={
                    location.pathname === "/myPullRequests/fullyApproved"
                      ? "solid"
                      : "soft"
                  }
                >
                  {fullyApproved.length > 99 ? "99+" : fullyApproved.length}
                </Badge>
              </Flex>
            </Button>

            <Button
              variant={
                location.pathname === "/myPullRequests/pendingReviews"
                  ? "solid"
                  : "soft"
              }
              onClick={() => {
                navigation({ to: "/myPullRequests/pendingReviews" });
              }}
            >
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <ClockIcon size={16} />
                  <Text className="inverse-accent-text-shadow">
                    Pending Review
                  </Text>
                </Flex>
                <Badge
                  variant={
                    location.pathname === "/myPullRequests/pendingReviews"
                      ? "solid"
                      : "soft"
                  }
                >
                  {waitingReview.length > 99 ? "99+" : waitingReview.length}
                </Badge>
              </Flex>
            </Button>

            <Button
              variant={
                location.pathname === "/myPullRequests/reviewed"
                  ? "solid"
                  : "soft"
              }
              onClick={() => {
                navigation({ to: "/myPullRequests/reviewed" });
              }}
            >
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <EyeIcon size={16} />{" "}
                  <Text className="inverse-accent-text-shadow">Reviewed</Text>
                </Flex>
                <Badge
                  variant={
                    location.pathname === "/myPullRequests/reviewed"
                      ? "solid"
                      : "soft"
                  }
                >
                  {reviewed.length > 99 ? "99+" : reviewed.length}
                </Badge>
              </Flex>
            </Button>

            <Button
              variant={
                location.pathname === "/myPullRequests/mentions"
                  ? "solid"
                  : "soft"
              }
              onClick={() => {
                navigation({ to: "/myPullRequests/mentions" });
              }}
            >
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <CommentDiscussionIcon size={16} />{" "}
                  <Text className="inverse-accent-text-shadow">Mentions</Text>
                </Flex>
              </Flex>
              <Badge
                variant={
                  location.pathname === "/myPullRequests/mentions"
                    ? "solid"
                    : "soft"
                }
              >
                {mentionsInMyPr.length > 99 ? "99+" : mentionsInMyPr.length}
              </Badge>
            </Button>

            <Separator size="4" />

            <Text size="1" className="inverse-accent-text-shadow" weight="bold">
              TEAM'S PULL REQUESTS
            </Text>

            <Button
              variant={
                location.pathname === "/teamPullRequest/fullyApproved"
                  ? "solid"
                  : "soft"
              }
              onClick={() => {
                navigation({ to: "/teamPullRequest/fullyApproved" });
              }}
            >
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <CheckIcon size={16} />{" "}
                  <Text className="inverse-accent-text-shadow">
                    Fully Approved
                  </Text>
                </Flex>
                <Badge
                  variant={
                    location.pathname === "/teamPullRequest/fullyApproved"
                      ? "solid"
                      : "soft"
                  }
                >
                  {teamFullyApproved.length > 99
                    ? "99+"
                    : teamFullyApproved.length}
                </Badge>
              </Flex>
            </Button>

            <Button
              variant={
                location.pathname === "/teamPullRequest/pendingReviews"
                  ? "solid"
                  : "soft"
              }
              onClick={() => {
                navigation({ to: "/teamPullRequest/pendingReviews" });
              }}
            >
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <AlertIcon size={16} />{" "}
                  <Text className="inverse-accent-text-shadow">
                    Awaiting My Review
                  </Text>
                </Flex>
                <Badge
                  variant={
                    location.pathname === "/teamPullRequest/pendingReviews"
                      ? "solid"
                      : "soft"
                  }
                >
                  {waitingMyReview.length > 99 ? "99+" : waitingMyReview.length}
                </Badge>
              </Flex>
            </Button>

            <Button
              variant={
                location.pathname === "/teamPullRequest/reviewed"
                  ? "solid"
                  : "soft"
              }
              onClick={() => {
                navigation({ to: "/teamPullRequest/reviewed" });
              }}
            >
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <PersonIcon size={16} />{" "}
                  <Text className="inverse-accent-text-shadow">
                    Reviewed by me
                  </Text>
                </Flex>
              </Flex>
              <Badge
                variant={
                  location.pathname === "/teamPullRequest/reviewed"
                    ? "solid"
                    : "soft"
                }
              >
                {reviewedByMe.length > 99 ? "99+" : reviewedByMe.length}
              </Badge>
            </Button>

            <Button
              variant={
                location.pathname === "/teamPullRequest/mentions"
                  ? "solid"
                  : "soft"
              }
              onClick={() => {
                navigation({ to: "/teamPullRequest/mentions" });
              }}
            >
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <CommentDiscussionIcon size={16} />{" "}
                  <Text className="inverse-accent-text-shadow">Mentions</Text>
                </Flex>
              </Flex>
              <Badge
                variant={
                  location.pathname === "/teamPullRequest/mentions"
                    ? "solid"
                    : "soft"
                }
              >
                {mentionsInTeamsPr.length > 99
                  ? "99+"
                  : mentionsInTeamsPr.length}
              </Badge>
            </Button>
          </Flex>

          <Flex direction="column" gap="3">
            <Separator size="4" />

            <Button
              variant={location.pathname === "/settings" ? "solid" : "soft"}
              onClick={() => {
                navigation({ to: "/settings" });
              }}
            >
              Settings
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
