/// <reference types="chrome" />
import type { DeviceFlow } from './auth';
import type { Command, Reply, Snapshot } from './model';
jest.mock('./github', () => ({ fetchSnapshot: jest.fn(), github: jest.fn() }));
jest.mock('./vault', () => {
  const secrets = new Map();
  return { readSecret: jest.fn(async (key: string) => secrets.get(key)), writeSecret: jest.fn(async (key: string, value: unknown) => { secrets.set(key, value); }), removeSecret: jest.fn(async (key: string) => { secrets.delete(key); }) };
});
jest.mock('./pull-details', () => ({ fetchPullDetails: jest.fn() }));
jest.mock('./license', () => ({ validateLicense: jest.fn() }));
jest.mock('./auth', () => ({ ...jest.requireActual('./auth'), startDevice: jest.fn(), pollDevice: jest.fn(), rotate: jest.fn() }));
const snapshot = (): Snapshot => ({ login: 'developer', mine: [], reviews: [], activity: [], checkedAt: new Date().toISOString(), truncated: false });
const area = () => {
  let data: Record<string, unknown> = {};
  return {
    get: jest.fn(async (keys: string | string[]) => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, data[key]]))),
    set: jest.fn(async (value: Record<string, unknown>) => { data = { ...data, ...value }; }),
    remove: jest.fn(async (keys: string | string[]) => { const removed = new Set(Array.isArray(keys) ? keys : [keys]); data = Object.fromEntries(Object.entries(data).filter(([key]) => !removed.has(key))); }),
    setAccessLevel: jest.fn(async () => undefined),
  };
};
async function setup() {
  jest.resetModules();
  const local = area(), session = area();
  let listener: (message: unknown, sender: chrome.runtime.MessageSender, reply: (result: Reply) => void) => boolean = () => false;
  const notify = jest.fn(async () => 'cozy-activity');
  Object.assign(globalThis, { chrome: {
    storage: { local, session },
    runtime: { id: 'test', getURL: (file: string) => `chrome-extension://test/${file}`,
      onMessage: { addListener: (fn: typeof listener) => { listener = fn; } },
      onStartup: { addListener: jest.fn() }, onInstalled: { addListener: jest.fn() } },
    alarms: { get: jest.fn(async () => undefined), create: jest.fn(async () => undefined), clear: jest.fn(async () => true), onAlarm: { addListener: jest.fn() } },
    action: { getBadgeText: jest.fn(async () => ''), setTitle: jest.fn(async () => undefined), setBadgeText: jest.fn(async () => undefined), setBadgeBackgroundColor: jest.fn(async () => undefined) },
    notifications: { create: notify, clear: jest.fn(async () => true), onClicked: { addListener: jest.fn() } }, tabs: { create: jest.fn() },
  } });
  const { startDevice, pollDevice, rotate, DeviceAuthorizationEnded } = await import('./auth');
  const { fetchPullDetails } = await import('./pull-details');
  const { fetchSnapshot, github } = await import('./github');
  const { readSecret, writeSecret } = await import('./vault');
  const { validateLicense } = await import('./license');
  await import('./worker');
  const send = (command: Command) => new Promise<Reply>(resolve => listener(command, { id: 'test', url: 'chrome-extension://test/popup.html' }, resolve));
  jest.mocked(github).mockResolvedValue({ login: 'developer' }); jest.mocked(fetchSnapshot).mockResolvedValue(snapshot());
  const connect = () => send({ type: 'connect', token: 'synthetic_token_not_a_real_secret' });
  return { local, session, notify, listener, send, connect, rotate, fetchPullDetails, startDevice, pollDevice, DeviceAuthorizationEnded, fetchSnapshot, github, readSecret, writeSecret, validateLicense };
}

it('keeps credentials private and refuses accidental account replacement', async () => {
  const { local, session, notify, send, readSecret } = await setup();
  const connected = await send({ type: 'connect', token: 'synthetic_token_not_a_real_secret' });
  expect(connected.ok).toBe(true); expect(JSON.stringify(connected)).not.toContain('synthetic_token');
  expect((await local.get('token')).token).toBeUndefined(); expect((await session.get('token')).token).toBeUndefined();
  expect(notify).not.toHaveBeenCalled();
  expect(await readSecret('github')).toEqual(expect.objectContaining({ token: 'synthetic_token_not_a_real_secret' }));
  expect((await send({ type: 'connect', token: 'another_synthetic_credential' })).ok).toBe(false);

});

