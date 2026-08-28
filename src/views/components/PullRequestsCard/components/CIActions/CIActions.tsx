import {
  CheckCircleFillIcon,
  ChevronDownIcon,
  ClockFillIcon,
  LinkExternalIcon,
  XCircleFillIcon,
  ZapIcon,
} from "@primer/octicons-react";
import { Box, Button, Flex, Popover, Text } from "@radix-ui/themes";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { PullsActions } from "src/mainProcess/api/PullRequests/utils/getDefaultData";
import { COLOR_MAP } from "./CIActions.meta";

dayjs.extend(duration);

interface Props {
  actionsByName: Record<string, PullsActions[0][]>;
  pullRequestLink: string;
  isCompact?: boolean;
}

export const CIActions = ({
  actionsByName,
  pullRequestLink,
  isCompact = false,
}: Props) => {
  const actionKeyList = Object.keys(actionsByName);

  if (actionKeyList.length === 0) {
    return null;
  }

  const amountPassed = actionKeyList.filter((actionName) => {
    const conclusion = actionsByName[actionName][0].conclusion;
    return conclusion === "success";
  }).length;

  if (isCompact) {
    return (
      <Flex align="center" gap="1">
        <Popover.Root>
          <Popover.Trigger>
            <Text size="1" className="mb-text-color-heading">
              <Flex align="center" gap="1">
                <Flex width="12" height="12" className="mb-text-color-light">
                  <ZapIcon size={12} />
                </Flex>

                <Text>CI Runs:</Text>

                <Text>{actionKeyList.length}</Text>

                <Flex width="12" height="12" className="mb-text-color-light">
                  <ChevronDownIcon size={12} />
                </Flex>
              </Flex>
            </Text>
          </Popover.Trigger>

          <Popover.Content
            width="300px"
            className="mb-card-bg"
            style={{
              border: "1px solid var(--gray-12)",
            }}
          >
            <Flex justify="start" width="100%" mb="3">
              <Text
                size="1"
                weight="medium"
                className={
                  isCompact
                    ? "mb-text-color-heading"
                    : "mb-text-color-heading bright-background-text-shadow"
                }
              >
                {amountPassed}/{actionKeyList.length} Checks Passed
              </Text>
            </Flex>

            <Flex gap="3" direction="column">
              {actionKeyList.map((actionName, index) => {
                const action = actionsByName[actionName][0];

                const conclusion = actionsByName[actionName][0].conclusion;
                const status = actionsByName[actionName][0].status;

                return (
                  <Flex key={index} align="center" justify="between" gap="1">
                    <Box>
                      <Flex
                        width="20px"
                        height="20px"
                        align="center"
                        justify="center"
                        style={{
                          color:
                            status === "completed"
                              ? conclusion === "success"
                                ? COLOR_MAP.success
                                : COLOR_MAP.failure
                              : COLOR_MAP.pending,
                          border: "2px solid var(--gray-1)",
                          boxShadow: "inset 0px 0px 0px 2px var(--gray-1)",
                          background: "var(--gray-1)",
                          borderRadius: "50%",
                          overflow: "hidden",
                        }}
                      >
                        {status === "completed" ? (
                          conclusion === "success" ? (
                            <CheckCircleFillIcon size={20} />
                          ) : (
                            <XCircleFillIcon size={20} />
                          )
                        ) : (
                          <ClockFillIcon size={20} />
                        )}
                      </Flex>
                    </Box>

                    <Flex
                      direction="column"
                      gap="1"
                      align="start"
                      justify="center"
                      width="100%"
                    >
                      <Text
                        size="1"
                        weight="bold"
                        className="bright-background-text-shadow"
                        style={{
                          color: "var(--gray-a11)",
                        }}
                      >
                        {action.name}
                      </Text>

                      {status === "completed" && (
                        <Text
                          className="bright-background-text-shadow"
                          style={{
                            fontSize: "10px",
                            color: "var(--gray-a11)",
                          }}
                        >
                          Completed in{" "}
                          {dayjs
                            .duration(
                              dayjs(action.updated_at).diff(
                                dayjs(action.run_started_at),
                              ),
                            )
                            .format("m[m] s[s]")}
                        </Text>
                      )}
                    </Flex>
                  </Flex>
                );
              })}

              <Button
                variant="ghost"
                asChild
                onClick={() => {
                  window.electronAPI.openExternalLink(pullRequestLink);
                }}
              >
                <Flex
                  justify="start"
                  width="100%"
                  align="center"
                  gap="2"
                  style={{ color: "var(--accent-a9)" }}
                >
                  <Text
                    size="1"
                    className="bright-background-text-shadow"
                    style={{
                      color: "var(--accent-a9)",
                    }}
                  >
                    View all checks on Github
                  </Text>

                  <LinkExternalIcon size={12} />
                </Flex>
              </Button>
            </Flex>
          </Popover.Content>
        </Popover.Root>
      </Flex>
    );
  }

  return (
    <Flex
      align="center"
      gap="1"
      p="1"
      style={{
        color: "var(--gray-a11)",
        background: "var(--gray-a2)",
        borderRadius: "4px",
      }}
    >
      {actionKeyList.map((actionName, index) => {
        const conclusion = actionsByName[actionName][0].conclusion;
        const status = actionsByName[actionName][0].status;

        return (
          <Box
            key={index}
            width="8px"
            height="8px"
            style={{
              background:
                status === "completed"
                  ? conclusion === "success"
                    ? COLOR_MAP.success
                    : COLOR_MAP.failure
                  : COLOR_MAP.pending,
              borderRadius: "50%",
            }}
          />
        );
      })}

      <Popover.Root>
        <Popover.Trigger>
          <Flex align="center" gap="1" style={{ color: "var(--gray-a10)" }}>
            <Text
              size="1"
              truncate
              className="bright-background-text-shadow"
              style={{
                color: "var(--gray-a11)",
                cursor: "default",
              }}
            >
              CI Actions:
            </Text>
            <ChevronDownIcon size={12} />
          </Flex>
        </Popover.Trigger>

        <Popover.Content
          width="300px"
          className="mb-card-bg"
          style={{
            border: "1px solid var(--gray-12)",
          }}
        >
          <Flex justify="start" width="100%" mb="3">
            <Text
              size="1"
              weight="medium"
              className="bright-background-text-shadow"
              style={{
                color: "var(--gray-a11)",
              }}
            >
              {amountPassed}/{actionKeyList.length} Checks Passed
            </Text>
          </Flex>

          <Flex gap="3" direction="column">
            {actionKeyList.map((actionName, index) => {
              const action = actionsByName[actionName][0];

              const conclusion = actionsByName[actionName][0].conclusion;
              const status = actionsByName[actionName][0].status;

              return (
                <Flex key={index} align="center" justify="between" gap="1">
                  <Box>
                    <Flex
                      width="20px"
                      height="20px"
                      align="center"
                      justify="center"
                      style={{
                        color:
                          status === "completed"
                            ? conclusion === "success"
                              ? COLOR_MAP.success
                              : COLOR_MAP.failure
                            : COLOR_MAP.pending,
                        border: "2px solid var(--gray-1)",
                        boxShadow: "inset 0px 0px 0px 2px var(--gray-1)",
                        background: "var(--gray-1)",
                        borderRadius: "50%",
                        overflow: "hidden",
                      }}
                    >
                      {status === "completed" ? (
                        conclusion === "success" ? (
                          <CheckCircleFillIcon size={20} />
                        ) : (
                          <XCircleFillIcon size={20} />
                        )
                      ) : (
                        <ClockFillIcon size={20} />
                      )}
                    </Flex>
                  </Box>

                  <Flex
                    direction="column"
                    gap="1"
                    align="start"
                    justify="center"
                    width="100%"
                  >
                    <Text
                      size="1"
                      weight="bold"
                      className="bright-background-text-shadow"
                      style={{
                        color: "var(--gray-a11)",
                      }}
                    >
                      {action.name}
                    </Text>

                    {status === "completed" && (
                      <Text
                        className="bright-background-text-shadow"
                        style={{
                          fontSize: "10px",
                          color: "var(--gray-a11)",
                        }}
                      >
                        Completed in{" "}
                        {dayjs
                          .duration(
                            dayjs(action.updated_at).diff(
                              dayjs(action.run_started_at),
                            ),
                          )
                          .format("m[m] s[s]")}
                      </Text>
                    )}
                  </Flex>
                </Flex>
              );
            })}

            <Button
              variant="ghost"
              asChild
              onClick={() => {
                window.electronAPI.openExternalLink(pullRequestLink);
              }}
            >
              <Flex
                justify="start"
                width="100%"
                align="center"
                gap="2"
                style={{ color: "var(--accent-a9)" }}
              >
                <Text
                  size="1"
                  className="bright-background-text-shadow"
                  style={{
                    color: "var(--accent-a9)",
                  }}
                >
                  View all checks on Github
                </Text>

                <LinkExternalIcon size={12} />
              </Flex>
            </Button>
          </Flex>
        </Popover.Content>
      </Popover.Root>
    </Flex>
  );
};
