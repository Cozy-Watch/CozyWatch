import { ChevronDownIcon } from "@primer/octicons-react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { renderSafeMarkdown } from "../../../../utils/renderSafeMarkdown";
import { getHumanState } from "../../Review.utils";
import { State } from "../../Reviews.meta";
import { ReviewAvatar } from "../ReviewAvatar/ReviewAvatar";
import { LastUpdate } from "../../../PullRequestsCard/components/LastUpdate/LastUpdate";

interface Props {
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
}

export const LastActivity = ({ reviewsGroupedbyUser }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const feedback = useMemo(
    () =>
      Object.values(reviewsGroupedbyUser || {}).filter(
        (reviews) => reviews.state !== "NO_FEEDBACK"
      ),
    [reviewsGroupedbyUser]
  );

  const parsedBodies = useMemo(
    () => feedback.map((review) => renderSafeMarkdown(review.body)),
    [feedback],
  );

  if (feedback.length === 0) {
    return null;
  }

  return (
    <Flex
      style={{ borderRadius: 10, background: "var(--gray-a2)" }}
      direction="column"
      p="3"
      gap="2"
    >
      <motion.header
        initial={false}
        onClick={() => {
          setIsExpanded((state) => !state);
        }}
      >
        <Flex align="center" gap="2">
          <Text
            size="1"
            className="inverse-accent-text-shadow"
            style={{
              color: "var(--gray-a11)",
              cursor: "default",
            }}
          >
            Latest Activity
          </Text>
          <motion.div
            animate={{ rotate: isExpanded ? -180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDownIcon size={16} />
          </motion.div>
        </Flex>
      </motion.header>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.section
            ref={sectionRef}
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: "auto" },
              collapsed: { opacity: 0, height: 0 },
            }}
            transition={{ duration: 0.8, ease: [0.04, 0.62, 0.23, 0.98] }}
            style={{ overflow: "hidden" }}
          >
            <Flex py="2" align="center" gap="3" direction="column">
              {feedback.map((reviews, index) => {
                const humanState = getHumanState(reviews.state as State);

                return (
                  <Flex key={index} width="100%" gap="2">
                    <Box>
                      <ReviewAvatar
                        state={reviews.state}
                        userAvatar={reviews.userAvatar}
                        userName={reviews.userName}
                      />
                    </Box>

                    <Flex direction="column" width="100%">
                      <Flex align="center" gap="2">
                        <Text
                          size="1"
                          className="inverse-accent-text-shadow"
                          style={{
                            color: "var(--gray-a12)",
                            cursor: "default",
                          }}
                        >
                          {reviews.userName}
                        </Text>
                        <Flex
                          align="center"
                          justify="between"
                          gap="2"
                          width="100%"
                        >
                          <Text
                            size="1"
                            className="inverse-accent-text-shadow"
                            style={{
                              color: "var(--gray-a10)",
                              cursor: "default",
                            }}
                          >
                            {humanState}
                          </Text>

                          <LastUpdate updatedAt={reviews.date} />
                        </Flex>
                      </Flex>

                      {reviews.body && (
                        <Text
                          ml="2"
                          size="1"
                          className="inverse-accent-text-shadow"
                          style={{
                            color: "var(--gray-a12)",
                            cursor: "default",
                          }}
                          dangerouslySetInnerHTML={{
                            __html: parsedBodies[index],
                          }}
                        />
                      )}
                    </Flex>
                  </Flex>
                );
              })}
            </Flex>
          </motion.section>
        )}
      </AnimatePresence>
    </Flex>
  );
};