it('pauses expired trials and preserves paid access through a licensing outage', async () => {
  const { local, send, connect, fetchSnapshot, readSecret, writeSecret, validateLicense } = await setup();
  await connect();
  await local.set({ trialEnd: Date.now() - 1, snapshot: undefined });
  jest.mocked(fetchSnapshot).mockClear(); await send({ type: 'refresh' }); expect(fetchSnapshot).not.toHaveBeenCalled();
  await writeSecret('license', { key: 'synthetic-license', status: 'licensed', checkedAt: 0 });
  jest.mocked(validateLicense).mockRejectedValue(new Error('offline')); await send({ type: 'refresh' });
  expect(fetchSnapshot).toHaveBeenCalledTimes(1); expect((await readSecret<{ status: string }>('license'))?.status).toBe('licensed');

});

it('delivers generic alerts once and preserves baselines across cache cleanup', async () => {
  const { local, notify, send, connect, fetchSnapshot } = await setup();
  await connect();
  await send({ type: 'notifications', enabled: true });
  await local.set({ snapshot: undefined, baseline: { login: 'developer', sources: { existing: Date.now() - 2000 } } });
  const privateActivity = { id: 'comment-1', source: 'existing', title: 'PRIVATE REPOSITORY TITLE', reason: 'mention', url: 'https://github.com/org/repo/pull/1', updatedAt: new Date(Date.now() - 1000).toISOString() };
  jest.mocked(fetchSnapshot).mockResolvedValue({ ...snapshot(), activitySources: ['existing', 'new-source'], truncated: true, activity: [privateActivity, { ...privateActivity, id: 'historical', source: 'new-source' }] });
  await send({ type: 'refresh' });
  expect(notify).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(notify.mock.calls)).not.toContain('PRIVATE');
  await send({ type: 'clear-cache' }); await send({ type: 'refresh' });
  expect(notify).toHaveBeenCalledTimes(1); // Cache cleanup cannot replay a known event.

});

it('serves cached reads promptly and rejects late responses after disconnect', async () => {
  const { local, listener, send, connect, fetchSnapshot, readSecret, writeSecret } = await setup();
  await connect();
  const trialEnd = (await local.get('trialEnd')).trialEnd;
  await writeSecret('license', { key: 'synthetic-license', status: 'licensed', checkedAt: Date.now() });
  await local.set({ trialEnd, snapshot: undefined });
  let resolveRequest!: (value: Snapshot) => void;
  let started!: () => void; const active = new Promise<void>(resolve => { started = resolve; });
  jest.mocked(fetchSnapshot).mockImplementationOnce(() => { started(); return new Promise(resolve => { resolveRequest = resolve; }); });
  const refreshing = send({ type: 'refresh' }); await active;
  const reading = await send({ type: 'state' }); expect(reading.ok && reading.state.connected).toBe(true);
  const disconnecting = send({ type: 'disconnect' }); resolveRequest(snapshot()); await refreshing; await disconnecting;
  expect(await readSecret('github')).toBeUndefined(); expect((await local.get('snapshot')).snapshot).toBeUndefined();
  expect((await local.get('trialEnd')).trialEnd).toBe(trialEnd); expect(await readSecret('license')).toBeDefined();
  expect(listener({ type: 'state' }, { id: 'test', url: 'https://github.com' }, jest.fn())).toBe(false);

});

it('does not resume a refresh cancelled during cache cleanup', async () => {
  const { local, send, connect, fetchSnapshot } = await setup();
  await connect(); await send({ type: 'clear-cache' });
  jest.mocked(fetchSnapshot).mockClear();
  const get = local.get.getMockImplementation()!;
  let resume!: () => void;
  let started!: () => void;
  const cleaning = new Promise<void>(resolve => { started = resolve; });
  local.get.mockImplementation(async keys => {
    if (keys === 'snapshot') {
      started(); await new Promise<void>(resolve => { resume = resolve; });
    }
    return get(keys);
  });
  const refreshing = send({ type: 'refresh' }); await cleaning;
  const disconnecting = send({ type: 'disconnect' }); resume();
  await refreshing;
  const disconnected = await disconnecting;
  expect(disconnected.ok && disconnected.state.connected).toBe(false);
  expect(fetchSnapshot).not.toHaveBeenCalled();
});

