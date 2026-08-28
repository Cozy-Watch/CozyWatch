import { ClipboardCopyIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { marked } from "marked";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Em,
  Flex,
  Reset,
  Strong,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import { ErrorMessage } from "../../components/ErrorMessage/ErrorMessage";
import { usePullRequests } from "./usePullRequests";

export const PullRequests = () => {
  const { data, error, isPending } = usePullRequests();

  const navigation = useNavigate();

  if (isPending) {
    return (
      <Flex direction="column" flexGrow="1" align="center" justify="center">
        <img id="sofa" src="./images/sofaOnly.png" width="150" />
        <Text size="2">
          <Em>Loading Pull Requests</Em>
        </Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex justify="center" align="center" flexGrow="1">
        <ErrorMessage message={error.message} />
      </Flex>
    );
  }

  if (!data) {
    return null;
  }

  const {
    countRepositories,
    countActiveRepositories,
    activeRepositoriesWithPullReques,
  } = data;

  if (activeRepositoriesWithPullReques.length === 0) {
    if (countActiveRepositories === 0 && countRepositories > 0) {
      return (
        <Flex direction="column" flexGrow="1" align="center" justify="center">
          <img
            src="./images/sofaOnly.png"
            width="150"
            style={{ opacity: 0.1 }}
          />
          <Flex direction="column" gap="4" align="center">
            <Text>
              <Em>
                You have no active repositories, please enable some in settings
              </Em>
            </Text>

            <Button
              variant="outline"
              style={{ maxWidth: "200px" }}
              onClick={() => {
                navigation({
                  to: "/settings",
                  search: { tab: "repositories" },
                });
              }}
            >
              Go to Repository Settings
            </Button>
          </Flex>
        </Flex>
      );
    }

    return (
      <Flex direction="column" flexGrow="1" align="center" justify="center">
        <img src="./images/sofaOnly.png" width="150" style={{ opacity: 0.1 }} />
        <Text>
          <Em>You don't have any pull requests</Em>
        </Text>
      </Flex>
    );
  }

  return (
    <>
      <Box my="4">
        <Text weight="bold">Pull Request Status</Text>
      </Box>

      <Reset>
        <ul>
          {activeRepositoriesWithPullReques.map(
            ({ repositoryName, repositoryData, pullRequests }) => {
              return (
                <li key={repositoryName}>
                  <Card mb="3">
                    <Flex direction="column" flexGrow="1">
                      <Text size="1" weight="light" mb="3">
                        Repository:
                        <Text weight="bold" ml="2" size="1">
                          {repositoryData?.name || repositoryName}
                        </Text>
                      </Text>

                      <Text size="1" weight="light">
                        Pull Request
                        {Object.values(pullRequests).length === 1 ? "" : "s"}:
                      </Text>

                      <Flex direction="column">
                        <Reset>
                          <ul>
                            {pullRequests.map((pullRequest) => {
                              return (
                                <li key={pullRequest.id}>
                                  <Card my="2">
                                    <Flex justify="between">
                                      <Flex
                                        direction="column"
                                        gap="2"
                                        flexGrow="1"
                                      >
                                        <Text size="1">
                                          Title:{" "}
                                          <Strong>{pullRequest.title}</Strong>
                                        </Text>

                                        <Text size="1">
                                          Branch:{" "}
                                          <Badge size="1">
                                            {pullRequest.head.ref}
                                          </Badge>
                                        </Text>

                                        {pullRequest.actions &&
                                          pullRequest.actions.length > 0 && (
                                            <Text size="1">
                                              <Flex gap="1">
                                                CI Checks:{" "}
                                                {pullRequest.actions.map(
                                                  (ci) => (
                                                    <Badge
                                                      key={ci.id}
                                                      variant="outline"
                                                      style={{
                                                        textTransform:
                                                          "capitalize",
                                                      }}
                                                      color={
                                                        ci.conclusion ===
                                                        "success"
                                                          ? "mint"
                                                          : ci.conclusion ===
                                                              "failure"
                                                            ? "tomato"
                                                            : "sky"
                                                      }
                                                    >
                                                      {ci.status} -{" "}
                                                      {ci.conclusion}
                                                    </Badge>
                                                  )
                                                )}
                                              </Flex>
                                            </Text>
                                          )}

                                        {pullRequest.comments.length >= 1 && (
                                          <>
                                            <Flex align="center" gap="2">
                                              <Text size="1">Status: </Text>

                                              {pullRequest.comments.map(
                                                (review, index) => {
                                                  return (
                                                    <Badge
                                                      size="1"
                                                      key={index}
                                                      color={
                                                        review?.state ===
                                                        "APPROVED"
                                                          ? "green"
                                                          : review?.state ===
                                                              "CHANGES_REQUESTED"
                                                            ? "red"
                                                            : "yellow"
                                                      }
                                                    >
                                                      {review?.state ===
                                                      "APPROVED"
                                                        ? "Approved"
                                                        : review?.state ===
                                                            "CHANGES_REQUESTED"
                                                          ? "Changes Requested"
                                                          : review?.state ===
                                                              "COMMENTED"
                                                            ? "Commented"
                                                            : review?.state}
                                                    </Badge>
                                                  );
                                                }
                                              )}
                                            </Flex>

                                            <Text size="1">Conversation:</Text>

                                            <Flex direction="column" gap="2">
                                              {pullRequest.comments.map(
                                                (review) => {
                                                  const mardown = marked.parse(
                                                    review?.body || "",
                                                    { async: false }
                                                  );

                                                  return (
                                                    <Flex
                                                      align="center"
                                                      key={review?.user?.login}
                                                    >
                                                      <Avatar
                                                        src={
                                                          review?.user
                                                            ?.avatar_url
                                                        }
                                                        size="1"
                                                        radius="full"
                                                        mr="2"
                                                        fallback={
                                                          review?.user?.login ??
                                                          "NA"
                                                        }
                                                      />

                                                      <Box minWidth="100%">
                                                        <Card>
                                                          <Flex direction="column">
                                                            <Text
                                                              size="1"
                                                              weight="bold"
                                                            >
                                                              {review?.user
                                                                ?.login ?? "NA"}
                                                            </Text>

                                                            {review?.body && (
                                                              <Text size="1">
                                                                <Em
                                                                  dangerouslySetInnerHTML={{
                                                                    __html:
                                                                      mardown,
                                                                  }}
                                                                />
                                                              </Text>
                                                            )}
                                                          </Flex>
                                                        </Card>
                                                      </Box>
                                                    </Flex>
                                                  );
                                                }
                                              )}
                                            </Flex>
                                          </>
                                        )}
                                      </Flex>

                                      <Flex gap="2">
                                        <Tooltip content="Copy Branch Name">
                                          <Button
                                            size="1"
                                            onClick={() => {
                                              window.electronAPI.copyToClipboard(
                                                pullRequest?.head?.ref
                                              );
                                            }}
                                          >
                                            <ClipboardCopyIcon />
                                          </Button>
                                        </Tooltip>

                                        <Tooltip content="View on Github">
                                          <Button
                                            size="1"
                                            onClick={() => {
                                              window.electronAPI.openExternalLink(
                                                pullRequest.html_url
                                              );
                                            }}
                                          >
                                            <ExternalLinkIcon />
                                          </Button>
                                        </Tooltip>
                                      </Flex>
                                    </Flex>
                                  </Card>
                                </li>
                              );
                            })}
                          </ul>
                        </Reset>
                      </Flex>
                    </Flex>
                  </Card>
                </li>
              );
            }
          )}
        </ul>
      </Reset>
    </>
  );
};
