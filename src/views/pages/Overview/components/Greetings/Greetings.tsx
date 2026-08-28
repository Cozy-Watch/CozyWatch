import { Heading, Skeleton } from "@radix-ui/themes";
import dayjs from "dayjs";
import { usePullRequest } from "../../../../hooks/usePullRequests";

export const Greetings = () => {
  const { error, data, isFetching } = usePullRequest();

  if (isFetching) {
    return (
      <Heading weight="bold" style={{ color: "var(--accent-12)" }} mb="7">
        <Skeleton>Good Morning, my name</Skeleton>
      </Heading>
    );
  }
  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!data) {
    return null;
  }

  const hour = dayjs().hour();
  const { headerData } = data;

  return (
    <Heading weight="bold" style={{ color: "var(--accent-12)" }} mb="7">
      {hour >= 6 && hour < 12
        ? "Good Morning"
        : hour >= 12 && hour < 18
          ? "Good Afternoon"
          : hour >= 18 && hour < 22
            ? "Good Evening"
            : "Good Night"}
      {", "}
      {headerData.name}!
    </Heading>
  );
};