it('keeps pending codes private, survives reopening, and clears pending alarms on cancel', async () => {
  const { send, startDevice, readSecret } = await setup();
  const flow: DeviceFlow = { method: 'oauth', deviceCode: 'private-device-code', userCode: 'ABCD-EFGH', expiresAt: Date.now() + 900000, interval: 5000, nextPoll: 0 };
  jest.mocked(startDevice).mockResolvedValue(flow);
  const pending = await send({ type: 'start-auth', method: 'oauth' });
  expect(pending.ok && pending.state.auth?.userCode).toBe('ABCD-EFGH');
  expect(JSON.stringify(pending)).not.toContain('private-device-code');
  expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'CODE' });
  expect(JSON.stringify(jest.mocked(chrome.action.setTitle).mock.calls)).not.toContain('ABCD-EFGH');
  expect(chrome.tabs.create).not.toHaveBeenCalled(); // User sees/copies the code before opening GitHub.
  expect(chrome.alarms.create).toHaveBeenCalledWith('cozy-watch-auth-poll', { periodInMinutes: 0.5 });
  const reopened = await send({ type: 'state' });
  expect(reopened.ok && reopened.state.auth?.userCode).toBe('ABCD-EFGH');
  await send({ type: 'cancel-auth' });
  expect(await readSecret('device')).toBeUndefined();
  expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' });
  expect(chrome.alarms.clear).toHaveBeenCalledWith('cozy-watch-auth-poll');

});

it('preserves pending authorization on transport errors and clears expired codes', async () => {
  const { send, startDevice, pollDevice, DeviceAuthorizationEnded, readSecret } = await setup();
  const flow: DeviceFlow = { method: 'oauth', deviceCode: 'private-device-code', userCode: 'ABCD-EFGH', expiresAt: Date.now() + 900000, interval: 5000, nextPoll: 0 };
  jest.mocked(startDevice).mockResolvedValue(flow);
  await send({ type: 'start-auth', method: 'oauth' });
  jest.mocked(pollDevice).mockRejectedValueOnce(new Error('network unavailable'));
  await send({ type: 'poll-auth' });
  expect(await readSecret('device')).toBeDefined();
  expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'CODE' });
  jest.mocked(pollDevice).mockRejectedValueOnce(new DeviceAuthorizationEnded('GitHub sign-in code expired. Start again.'));
  const expired = await send({ type: 'poll-auth' });
  expect(expired.ok && expired.state.auth).toBeUndefined();
  expect(expired.ok && expired.state.error).toContain('expired');
  expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '!' });

});

it('completes authentication before the initial activity request finishes', async () => {
  const { send, startDevice, pollDevice, fetchSnapshot, readSecret } = await setup();
  const flow: DeviceFlow = { method: 'oauth', deviceCode: 'private-device-code', userCode: 'ABCD-EFGH', expiresAt: Date.now() + 900000, interval: 5000, nextPoll: 0 };
  jest.mocked(startDevice).mockResolvedValue(flow);
  await send({ type: 'start-auth', method: 'oauth' });
  jest.mocked(pollDevice).mockResolvedValueOnce({ method: 'oauth', token: 'synthetic_new_token' });
  let completeFirstSync!: (value: Snapshot) => void;
  let markSyncStarted!: () => void;
  const firstSyncStarted = new Promise<void>(resolve => { markSyncStarted = resolve; });
  jest.mocked(fetchSnapshot).mockImplementationOnce(() => new Promise(resolve => { completeFirstSync = resolve; markSyncStarted(); }));
  const authorized = await send({ type: 'poll-auth' });
  expect(authorized.ok && authorized.state.connected).toBe(true);
  expect(await readSecret('device')).toBeUndefined();
  expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' });
  // Authentication must complete even while the first GitHub data request remains pending.
  await firstSyncStarted;
  expect(completeFirstSync).toBeDefined();
  const whileSyncing = await send({ type: 'state' });
  expect(whileSyncing.ok && whileSyncing.state.connected).toBe(true);
  expect(whileSyncing.ok && whileSyncing.state.auth).toBeUndefined();
  completeFirstSync(snapshot());
  await send({ type: 'notifications', enabled: false }); // Drain the background sync.

});

