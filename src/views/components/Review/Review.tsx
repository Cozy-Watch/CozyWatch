import {
  CheckCircleFillIcon,
  ChevronDownIcon,
  CodeReviewIcon,
  EyeClosedIcon,
  XCircleFillIcon,
} from "@primer/octicons-react";
import { Flex, Popover, Text } from "@radix-ui/themes";
import { ReviewAvatar } from "./components/ReviewAvatar/ReviewAvatar";

interface Props {
  isCompact?: boolean;
  waitingReviews: number;
  reviewsGroupedbyUser?: Record<
    string,
    {
      state: string;
      userAvatar: string;
      userName: string;
    }
  >;
}

export const Review = ({
  reviewsGroupedbyUser,
  waitingReviews,
  isCompact,
}: Props) => {
  if (!reviewsGroupedbyUser) {
    return null;
  }

  if (
    Object.values(reviewsGroupedbyUser).length === 0 &&
    waitingReviews === 0
  ) {
    return null;
  }

  const reviews = Object.values(reviewsGroupedbyUser).reduce<{
    approved: string[];
    changesRequested: string[];
    waitingFor: string[];
  }>(
    (acc, review) => {
      const { state, userName } = review;

      return {
        ...acc,
        approved: [
          ...acc.approved,
          ...(state === "APPROVED" ? [userName] : []),
        ],
        changesRequested: [
          ...acc.changesRequested,
          ...(state === "CHANGES_REQUESTED" ? [userName] : []),
        ],
        waitingFor: [
          ...acc.waitingFor,
          ...(state !== "APPROVED" && state !== "CHANGES_REQUESTED"
            ? [userName]
            : []),
        ],
      };
    },
    { approved: [], changesRequested: [], waitingFor: [] },
  );

  if (isCompact) {
    if (
      reviews.approved.length === 0 &&
      reviews.changesRequested.length === 0 &&
      reviews.waitingFor.length === 0
    ) {
      return null;
    }

    return (
      <Flex align="center" gap="1">
        <Popover.Root>
          <Popover.Trigger>
            <Text size="1">
              <Flex align="center" gap="1">
                <Flex width="12" height="12" className="mb-text-color-light">
                  <CodeReviewIcon size={12} />
                </Flex>

                <Text className="mb-text-color-heading">Reviews:</Text>

                {reviews.waitingFor.map((userName, index) => (
                  <Flex key={index} align="center" justify="between" gap="1">
                    <Text className="mb-text-color-light" size="1">
                      <Flex width="12" height="12">
                        <EyeClosedIcon size={12} />
                      </Flex>
                    </Text>
                  </Flex>
                ))}

                {reviews.approved.map((userName, index) => (
                  <Flex key={index} align="center" justify="between" gap="1">
                    <Text className="mb-text-color-light" size="1">
                      <Flex width="12" height="12">
                        <CheckCircleFillIcon size={12} />
                      </Flex>
                    </Text>
                  </Flex>
                ))}

                {reviews.changesRequested.map((userName, index) => (
                  <Flex
                    style={{ marginLeft: index === 0 ? 0 : `-${index * 8}px` }}
                  >
                    <Text className="mb-text-color-light" size="1">
                      <Flex width="12" height="12">
                        <XCircleFillIcon size={12} />
                      </Flex>
                    </Text>
                  </Flex>
                ))}

                <Flex width="12" height="12" className="mb-text-color-light">
                  <ChevronDownIcon size={12} />
                </Flex>
              </Flex>
            </Text>
          </Popover.Trigger>

          <Popover.Content
            style={{
              background:
                "color-mix(in srgb, var(--accent-1) 95%, transparent)",
              border: "1px solid var(--gray-1)",
            }}
          >
            <Flex justify="start" width="100%" mb="3">
              <Text
                size="1"
                weight="medium"
                className="bright-background-text-shadow"
                style={{ color: "var(--gray-a11)" }}
              >
                Reviews
              </Text>
            </Flex>

            <Flex gap="3" direction="column">
              {reviews.waitingFor.map((userName, index) => (
                <Flex key={index} align="center" justify="between" gap="1">
                  <Text color="gray" size="1">
                    <Flex align="center" gap="2">
                      <Flex width="12" height="12">
                        <EyeClosedIcon size={12} />
                      </Flex>

                      {userName}
                    </Flex>
                  </Text>
                </Flex>
              ))}

              {reviews.approved.map((userName, index) => (
                <Flex key={index} align="center" justify="between" gap="1">
                  <Text color="green" size="1">
                    <Flex align="center" gap="2">
                      <Flex width="12" height="12">
                        <CheckCircleFillIcon size={12} />
                      </Flex>

                      {userName}
                    </Flex>
                  </Text>
                </Flex>
              ))}

              {reviews.changesRequested.map((userName, index) => (
                <Flex
                  style={{ marginLeft: index === 0 ? 0 : `-${index * 8}px` }}
                >
                  <Text color="ruby" size="1">
                    <Flex align="center" gap="2">
                      <Flex width="12" height="12">
                        <XCircleFillIcon size={12} />
                      </Flex>
                      {userName}
                    </Flex>
                  </Text>
                </Flex>
              ))}
            </Flex>
          </Popover.Content>
        </Popover.Root>
      </Flex>
    );
  }

  return (
    <Flex align="center" gap="3">
      {Object.values(reviewsGroupedbyUser).map(
        ({ state, userAvatar, userName }, index) => {
          return (
            <ReviewAvatar
              key={index}
              state={state}
              userAvatar={userAvatar}
              userName={userName}
              isFirst={index === 0}
            />
          );
        },
      )}

      {waitingReviews >= 1 && (
        <Text size="1" className="inverse-accent-text-shadow mb-text-color">
          Awaiting {waitingReviews} approval{waitingReviews === 1 ? "" : "s"}
        </Text>
      )}
    </Flex>
  );
};
