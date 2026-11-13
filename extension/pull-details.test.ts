import { ciState, reviewCounts, fetchPullDetails } from './pull-details';
import { github } from './github';
jest.mock('./github', () => ({ github: jest.fn() }));
const passed = { total_count: 1, check_runs: [{ status: 'completed', conclusion: 'success' }] };
const status = { total_count: 1, state: 'success' };
it('does not claim CI is passing when permission, coverage, or completion is unknown', () => {
  expect(ciState(passed, status)).toBe('passing');
  expect(ciState(undefined, status)).toBe('unavailable');
  expect(ciState(passed, undefined)).toBe('unavailable');
  expect(ciState({ ...passed, total_count: 31 }, status)).toBe('unavailable');
  expect(ciState({ total_count: 1, check_runs: [{ status: 'in_progress', conclusion: null }] }, status)).toBe('pending');
  expect(ciState(passed, { total_count: 1, state: 'failure' })).toBe('failed');
  expect(ciState({ total_count: 0, check_runs: [] }, { total_count: 0, state: 'pending' })).toBe('none');
});
it('counts the latest decisive review, preserving approvals after comments and removing dismissed ones', () => {
  const review = (login: string, state: string, hour: number) => ({ user: { login }, state, submitted_at: `2026-11-09T${hour}:00:00Z` });
  expect(reviewCounts([review('alice', 'APPROVED', 10), review('alice', 'COMMENTED', 11), review('bob', 'APPROVED', 10), review('bob', 'DISMISSED', 12), review('cat', 'CHANGES_REQUESTED', 11)])).toEqual({ approvals: 1, changesRequested: 1 });
});
it('fetches compact details on demand and omits raw bodies and credentials', async () => {
  jest.mocked(github).mockImplementation(async (_token, path) => {
    if (path.endsWith('/pulls/7')) return { head: { ref: 'feature/fix', sha: 'a'.repeat(40) }, base: { ref: 'main' }, additions: 12, deletions: 4, changed_files: 2, requested_reviewers: [{ login: 'alice' }], body: 'private full body' };
    if (path.includes('/reviews?')) return [];
    if (path.includes('/check-runs?')) return passed;
    return status;
  });
  const details = await fetchPullDetails('synthetic-token', { id: 1, number: 7, title: 'PR', repository: 'org/repo', url: 'https://github.com/org/repo/pull/7', updatedAt: '', draft: false }, new AbortController().signal);
  expect(details).toEqual(expect.objectContaining({ head: 'feature/fix', base: 'main', files: 2, additions: 12, ci: 'passing', approvals: 0 }));
  expect(JSON.stringify(details)).not.toMatch(/private full body|synthetic-token/);
  expect(github).toHaveBeenCalledTimes(4);
});
it.each([false, true, null, undefined])('reports mergeability conservatively and includes both comment counts (mergeable=%s)', async mergeable => {
  jest.mocked(github).mockClear();
  jest.mocked(github).mockImplementation(async (_token, path) => {
    if (path.endsWith('/pulls/7')) return { head: { ref: 'fix', sha: 'b'.repeat(40) }, base: { ref: 'main' }, additions: 1, deletions: 0, changed_files: 1, requested_reviewers: [], comments: 1, review_comments: 9, mergeable };
    if (path.includes('/reviews?')) return [];
    if (path.includes('/check-runs?')) return passed;
    return status;
  });
  const details = await fetchPullDetails('synthetic-token', { id: 1, number: 7, title: 'PR', repository: 'org/repo', url: 'https://github.com/org/repo/pull/7', updatedAt: '', draft: false }, new AbortController().signal);
  expect(details.mergeConflict).toBe(mergeable === false ? true : mergeable === true ? false : null);
  expect(details.discussionComments).toBe(1);
  expect(details.reviewComments).toBe(9);
  expect(details.ci).toBe('passing'); // Passing checks never imply mergeability.
  expect(github).toHaveBeenCalledTimes(4); // Reuse metadata, no extra fetches.
});
it('keeps missing or invalid comment counts unknown', async () => {
  jest.mocked(github).mockImplementation(async (_token, path) => {
    if (path.endsWith('/pulls/7')) return { head: { ref: 'fix', sha: 'b'.repeat(40) }, base: { ref: 'main' }, additions: 1, deletions: 0, changed_files: 1, requested_reviewers: [], comments: -1, review_comments: undefined };
    if (path.includes('/reviews?')) return [];
    if (path.includes('/check-runs?')) return passed;
    return status;
  });
  const details = await fetchPullDetails('synthetic-token', { id: 1, number: 7, title: 'PR', repository: 'org/repo', url: 'https://github.com/org/repo/pull/7', updatedAt: '', draft: false }, new AbortController().signal);
  expect(details.discussionComments).toBeUndefined(); expect(details.reviewComments).toBeUndefined();
});