it('recovers approved authorization without repeating a consumed code exchange', async () => {
  const { send, startDevice, pollDevice, fetchSnapshot, github, readSecret } = await setup();
  const flow: DeviceFlow = { method: 'oauth', deviceCode: 'private-device-code', userCode: 'ABCD-EFGH', expiresAt: Date.now() + 900000, interval: 5000, nextPoll: 0 };
  jest.mocked(startDevice).mockResolvedValue(flow);
  await send({ type: 'start-auth', method: 'oauth' });
  jest.mocked(pollDevice).mockResolvedValueOnce({ method: 'oauth', token: 'approved_before_outage' });
  jest.mocked(github).mockRejectedValueOnce(new Error('GitHub temporarily offline'));
  expect((await send({ type: 'poll-auth' })).ok).toBe(false);
  expect(await readSecret('github')).toBeUndefined();
  expect(await readSecret('device')).toEqual(expect.objectContaining({ credential: { method: 'oauth', token: 'approved_before_outage' } }));
  const waiting = await send({ type: 'state' });
  expect(waiting.ok && waiting.state.auth?.verifying).toBe(true);
  expect(JSON.stringify(waiting)).not.toContain('approved_before_outage');
  const exchanges = jest.mocked(pollDevice).mock.calls.length;
  jest.mocked(github).mockResolvedValue({ login: 'developer' });
  jest.mocked(fetchSnapshot).mockResolvedValue(snapshot());
  const retried = await send({ type: 'poll-auth' });
  expect(retried.ok && retried.state.connected).toBe(true);
  expect(jest.mocked(pollDevice).mock.calls.length).toBe(exchanges);
  await send({ type: 'notifications', enabled: false });



});
it.each(['refresh', 'pull-details'] as const)('persists rotated credentials before %s fetches data', async type => {
  const { local, send, rotate, fetchSnapshot, fetchPullDetails, readSecret, writeSecret } = await setup();
  await writeSecret('github', { method: 'github-app', token: 'old-synthetic-token', refreshToken: 'synthetic-refresh', expiresAt: 1 });
  jest.mocked(rotate).mockResolvedValue({ method: 'github-app', token: 'new-synthetic-token', expiresAt: Date.now() + 3600000 });
  await local.set({ trialEnd: Date.now() + 3600000, snapshot: type === 'pull-details' ? { ...snapshot(), mine: [{ id: 7, number: 7, title: 'PR', repository: 'org/repo', url: 'https://github.com/org/repo/pull/7', updatedAt: '', draft: false }] } : undefined });
  jest.mocked(fetchPullDetails).mockResolvedValue({ checkedAt: Date.now(), head: 'fix', base: 'main', additions: 1, deletions: 0, files: 1, reviewers: [], reviewsPartial: false, ci: 'none' });
  const reply = await send(type === 'refresh' ? { type } : { type, id: 7 });
  expect(reply.ok).toBe(true);
  expect(rotate).toHaveBeenCalledTimes(1);
  expect(await readSecret('github')).toEqual(expect.objectContaining({ token: 'new-synthetic-token' }));
  expect(type === 'refresh' ? fetchSnapshot : fetchPullDetails).toHaveBeenCalledWith('new-synthetic-token', ...(type === 'refresh' ? [expect.any(AbortSignal), expect.any(Function)] : [expect.any(Object), expect.any(AbortSignal)]));
});
it('updates notification preferences while GitHub is pending and does not send an alert after disabling', async () => {
  const { send, connect, local, fetchSnapshot, notify } = await setup(); await connect();
  await send({ type: 'notifications', enabled: true }); await local.remove('snapshot');
  let release!: (value: Snapshot) => void; let started!: () => void;
  const running = new Promise<void>(resolve => { started = resolve; });
  jest.mocked(fetchSnapshot).mockImplementationOnce(() => { started(); return new Promise(resolve => { release = resolve; }); });
  const refreshing = send({ type: 'refresh' }); await running;
  expect((await send({ type: 'notifications', enabled: false })).ok).toBe(true);
  expect((await local.get('notifications')).notifications).toBe(false);
  release(snapshot()); await refreshing; expect(notify).not.toHaveBeenCalled();
});
it.each(['revoked', 'expired'] as const)('ends %s saved authorization instead of retrying indefinitely', async reason => {
  const { send, writeSecret, readSecret, github } = await setup();
  const { HttpError } = await import('./network');
  await writeSecret('device', { method: 'oauth', deviceCode: 'private', userCode: 'ABCD-EFGH', interval: 5000, expiresAt: 1, nextPoll: 0, credential: { method: 'oauth', token: 'private-token', ...(reason === 'expired' ? { expiresAt: 1 } : {}) } });
  jest.mocked(github).mockRejectedValue(new HttpError(401, 'GitHub credentials expired or were revoked.'));
  const reply = await send({ type: 'poll-auth' });
  expect(reply.ok && reply.state.auth).toBeUndefined();
  expect(await readSecret('device')).toBeUndefined();
  expect(reply.ok && reply.state.error).toMatch(/fresh sign-in/);
});
it('publishes PR queues before conversations finish loading', async () => {
  const { connect, send, fetchSnapshot, local } = await setup(); await connect(); await local.remove('snapshot');
  let finish!: (value: Snapshot) => void; let published!: () => void;
  const ready = new Promise<void>(resolve => { published = resolve; });
  jest.mocked(fetchSnapshot).mockImplementationOnce(async (_token, _signal, publish) => {
    await publish!({ ...snapshot(), activityLoading: true }); published();
    return new Promise(resolve => { finish = resolve; });
  });
  const refreshing = send({ type: 'refresh' }); await ready;
  const partial = await send({ type: 'state' }); expect(partial.ok && partial.state.snapshot?.activityLoading).toBe(true);
  finish(snapshot()); await refreshing;
  const complete = await send({ type: 'state' }); expect(complete.ok && complete.state.snapshot?.activityLoading).toBeUndefined();
});
it('allows retry immediately after a partial activity scan fails', async () => {
  const { send, connect, local, fetchSnapshot } = await setup(); await connect(); await local.remove('snapshot');
  jest.mocked(fetchSnapshot).mockImplementationOnce(async (_token, _signal, publish) => { await publish!({ ...snapshot(), activityLoading: true }); throw new Error('conversation timeout'); });
  await send({ type: 'refresh' });
  const calls = jest.mocked(fetchSnapshot).mock.calls.length;
  await send({ type: 'refresh' });
  expect(fetchSnapshot).toHaveBeenCalledTimes(calls + 1);
  const current = await send({ type: 'state' });
  expect(current.ok && current.state.error).toBeUndefined();
});
it.each(['notifications', 'state'] as const)('rejects delayed %s responses after disconnect instead of exposing the old account', async type => {
  const { send, connect, readSecret } = await setup(); await connect(); await send({ type: 'clear-cache' });
  const originalRead = jest.mocked(readSecret).getMockImplementation()!;
  let release!: (value: undefined) => void; let started!: () => void;
  const waiting = new Promise<void>(resolve => { started = resolve; }); let first = true;
  jest.mocked(readSecret).mockImplementation(key => {
    if (key === 'device' && first) { first = false; started(); return new Promise(resolve => { release = resolve; }); }
    return originalRead(key);
  });
  const preference = send(type === 'state' ? { type } : { type, enabled: true }); await waiting;
  const disconnected = await send({ type: 'disconnect' }); expect(disconnected.ok && disconnected.state.connected).toBe(false);
  release(undefined);
  const stale = await preference; expect(stale.ok).toBe(false);
  expect(JSON.stringify(stale)).not.toContain('snapshot');
});
it('hides expired snapshots on read without deleting concurrent cache updates', async () => {
  const { send, connect, local } = await setup(); await connect();
  await local.set({ snapshot: { ...snapshot(), checkedAt: '2000-01-01T00:00:00Z' } });
  local.remove.mockClear();
  const reply = await send({ type: 'state' });
  expect(reply.ok && reply.state.snapshot).toBeUndefined();
  expect(local.remove).not.toHaveBeenCalledWith('snapshot');
});
it('returns the latest activity when a preference reply waits for secure storage', async () => {
  const { send, connect, local, readSecret } = await setup(); await connect(); await send({ type: 'clear-cache' });
  const originalRead = jest.mocked(readSecret).getMockImplementation()!;
  let release!: (value: undefined) => void;
  let started!: () => void;
  const waiting = new Promise<void>(resolve => { started = resolve; });
  let first = true;
  jest.mocked(readSecret).mockImplementation(key => {
    if (key === 'device' && first) {
      first = false; started(); return new Promise(resolve => { release = resolve; });
    }
    return originalRead(key);
  });
  const preference = send({ type: 'notifications', enabled: true }); await waiting;
  const latest = { ...snapshot(), activity: [{ id: 'new-comment', title: 'New reply', reason: 'reply', url: 'https://github.com/org/repo/pull/1#issuecomment-1', updatedAt: new Date().toISOString() }] };
  await local.set({ snapshot: latest }); release(undefined);
  const reply = await preference;
  expect(reply.ok && reply.state.snapshot).toEqual(latest);
});
