import { Box, Skeleton } from "@radix-ui/themes";

export const PullRequestLoading = () => {
  return (
    <Skeleton className="shadow-medium">
      <Box height="144px" width="100%" />
    </Skeleton>
  );
};
