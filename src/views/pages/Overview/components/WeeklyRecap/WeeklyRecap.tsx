import { TrophyIcon } from "@primer/octicons-react";
import { Card, Flex, Skeleton, Spinner, Text } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useUserQuery } from "../../../../api/useUserQuery";
import { getLastCompletedWeekStart } from "../../../../../weeklyRecap/metrics";
import type { PersonalWeeklyRecap } from "../../../../../weeklyRecap/types";

const formatWeek = (weekStart: string, weekEnd: string) => {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(`${weekEnd}T12:00:00`);
  const month = new Intl.DateTimeFormat(undefined, { month: "short" });

  return start.getFullYear() === end.getFullYear()
    ? `${month.format(start)} ${start.getDate()} - ${month.format(end)} ${end.getDate()}, ${end.getFullYear()}`
    : `${month.format(start)} ${start.getDate()}, ${start.getFullYear()} - ${month.format(end)} ${end.getDate()}, ${end.getFullYear()}`;
};

const plural = (count: number, word: string, pluralWord = `${word}s`) =>
  `${count} ${count === 1 ? word : pluralWord}`;

const headline = ({ mergedCount, reviewedCount }: PersonalWeeklyRecap) => {
  if (mergedCount === 0 && reviewedCount === 0) {
    return "A quiet week";
  }
  if (mergedCount === 0) {
    return `${plural(reviewedCount, "review")} given`;
  }
  return `You shipped ${plural(mergedCount, "PR")}`;
};

const momentum = ({
  mergedCount,
  previousMergedCount,
}: PersonalWeeklyRecap) => {
  if (mergedCount === previousMergedCount) {
    return "Steady vs last week";
  }
  if (previousMergedCount === 0) {
    return mergedCount === 0
      ? "Steady vs last week"
      : `+${mergedCount} vs last week`;
  }
  const delta = mergedCount - previousMergedCount;
  return delta > 0 ? `+${delta} vs last week` : `${delta} vs last week`;
};

export const WeeklyRecap = () => {
  const { data: user } = useUserQuery();
  const weekStart = getLastCompletedWeekStart();
  const { data: recap, error, isFetching } = useQuery({
    queryKey: ["weeklyRecap", user?.id, weekStart],
    queryFn: () => window.electronAPI.weeklyRecap.personal(weekStart),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const trend = recap ? momentum(recap) : null;

  return (
    <Flex direction="column">
      <Card
        className="accent-shadow-low"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-a1), var(--accent-a4), var(--accent-a1))",
          width: "100%",
        }}
      >
        <Flex direction="column" gap="3">
          <Flex
            justify="between"
            align="center"
            style={{ color: "var(--accent-10)" }}
          >
            <Flex direction="column">
              <Text size="1" style={{ color: "var(--white-a11)" }}>
                Your week on CozyWatch
              </Text>
              {recap ? (
                <Text
                  size="5"
                  weight="bold"
                  style={{ color: "var(--accent-12)" }}
                >
                  {headline(recap)}
                </Text>
              ) : null}
            </Flex>
            <Flex align="center" gap="2">
              {isFetching && recap ? (
                <Spinner size="1" aria-label="Refreshing weekly recap" />
              ) : null}
              <TrophyIcon size={20} />
            </Flex>
          </Flex>
          {error && !recap ? (
            <Text size="2" color="gray">
              Your weekly recap will appear here with PRs you merged and reviews you gave.
            </Text>
          ) : !recap ? (
            <Flex gap="3">
              <Skeleton height="62px" width="180px" />
              <Skeleton height="62px" width="120px" />
            </Flex>
          ) : (
            <Flex direction="column" gap="1">
              <Text size="2" style={{ color: "var(--gray-11)" }}>
                {formatWeek(recap.weekStart, recap.weekEnd)}
              </Text>
              <Text size="2" style={{ color: "var(--gray-11)" }}>
                {plural(recap.mergedCount, "PR")} merged across{" "}
                {plural(recap.repositoryCount, "repository", "repositories")},{" "}
                {plural(recap.reviewedCount, "review")} given
              </Text>
              {trend ? (
                <Text
                  size="2"
                  weight="medium"
                  style={{ color: "var(--accent-11)" }}
                >
                  {trend}
                </Text>
              ) : null}
            </Flex>
          )}
        </Flex>
      </Card>
    </Flex>
  );
};
