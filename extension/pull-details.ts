import { github } from './github';
import { UserFacingError } from './network';
import type { PullSummary, PullDetails } from './model';
interface Pull { head: { ref: string; sha: string }; base: { ref: string }; additions: number; deletions: number; changed_files: number; requested_reviewers: { login: string }[]; comments?: number; review_comments?: number; mergeable?: boolean | null }
interface Review { user: { login: string } | null; state: string; submitted_at: string }
interface Checks { total_count: number; check_runs: { status: string; conclusion: string | null }[] }
interface Status { total_count: number; state: string }
export function ciState(checks?: Checks, status?: Status): PullDetails['ci'] {
  if (status && status.total_count > 0 && ['failure', 'error'].includes(status.state)) return 'failed';
  if (checks?.check_runs.some(run => ['failure', 'cancelled', 'timed_out', 'action_required', 'stale', 'startup_failure'].includes(run.conclusion ?? ''))) return 'failed';
  if (!checks || !status || checks.total_count > checks.check_runs.length) return 'unavailable';
  if (checks.check_runs.some(run => run.status !== 'completed') || (status.total_count > 0 && status.state === 'pending')) return 'pending';
  if (!checks.total_count && !status.total_count) return 'none';
  if (checks.check_runs.every(run => ['success', 'neutral', 'skipped'].includes(run.conclusion ?? '')) && (!status.total_count || status.state === 'success')) return 'passing';
  return 'unavailable';
}
export function reviewCounts(reviews: Review[]) {
  const latest = new Map<string, string>();
  for (const review of [...reviews].sort((a, b) => Date.parse(a.submitted_at) - Date.parse(b.submitted_at))) {
    if (review.user && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) latest.set(review.user.login, review.state);
  }
  return { approvals: [...latest.values()].filter(state => state === 'APPROVED').length, changesRequested: [...latest.values()].filter(state => state === 'CHANGES_REQUESTED').length };
}
function commentCount(value: number | undefined): number | undefined {
  return value !== undefined && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}
export async function fetchPullDetails(token: string, item: PullSummary, signal: AbortSignal): Promise<PullDetails> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(item.repository) || !Number.isSafeInteger(item.number) || item.number <= 0) throw new UserFacingError('Invalid pull request. Refresh activity and try again.');
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(20000)]);
  const repo = `/repos/${item.repository}`;
  const path = `${repo}/pulls/${item.number}`;
  const pull = await github<Pull>(token, path, deadline);
  if (!/^[a-f\d]{40,64}$/i.test(pull.head.sha)) throw new UserFacingError('Unexpected GitHub commit response.');
  const [reviews, checks, status] = await Promise.allSettled([
    github<Review[]>(token, `${path}/reviews?per_page=30`, deadline),
    github<Checks>(token, `${repo}/commits/${pull.head.sha}/check-runs?per_page=30`, deadline),
    github<Status>(token, `${repo}/commits/${pull.head.sha}/status?per_page=1`, deadline),
  ]);
  deadline.throwIfAborted();
  return { checkedAt: Date.now(), head: pull.head.ref.slice(0, 150), base: pull.base.ref.slice(0, 150), additions: pull.additions, deletions: pull.deletions, files: pull.changed_files,
    discussionComments: commentCount(pull.comments), reviewComments: commentCount(pull.review_comments),
    mergeConflict: pull.mergeable === false ? true : pull.mergeable === true ? false : null,
    reviewers: pull.requested_reviewers.slice(0, 8).map(user => user.login.slice(0, 100)),
    ...(reviews.status === 'fulfilled' ? reviewCounts(reviews.value) : {}),
    reviewsPartial: reviews.status !== 'fulfilled' || reviews.value.length === 30,
    ci: ciState(checks.status === 'fulfilled' ? checks.value : undefined, status.status === 'fulfilled' ? status.value : undefined) };
}
