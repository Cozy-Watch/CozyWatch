export type PersonalWeeklyRecap = Readonly<{
  weekStart: string;
  weekEnd: string;
  mergedCount: number;
  reviewedCount: number;
  repositoryCount: number;
  previousMergedCount: number;
  fetchedAt: string;
}>;
