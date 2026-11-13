import { githubUrl, type Activity, type PullSummary, type Snapshot } from './model';
import { jsonRequest, UserFacingError } from './network';
type Issue = { id: number; number: number; title: string; html_url: string; repository_url: string; updated_at: string; draft?: boolean; user?: { login: string }; comments?: number; labels?: { name: string }[] };
type Comment = { id: number; body: string; html_url: string; created_at: string; updated_at?: string; issue_url?: string; user: { login: string } | null; in_reply_to_id?: number };
export function github<T>(token: string, path: string, signal?: AbortSignal, onHeaders?: (headers: Headers) => void): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new UserFacingError('Invalid GitHub path.');
  return jsonRequest<T>(`https://api.github.com${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } }, signal, onHeaders);
}
const pull = (issue: Issue): PullSummary => ({ id: issue.id, number: issue.number, title: issue.title.slice(0, 500),
  repository: issue.repository_url.split('/').slice(-2).join('/'), url: githubUrl(issue.html_url) ?? 'https://github.com', updatedAt: issue.updated_at, draft: issue.draft ?? false, author: issue.user?.login?.slice(0, 100), comments: issue.comments, labels: issue.labels?.slice(0, 3).map(label => label.name.slice(0, 60)) });
export async function fetchSnapshot(token: string, signal?: AbortSignal, publishQueues?: (snapshot: Snapshot) => Promise<void>): Promise<Snapshot> {
  signal = signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000);
  const { login } = await github<{ login: string }>(token, '/user', signal);
  if (!/^[a-z\d-]+$/i.test(login)) throw new UserFacingError('Unexpected GitHub account response.');
  type Search = { items: Issue[]; total_count: number; incomplete_results: boolean };
  const search = (query: string) => github<Search>(token, `/search/issues?q=${encodeURIComponent(query)}&sort=updated&per_page=50`, signal);
  const [mine, reviews, mentioned] = await Promise.all([
    search(`is:pr is:open author:${login}`), search(`is:pr is:open review-requested:${login}`),
    search(`is:pr involves:${login} updated:>=${new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)}`).catch(() => ({ items: [], total_count: 0, incomplete_results: true })),
  ]);
  await publishQueues?.({ login, mine: mine.items.map(pull), reviews: reviews.items.map(pull), activity: [], checkedAt: new Date().toISOString(), activityLoading: true, truncated: true, reviewsTruncated: reviews.incomplete_results || reviews.total_count > reviews.items.length });
  // All sign-in types use PR/comment endpoints. /notifications excludes fine-grained PATs and GitHub Apps.
  const activity: Activity[] = [];
  const activitySources: string[] = [];
  let partial = false;
  // Two concurrent comment requests, five recent PRs: bounded cost, never unbounded repository crawling.
  for (const issue of mentioned.items.slice(0, 5)) {
    signal.throwIfAborted();
    const repo = issue.repository_url.match(/^https:\/\/api\.github\.com\/repos\/([\w.-]+\/[\w.-]+)$/)?.[1];
    if (!repo) { partial = true; continue; }
    const sources = [`/repos/${repo}/issues/${issue.number}/comments`, `/repos/${repo}/pulls/${issue.number}/comments`];
    const results = await Promise.allSettled([
      latestComments(token, sources[0], signal),
      github<Comment[]>(token, `${sources[1]}?per_page=30&sort=updated&direction=desc`, signal),
    ]);
    for (const [index, result] of results.entries()) {
      if (result.status !== 'fulfilled') { partial = true; continue; }
      if (result.value.length === 30) partial = true;
      activitySources.push(sources[index]);
      const ownIds = new Set(result.value.filter(comment => comment.user?.login === login).map(comment => comment.id));
      for (const comment of result.value) {
        if (comment.user?.login === login || !githubUrl(comment.html_url)) continue;
        const mention = new RegExp(`(^|[^a-z\\d-])@${login}(?![a-z\\d-])`, 'i').test(comment.body);
        const reply = comment.in_reply_to_id && ownIds.has(comment.in_reply_to_id);
        if (!mention && !reply && !mine.items.some(item => item.id === issue.id)) continue;
        const vercelAuthorization = mention && comment.user?.login === 'vercel[bot]' &&
          /is attempting to deploy a commit/i.test(comment.body) && /a member of the team first needs to/i.test(comment.body) && /authorize it/i.test(comment.body);
        const description = vercelAuthorization ? 'Vercel deployment is waiting for team authorization' :
          `${comment.user?.login ?? 'Someone'} ${mention ? 'mentioned you' : reply ? 'replied to your feedback' : 'commented on your PR'}`;
        activity.push({ id: comment.html_url, source: sources[index], title: `${description} · ${issue.title}`.slice(0, 500),
          reason: mention ? 'mention' : reply ? 'reply' : 'comment', url: comment.html_url, updatedAt: comment.updated_at ?? comment.created_at });
      }
    }
  }
  const unique = [...new Map(activity.map(item => [item.id, item])).values()].sort((a,b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 50);
  return { login, mine: mine.items.map(pull), reviews: reviews.items.map(pull), activity: unique, checkedAt: new Date().toISOString(),
    reviewsTruncated: reviews.incomplete_results || reviews.total_count > reviews.items.length, activitySources,
    truncated: partial || [mine, reviews, mentioned].some(result => result.incomplete_results || result.total_count > result.items.length) || mentioned.items.length > 5 };
}

// Keep a fixed request budget while selecting the newest matching page, not the oldest.
async function latestComments(token: string, source: string, signal: AbortSignal): Promise<Comment[]> {
  const query = `?per_page=30&since=${encodeURIComponent(new Date(Date.now() - 7 * 86400000).toISOString())}`;
  let lastPage = 1;
  const first = await github<Comment[]>(token, source + query, signal, headers => {
    const last = headers.get('link')?.split(',').find(link => /rel="last"/.test(link));
    const url = last?.match(/<([^>]+)>/)?.[1];
    if (!url) return;
    let parsed: URL;
    try { parsed = new URL(url); } catch { return; }
    const page = Number(parsed.searchParams.get('page'));
    if (parsed.origin === 'https://api.github.com' && parsed.pathname === source && Number.isSafeInteger(page) && page > 1) lastPage = page;
  });
  if (lastPage === 1) return first;
  const last = await github<Comment[]>(token, `${source}${query}&page=${lastPage}`, signal);
  const previous = lastPage === 2 ? first : await github<Comment[]>(token, `${source}${query}&page=${lastPage - 1}`, signal);
  return [...new Map([...first, ...previous, ...last].map(comment => [comment.id, comment])).values()].sort((a,b) => Date.parse(b.updated_at ?? b.created_at) - Date.parse(a.updated_at ?? a.created_at)).slice(0, 30);
}
