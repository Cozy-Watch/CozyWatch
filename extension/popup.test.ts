/** @jest-environment jsdom */
import type { PublicState } from './model';
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
async function mount(state: PublicState) {
  jest.resetModules(); document.body.innerHTML = '<div id="root"></div>';
  Object.assign(globalThis, { chrome: { runtime: { sendMessage: jest.fn(async () => ({ ok: true, state })) } } });
  await import('./popup'); await flush();
}
it('shows all three sign-in options and clear explanations without requiring a desktop app', async () => {
  await mount({ connected: false, notifications: false });
  expect(document.body.textContent).toContain('Connect with GitHub');
  expect(document.body.textContent).toContain('GitHub App');
  expect(document.body.textContent).toContain('Personal access token');
  expect(document.body.textContent).toContain('Windows, macOS and Linux');
  expect(document.querySelector('input')).toBeNull();
  [...document.querySelectorAll('button')].find(button => button.textContent!.includes('Personal access token'))!.click();
  expect(document.querySelector<HTMLInputElement>('input')!.type).toBe('password');
});
it('renders private API strings as text and filters hostile links', async () => {
  await mount({ connected: true, notifications: false, license: { status: 'licensed' }, snapshot: {
    login: 'developer', checkedAt: new Date().toISOString(), truncated: false, reviews: [], activity: [], mine: [
      { id: 1, number: 1, author: 'alice', comments: 3, labels: ['bug'], title: '<img src=x onerror=alert(1)>', url: 'https://github.com/org/repo/pull/1', repository: 'org/repo', draft: false, updatedAt: '' },
      { id: 2, number: 2, title: 'hostile link', url: 'javascript:alert(1)', repository: 'org/repo', draft: false, updatedAt: '' },
    ],
  } });
  document.querySelector<HTMLButtonElement>('[data-feed=mine]')!.click();
  expect(document.querySelectorAll('img')).toHaveLength(1);
  expect(document.querySelector('img')!.src).toMatch(/icon\.png$/);
  expect(document.body.textContent).toContain('<img src=x onerror=alert(1)>');
  expect([...document.querySelectorAll('a')].every(link => link.href.startsWith('https://github.com/'))).toBe(true);
  expect(document.body.textContent).not.toContain('hostile link');
  expect(document.body.textContent).toContain('@alice');
  expect(document.body.textContent).toContain('3 discussion comments');
  expect(document.body.textContent).toContain('bug');
  expect(document.querySelector('svg.octicon')).not.toBeNull();
  clickButton('Details'); await flush();
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'pull-details', id: 1 });
});
const clickButton = (label: string) => {
  const button = [...document.querySelectorAll('button')].find(button => button.textContent?.includes(label) || button.getAttribute('aria-label') === label);
  if (!button) throw new Error(`Button not found: ${label}`);
  button.click();
};
it('keeps license management separate from settings and GitHub authentication', async () => {
  await mount({ connected: false, notifications: false, license: { status: 'trial' } });
  clickButton('Settings');
  expect(document.body.textContent).toContain('Alerts');
  expect(document.querySelector('input[type=password]')).toBeNull();
  clickButton('Manage');
  expect(document.body.textContent).toContain('One purchase. Desktop and browser.');
  expect(document.querySelector<HTMLInputElement>('input[type=password]')!.placeholder).toBe('Paste your lifetime key');
  expect(document.querySelector('a[href*="my-orders"]')).not.toBeNull();
  expect(document.querySelector('a[href^="mailto:"]')).not.toBeNull();
});
it('sends PAT only on submit and clears it from the interface immediately', async () => {
  await mount({ connected: false, notifications: false });
  clickButton('Personal access token');
  const input = document.querySelector<HTMLInputElement>('input')!;
  input.value = 'synthetic_private_token';
  document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'connect', token: 'synthetic_private_token' });
  expect(document.body.innerHTML).not.toContain('synthetic_private_token');
});
it('shows a code and cancel option while GitHub authorization is pending', async () => {
  await mount({ connected: false, notifications: false, auth: { method: 'oauth', userCode: 'ABCD-EFGH', expiresAt: Date.now() + 900000, interval: 5000 } });
  expect(document.body.textContent).toContain('ABCD-EFGH');
  expect(document.querySelector('a[href="https://github.com/login/device"]')).not.toBeNull();
  clickButton('Cancel sign-in'); await flush();
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'cancel-auth' });
  window.dispatchEvent(new Event('pagehide'));
});
it('shows the quiet reward only for fresh complete results without errors', async () => {
  const base: PublicState = { connected: true, notifications: false, snapshot: { login: 'developer', mine: [], reviews: [], activity: [], checkedAt: new Date().toISOString(), truncated: false } };
  await mount(base);
  expect(document.body.textContent).toContain('Your review queue is clear.');
  await mount({ ...base, error: 'Offline. Showing saved data.' });
  expect(document.body.textContent).not.toContain('Your review queue is clear.');
  expect(document.querySelector('[role=alert]')!.textContent).toContain('Offline');
  await mount({ ...base, snapshot: { ...base.snapshot!, truncated: true, reviewsTruncated: true } });
  expect(document.body.textContent).not.toContain('Your review queue is clear.');
});
it('keeps monitoring gates visible after the trial ends', async () => {
  await mount({ connected: true, notifications: false, license: { status: 'trial-ended' } });
  expect(document.body.textContent).toContain('Your trial has ended');
  expect(document.body.textContent).toContain('Your GitHub connection and preferences are saved.');
  expect(document.querySelector('[role=tablist]')).toBeNull();
  clickButton('Enter an existing license key');
  expect(document.querySelector('form')).not.toBeNull();
});
it('leaves the code screen immediately on success and ignores a delayed pre-auth state read', async () => {
  jest.useFakeTimers();
  try {
    jest.resetModules(); document.body.innerHTML = '<div id="root"></div>';
    const pending: PublicState = { connected: false, notifications: false, auth: { method: 'oauth', userCode: 'ABCD-EFGH', expiresAt: Date.now() + 900000, interval: 5000 } };
    let resolveAuth!: (reply: unknown) => void;
    let resolveOldState!: (reply: unknown) => void;
    let changed!: (changes: object, area: string) => void;
    let reads = 0;
    const sendMessage = jest.fn((command: { type: string }) => {
      if (command.type === 'poll-auth') return new Promise(resolve => { resolveAuth = resolve; });
      if (reads++ === 0) return Promise.resolve({ ok: true, state: pending });
      return new Promise(resolve => { resolveOldState = resolve; });
    });
    Object.assign(globalThis, { chrome: { runtime: { sendMessage }, storage: { onChanged: { addListener: (fn: typeof changed) => { changed = fn; } } } } });
    await import('./popup'); await flush();
    expect(document.body.textContent).toContain('ABCD-EFGH');
    expect(sendMessage).toHaveBeenCalledWith({ type: 'poll-auth' }); // Resume immediately on reopening.
    changed({ snapshot: {} }, 'local'); await flush();
    resolveAuth({ ok: true, state: { connected: true, notifications: false } }); await flush();
    expect(document.body.textContent).toContain('GitHub connected.');
    expect(document.body.textContent).not.toContain('ABCD-EFGH');
    resolveOldState({ ok: true, state: pending }); await flush();
    expect(document.body.textContent).toContain('GitHub connected.');
    expect(document.body.textContent).not.toContain('ABCD-EFGH');
    await jest.advanceTimersByTimeAsync(10000);
    expect(sendMessage.mock.calls.filter(([command]) => command.type === 'poll-auth')).toHaveLength(1);
  } finally { window.dispatchEvent(new Event('pagehide')); jest.useRealTimers(); }
});
it('does not postpone auth polling when unrelated storage changes arrive', async () => {
  jest.useFakeTimers();
  try {
    jest.resetModules(); document.body.innerHTML = '<div id="root"></div>';
    const pending: PublicState = { connected: false, notifications: false, auth: { method: 'oauth', userCode: 'ABCD-EFGH', expiresAt: Date.now() + 900000, interval: 5000 } };
    let changed!: (changes: object, area: string) => void;
    const sendMessage = jest.fn(async () => ({ ok: true, state: pending }));
    Object.assign(globalThis, { chrome: { runtime: { sendMessage }, storage: { onChanged: { addListener: (fn: typeof changed) => { changed = fn; } } } } });
    await import('./popup'); await flush();
    sendMessage.mockClear();
    for (let i = 0; i < 4; i++) { await jest.advanceTimersByTimeAsync(1000); changed({ snapshot: {} }, 'local'); await flush(); }
    await jest.advanceTimersByTimeAsync(1000);
    expect(sendMessage).toHaveBeenCalledWith({ type: 'poll-auth' });
  } finally { window.dispatchEvent(new Event('pagehide')); jest.useRealTimers(); }
});
it('preserves an active license form and selection across background changes without persisting the key', async () => {
  jest.resetModules(); document.body.innerHTML = '<div id="root"></div>';
  let changed!: (changes: object, area: string) => void;
  let current: PublicState = { connected: true, notifications: false, license: { status: 'trial' } };
  const sendMessage = jest.fn(async () => ({ ok: true, state: current }));
  Object.assign(globalThis, { chrome: { runtime: { sendMessage }, storage: { onChanged: { addListener: (fn: typeof changed) => { changed = fn; } } } } });
  await import('./popup'); await flush();
  clickButton('Settings'); clickButton('Manage');
  const input = document.querySelector<HTMLInputElement>('input[type=password]')!;
  input.focus(); input.value = 'synthetic-private-key'; input.setSelectionRange(3, 7);
  current = { ...current, error: 'Temporary refresh issue' };
  changed({ error: {} }, 'local'); await flush();
  expect(document.querySelector('input[type=password]')).toBe(input);
  expect(input.value).toBe('synthetic-private-key');
  expect(document.activeElement).toBe(input);
  expect([input.selectionStart, input.selectionEnd]).toEqual([3, 7]);
  expect(JSON.stringify(sendMessage.mock.calls)).not.toContain('synthetic-private-key');
  sendMessage.mockClear();
  changed({ diagnostics: {}, baseline: {} }, 'local'); await flush();
  expect(sendMessage).not.toHaveBeenCalled();
  let completeRead!: (reply: { ok: boolean; state: PublicState }) => void;
  sendMessage.mockImplementationOnce(() => new Promise(resolve => { completeRead = resolve; }));
  changed({ error: {} }, 'local'); changed({ snapshot: {} }, 'local'); changed({ notifications: {} }, 'local');
  expect(sendMessage).toHaveBeenCalledTimes(1);
  completeRead({ ok: true, state: current }); await flush();
  expect(input.value).toBe('synthetic-private-key');
});
it.each([true, false])('distinguishes loading and partial mentions from a complete empty result (loading=%s)', async loading => {
  await mount({ connected: true, notifications: false, snapshot: { login: 'dev', mine: [], reviews: [], activity: [], activityLoading: loading, truncated: true, checkedAt: new Date().toISOString() } });
  clickButton('Mentions');
  expect(document.body.textContent).not.toContain('No mentions in the conversations checked.');
  expect(document.body.textContent).toContain(loading ? 'Checking conversations for mentions' : 'Some conversations were not checked');
});
it('does not apply an older mutation response after a disconnect action', async () => {
  jest.resetModules(); document.body.innerHTML = '<div id="root"></div>';
  const connected: PublicState = { connected: true, notifications: false, license: { status: 'licensed' } };
  const disconnected: PublicState = { ...connected, connected: false };
  let finishPreference!: (reply: { ok: boolean; state: PublicState }) => void;
  const sendMessage = jest.fn((command: { type: string }) => {
    if (command.type === 'notifications') return new Promise(resolve => { finishPreference = resolve; });
    return Promise.resolve({ ok: true, state: command.type === 'disconnect' ? disconnected : connected });
  });
  Object.assign(globalThis, { chrome: { runtime: { sendMessage } } });
  await import('./popup'); await flush(); clickButton('Settings');
  const checkbox = document.querySelector<HTMLInputElement>('input[type=checkbox]')!;
  const disconnect = [...document.querySelectorAll('button')].find(button => button.textContent === 'Disconnect GitHub')!;
  checkbox.checked = true; checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  // Controlled concurrent action: the old setting reply is deliberately delivered last.
  disconnect.dispatchEvent(new MouseEvent('click', { bubbles: true })); await flush();
  expect(document.body.textContent).toContain('Connect with GitHub');
  finishPreference({ ok: true, state: connected }); await flush();
  expect(document.body.textContent).toContain('Connect with GitHub');
  expect(document.body.textContent).not.toContain('GitHub connected.');
});
it.each([true, false, null, undefined])('shows authoritative conflict warnings and complete comment counts (conflict=%s)', async mergeConflict => {
  await mount({ connected: true, notifications: false, license: { status: 'licensed' }, snapshot: { login: 'developer', checkedAt: new Date().toISOString(), truncated: false, reviews: [], activity: [], mine: [{ id: 1, number: 7, title: 'PR', repository: 'org/repo', url: 'https://github.com/org/repo/pull/7', updatedAt: '', draft: false, comments: 1, details: { checkedAt: Date.now(), head: 'fix', base: 'main', additions: 1, deletions: 0, files: 1, reviewers: [], reviewsPartial: false, ci: 'passing', discussionComments: 1, reviewComments: 9, mergeConflict } }] } });
  clickButton('My PRs'); clickButton('Details');
  expect(document.body.textContent).toContain('10 comments');
  expect(document.querySelector('.comment-count')!.getAttribute('aria-label')).toContain('1 discussion comment and 9 inline review comments');
  expect(document.body.textContent).toContain('CI passing');
  expect(Boolean(document.querySelector('[data-conflict=true]'))).toBe(mergeConflict === true);
  if (mergeConflict === true) expect(document.body.textContent).toContain('Resolve merge conflicts on GitHub before merging.');
  if (mergeConflict == null) expect(document.body.textContent).toContain('Merge-conflict status unavailable.');
  if (mergeConflict === false) expect(document.body.textContent).not.toContain('Merge-conflict status unavailable.');
});
it('labels cached summary counts as discussion-only until full details are known', async () => {
  await mount({ connected: true, notifications: false, snapshot: { login: 'developer', checkedAt: new Date().toISOString(), truncated: false, reviews: [], activity: [], mine: [{ id: 1, number: 7, title: 'PR', repository: 'org/repo', url: 'https://github.com/org/repo/pull/7', updatedAt: '', draft: false, comments: 1 }] } });
  clickButton('My PRs');
  expect(document.body.textContent).toContain('1 discussion comment');
  expect(document.querySelector('.comment-count')!.getAttribute('aria-label')).toContain('Open Details to include inline review comments');
});
