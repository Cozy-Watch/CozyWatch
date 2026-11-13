import { fetchSnapshot, github } from './github';
const original = globalThis.fetch;
afterEach(() => { globalThis.fetch = original; });
it('uses bounded PR/comment endpoints for every auth method, returns explicit activity without leaking comment bodies', async () => {
  const fetchMock = jest.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const data = url.endsWith('/user') ? { login: 'developer' } : url.includes('/comments?') ? [{
      id: 4, body: 'private context @developer please look', html_url: 'https://github.com/org/repo/pull/7#issuecomment-4', created_at: '2026-11-09T10:00:00Z', user: { login: 'teammate' },
    }] : { total_count: 150, incomplete_results: false, items: [{ id: 1, number: 7, title: 'Improve loading', html_url: 'https://github.com/org/repo/pull/7', repository_url: 'https://api.github.com/repos/org/repo', updated_at: '2026-11-09T10:00:00Z', body: 'Must not reach the popup' }] };
    return new Response(JSON.stringify(data));
  });
  globalThis.fetch = fetchMock;
  const result = await fetchSnapshot('synthetic-secret');
  expect(result.mine[0].repository).toBe('org/repo');
  expect(result.activity[0].reason).toBe('mention');
  expect(result.activity).toHaveLength(1);
  expect(result.truncated).toBe(true);
  expect(JSON.stringify(result)).not.toMatch(/private context|Must not reach|synthetic-secret/);
  expect(fetchMock).toHaveBeenCalledTimes(6);
  expect(fetchMock.mock.calls.every(([url]) => !String(url).includes('/notifications'))).toBe(true);
});
it('returns a safe expiry message instead of exposing response bodies', async () => {
  globalThis.fetch = jest.fn(async () => new Response('sensitive server details', { status: 401 }));
  await expect(github('synthetic-secret', '/user')).rejects.toThrow('expired or were revoked');
});
it('marks unavailable comment access as partial rather than reporting all caught up', async () => {
  globalThis.fetch = jest.fn(async input => {
    const url = String(input);
    if (url.includes('/comments?')) return new Response('private error', { status: 403 });
    return new Response(JSON.stringify(url.endsWith('/user') ? { login: 'developer' } : { total_count: 1, incomplete_results: false, items: [{ id: 1, number: 7, title: 'PR', html_url: 'https://github.com/org/repo/pull/7', repository_url: 'https://api.github.com/repos/org/repo', updated_at: new Date().toISOString() }] }));
  });
  expect((await fetchSnapshot('synthetic-secret')).truncated).toBe(true);
});
it('publishes queues early, fetches the newest bounded comment pages, and uses edit timestamps', async () => {
  const seen: string[] = [];
  globalThis.fetch = jest.fn(async input => {
    const url = String(input); seen.push(url);
    if (url.endsWith('/user')) return new Response(JSON.stringify({ login: 'developer' }));
    if (url.includes('/issues/7/comments?')) {
      const page = new URL(url).searchParams.get('page');
      const data = page === '3' ? [{ id: 99, body: '@developer edited mention', html_url: 'https://github.com/org/repo/pull/7#issuecomment-99', created_at: '2020-01-01T00:00:00Z', updated_at: '2026-11-09T10:00:00Z', user: { login: 'alice' } }] : [];
      return new Response(JSON.stringify(data), { headers: page ? {} : { Link: '<https://api.github.com/repos/org/repo/issues/7/comments?page=3>; rel="last"' } });
    }
    if (url.includes('/comments?')) return new Response('[]');
    return new Response(JSON.stringify({ total_count: 1, incomplete_results: false, items: [{ id: 7, number: 7, title: 'PR', html_url: 'https://github.com/org/repo/pull/7', repository_url: 'https://api.github.com/repos/org/repo', updated_at: '' }] }));
  });
  const publish = jest.fn(async () => { expect(seen.some(url => url.includes('/comments?'))).toBe(false); });
  const result = await fetchSnapshot('synthetic-token', undefined, publish);
  expect(publish).toHaveBeenCalledTimes(1);
  expect(seen.some(url => url.includes('page=3'))).toBe(true);
  expect(seen.some(url => url.includes('page=2'))).toBe(true);
  expect(result.activity[0].updatedAt).toBe('2026-11-09T10:00:00Z');
});
it.each([
  ['vercel[bot]', '@developer is attempting to deploy a commit to the Example Team on Vercel. A member of the Team first needs to [authorize it](https://vercel.com/git/authorize). Private deployment context.', true],
  ['teammate', '@developer is attempting to deploy a commit. A member of the Team first needs to authorize it.', false],
  ['vercel[bot]', '@developer Your deployment is ready. Private deployment context.', false],
])('summarizes only matching Vercel authorization messages (actor=%s, body=%s)', async (actor, body, expected) => {
  globalThis.fetch = jest.fn(async input => {
    const url = String(input);
    if (url.endsWith('/user')) return new Response(JSON.stringify({ login: 'developer' }));
    if (url.includes('/issues/7/comments?')) return new Response(JSON.stringify([{ id: 1, body, html_url: 'https://github.com/org/repo/pull/7#issuecomment-1', created_at: '2026-11-10T10:00:00Z', user: { login: actor } }]));
    if (url.includes('/comments?')) return new Response('[]');
    return new Response(JSON.stringify({ total_count: 1, incomplete_results: false, items: [{ id: 7, number: 7, title: 'PR', html_url: 'https://github.com/org/repo/pull/7', repository_url: 'https://api.github.com/repos/org/repo', updated_at: '' }] }));
  });
  const result = await fetchSnapshot('synthetic-token');
  expect(result.activity).toHaveLength(1);
  expect(result.activity[0].reason).toBe('mention');
  expect(result.activity[0].title.includes('Vercel deployment is waiting for team authorization')).toBe(expected);
  expect(result.activity[0].url).toBe('https://github.com/org/repo/pull/7#issuecomment-1');
  expect(JSON.stringify(result)).not.toMatch(/Private deployment context|https:\/\/vercel.com\/git\/authorize|synthetic-token/);
});
