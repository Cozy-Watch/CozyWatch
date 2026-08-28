import { Avatar, Card, Flex, Tooltip } from "@radix-ui/themes";
import { PullsActions } from "src/mainProcess/api/PullRequests/utils/getDefaultData";
import { LastActivity } from "../Review/components/LastActivity/LastActivity";
import { Review } from "../Review/Review";
import { BranchTitle } from "./components/BranchTitle/BranchTitle";
import { CIActions } from "./components/CIActions/CIActions";
import { Labels } from "./components/Labels/Labels";
import { LastUpdate } from "./components/LastUpdate/LastUpdate";
import { MergeInfo } from "./components/MergeInfo/MergeInfo";
import { Repository } from "./components/Repository/Repository";

interface Props {
  waitingReviews: number;
  reviewsGroupedbyUser?: Record<
    string,
    {
      state: string;
      userAvatar: string;
      userName: string;
      body: string;
      date: string;
    }
  >;

  avatarUrl?: string;
  login?: string;

  title: string;
  htmlUrl: string;

  baseBranchName: string;
  branchName: string;
  repositoryName: string;

  updatedAt: string;

  actionsByName: Record<string, PullsActions[0][]>;
  pullRequestLink: string;

  labels: {
    id: number;
    node_id: string;
    url: string;
    name: string;
    description: string;
    color: string;
    default: boolean;
  }[];

  assignees?: {
    login: string;
    name?: string | null;
    avatar: string;
  }[];
}

export const PullRequestCard = ({
  waitingReviews,
  reviewsGroupedbyUser,
  avatarUrl,
  login,
  title,
  htmlUrl,
  baseBranchName,
  branchName,
  repositoryName,
  updatedAt,
  actionsByName,
  pullRequestLink,
  labels,
  assignees = [],
}: Props) => {
  return (
    <Card className="accent-shadow-low">
      <Flex
        direction="column"
        gap="4"
        flexGrow="1"
        width="100%"
        overflow="auto"
      >
        <Review
          reviewsGroupedbyUser={reviewsGroupedbyUser}
          waitingReviews={waitingReviews}
        />

        <Flex gap="3" width="100%" flexGrow="1">
          <Flex gap="1">
            <Tooltip content={login || "N/A"}>
              <Avatar
                src={avatarUrl}
                fallback={login || "N/A"}
                size="2"
                radius="full"
                className="accent-shadow-low"
              />
            </Tooltip>

            {assignees.map(({ login, name, avatar }) => {
              if (avatar === avatarUrl) {
                return null;
              }

              return (
                <Tooltip key={login || name} content={login || name || "N/A"}>
                  <Avatar
                    src={avatar}
                    fallback={login || name || "N/A"}
                    size="2"
                    radius="full"
                    ml="-3"
                    className="accent-shadow-low"
                  />
                </Tooltip>
              );
            })}
          </Flex>

          <Flex direction="column" gap="2" width="100%" overflow="auto">
            <BranchTitle title={title} htmlUrl={htmlUrl} />

            <Flex align="center" justify="between" width="100%" gap="2">
              <Flex
                gap="2"
                align="center"
                flexGrow="1"
                width="100%"
                maxWidth="100%"
              >
                <MergeInfo
                  baseBranchName={baseBranchName}
                  branchName={branchName}
                />

                <Repository repositoryName={repositoryName} />
              </Flex>
            </Flex>

            <Flex align="center" justify="between" gap="1">
              <Flex align="center" gap="2">
                <CIActions
                  actionsByName={actionsByName}
                  pullRequestLink={pullRequestLink}
                />
                <Labels items={labels} />
              </Flex>

              <LastUpdate updatedAt={updatedAt} />
            </Flex>
          </Flex>
        </Flex>

        <LastActivity reviewsGroupedbyUser={reviewsGroupedbyUser} />
      </Flex>
    </Card>
  );
};
