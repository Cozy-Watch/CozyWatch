import { notificationBatch, type NotificationBaseline } from './notification-baseline';
import { UserFacingError, HttpError } from './network';
/// <reference types="chrome" />
import { type Command, type Diagnostic, type PublicState, type Reply, type Snapshot } from './model';
import { fetchSnapshot, github } from './github';
import { fetchPullDetails } from './pull-details';
import { readSecret, removeSecret, resetVault, writeSecret } from './vault';
import { startDevice, pollDevice, rotate, DeviceAuthorizationEnded, type Credential, type DeviceFlow } from './auth';
import { validateLicense, type License } from './license';
const ALARM = 'cozy-watch-refresh';
const TTL = 86400000;
const AUTH_POLL = 'cozy-watch-auth-poll';
const AUTH_EXPIRY = 'cozy-watch-auth-expiry';
const ready = Promise.all([
  chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
]).then(async () => {
  // Old preview credentials were plaintext. Remove them; never silently carry that format forward.
  await chrome.storage.local.remove('token'); await chrome.storage.session.remove('token');
});
let queue: Promise<unknown> = Promise.resolve();
let controller = new AbortController();
let generation = 0;
function serial<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.catch(() => undefined).then(work); queue = result.then(() => undefined, () => undefined); return result;
}
function cancel() { generation++; controller.abort(); controller = new AbortController(); }
function current(epoch: number) { if (epoch !== generation) throw new UserFacingError('Operation cancelled.'); }
async function activeCredential(epoch: number, signal: AbortSignal, known?: Credential): Promise<Credential | undefined> {
  const saved = known ?? await readSecret<Credential>('github'); current(epoch);
  if (!saved?.expiresAt || saved.expiresAt >= Date.now() + 60000) return saved;
  const updated = await rotate(saved, signal); current(epoch);
  await writeSecret('github', updated); current(epoch);
  return updated;
}
async function licenseState(): Promise<NonNullable<PublicState['license']>> {
  const license = await readSecret<License>('license');
  const { trialEnd } = await chrome.storage.local.get<{ trialEnd?: number }>('trialEnd');
  if (license) return { status: license.status, checkedAt: license.checkedAt };
  return { status: !trialEnd || Date.now() < trialEnd ? 'trial' : 'trial-ended', trialEnd };
}
async function diagnostic(code: Diagnostic['code']) {
  const { diagnostics = [] } = await chrome.storage.local.get<{ diagnostics?: Diagnostic[] }>('diagnostics');
  await chrome.storage.local.set({ diagnostics: [...diagnostics, { at: new Date().toISOString(), code }].slice(-200) });
}
async function state(epoch = generation): Promise<PublicState> {
  const [flow, credential, license] = await Promise.all([readSecret<DeviceFlow>('device'), readSecret<Credential>('github'), licenseState()]);
  current(epoch);
  // Secure storage can be slow. Read live activity last so replies cannot roll back a newer refresh.
  const { snapshot, notifications = false, error, diagnostics } = await chrome.storage.local.get<{ snapshot?: Snapshot; notifications?: boolean; error?: string; diagnostics?: Diagnostic[] }>(['snapshot', 'notifications', 'error', 'diagnostics']);
  current(epoch);
  const fresh = snapshot && Date.now() - Date.parse(snapshot.checkedAt) < TTL;
  return { connected: Boolean(credential), snapshot: fresh ? snapshot : undefined, notifications, error, diagnostics,
    license, auth: flow && (flow.credential || flow.expiresAt > Date.now()) ? { verifying: Boolean(flow.credential), method: flow.method, userCode: flow.userCode, expiresAt: flow.expiresAt, interval: flow.interval } : undefined };
}
async function authBadge() {
  await chrome.action.setBadgeText({ text: 'CODE' });
  await chrome.action.setBadgeBackgroundColor({ color: '#6551a8' });
  await chrome.action.setTitle({ title: 'Cozy Watch — GitHub sign-in waiting. Open to copy your verification code.' });
}
async function clearAuthorization(error?: string) {
  await removeSecret('device');
  await chrome.alarms.clear(AUTH_POLL); await chrome.alarms.clear(AUTH_EXPIRY);
  await chrome.action.setBadgeText({ text: error ? '!' : '' });
  await chrome.action.setTitle({ title: error ? 'Cozy Watch — GitHub sign-in needs attention.' : 'Cozy Watch' });
  if (error) await chrome.storage.local.set({ error });
}
async function resumeAuthorization() {
  const flow = await readSecret<DeviceFlow>('device');
  if (!flow) {
    await chrome.alarms.clear(AUTH_POLL); await chrome.alarms.clear(AUTH_EXPIRY);
    if (await chrome.action.getBadgeText({}) === 'CODE') {
      await chrome.action.setBadgeText({ text: '' }); await chrome.action.setTitle({ title: 'Cozy Watch' });
    }
    return;
  }
  if (!flow.credential && flow.expiresAt <= Date.now()) { await clearAuthorization('GitHub sign-in code expired. Start again.'); return; }
  await authBadge();
  if (!(await chrome.alarms.get(AUTH_POLL))) await chrome.alarms.create(AUTH_POLL, { periodInMinutes: 0.5 });
  await chrome.alarms.create(AUTH_EXPIRY, { when: Math.max(Date.now() + 30000, flow.expiresAt) });
}
async function commitCredential(credential: Credential, epoch: number, signal: AbortSignal) {
  const identity = await github<{ login: string }>(credential.token, '/user', signal);
  if (!/^[a-z\d-]+$/i.test(identity.login)) throw new UserFacingError('Unexpected GitHub identity.');
  current(epoch);
  await writeSecret('github', credential); current(epoch);
  await clearAuthorization();
  await chrome.storage.local.remove(['snapshot', 'error', 'baseline']);
  const { trialEnd } = await chrome.storage.local.get('trialEnd');
  if (!trialEnd) await chrome.storage.local.set({ trialEnd: Date.now() + 14 * TTL });
  await diagnostic('connected');
}
async function pruneCache() {
  const { snapshot } = await chrome.storage.local.get<{ snapshot?: Snapshot }>('snapshot');
  if (snapshot && (!Number.isFinite(Date.parse(snapshot.checkedAt)) || Date.now() - Date.parse(snapshot.checkedAt) >= TTL || new TextEncoder().encode(JSON.stringify(snapshot)).length > 500_000)) await chrome.storage.local.remove('snapshot');
}
async function refresh() {
  const epoch = generation; const signal = controller.signal;
  await ready; current(epoch); await pruneCache(); current(epoch);
  let credential = await readSecret<Credential>('github');
  current(epoch);
  if (!credential) return;
  const license = await readSecret<License>('license');
  if (license?.status === 'licensed' && Date.now() - license.checkedAt > TTL) {
    // An outage is never revocation. Only a successful, authoritative validation changes entitlement.
    try { const checked = await validateLicense(license.key, signal); current(epoch); await writeSecret('license', checked); }
    catch { if (signal.aborted) return; await diagnostic('license-unavailable'); }
  }
  const access = await licenseState();
  if (access.status === 'trial-ended' || access.status === 'revoked') { await chrome.action.setBadgeText({ text: '!' }); return; }
  credential = await activeCredential(epoch, signal, credential);
  if (!credential) return;
  const previous = await chrome.storage.local.get<{ baseline?: NotificationBaseline; snapshot?: Snapshot; notifications?: boolean }>(['baseline', 'snapshot', 'notifications']);
  const startedAt = Math.floor(Date.now() / 1000) * 1000;
  const snapshot = await fetchSnapshot(credential.token, signal, async queues => {
    current(epoch);
    const partial = { ...queues, activity: previous.snapshot?.login === queues.login ? previous.snapshot.activity : [] };
    if (new TextEncoder().encode(JSON.stringify(partial)).length > 500_000) throw new UserFacingError('Cache limit reached. Saved data was preserved.');
    await chrome.storage.local.set({ snapshot: partial });
  }); current(epoch);
  if (new TextEncoder().encode(JSON.stringify(snapshot)).length > 500_000) throw new UserFacingError('Cache limit reached. Saved data was preserved.');
  const { changes, next } = notificationBatch(previous.baseline, snapshot, startedAt);
  await chrome.storage.local.set({ snapshot, baseline: next });
  await chrome.storage.local.remove('error');
  await chrome.action.setBadgeText({ text: snapshot.reviews.length ? `${snapshot.reviews.length}${snapshot.reviewsTruncated ? '+' : ''}` : snapshot.reviewsTruncated ? '·' : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#6551a8' });
  const { notifications = false } = await chrome.storage.local.get<{ notifications?: boolean }>('notifications');
  if (notifications && changes.length) {
    await chrome.notifications.create('cozy-activity', { type: 'basic', iconUrl: 'icon.png', title: 'Cozy Watch', message: 'New GitHub activity needs your attention. Open Cozy Watch to see it.' }).catch(() => undefined);
  }
}
async function safelyRefresh() {
  const epoch = generation;
  try { await refresh(); }
  catch (error) { if (epoch !== generation) return; await diagnostic('refresh-failed');
    const { snapshot } = await chrome.storage.local.get<{ snapshot?: Snapshot }>('snapshot');
    if (snapshot?.activityLoading) await chrome.storage.local.set({ snapshot: { ...snapshot, activityLoading: false, truncated: true } });
    await chrome.storage.local.set({ error: error instanceof UserFacingError ? error.message : 'Refresh failed. Check your connection or reconnect GitHub if access expired. Saved data is preserved.' }); await chrome.action.setBadgeText({ text: '!' }); }
}
async function handle(command: Command, epoch: number): Promise<PublicState> {
  await ready; current(epoch);
  const signal = controller.signal;
  if (command.type === 'state') return state(epoch);
  if (command.type === 'disconnect' || command.type === 'reset-vault') {
    if (command.type === 'reset-vault') await resetVault();
    else await removeSecret('github');
    await clearAuthorization();
    await chrome.storage.local.remove(['snapshot', 'error', 'baseline']);
    await chrome.notifications.clear('cozy-activity'); await chrome.action.setBadgeText({ text: '' });
    await diagnostic('disconnected');
  } else if (command.type === 'cancel-auth') { await clearAuthorization(); await chrome.storage.local.remove('error'); }
  else if (command.type === 'start-auth' && ['oauth', 'github-app'].includes(command.method)) {
    if (await readSecret<Credential>('github')) throw new UserFacingError('Disconnect the current account before switching.');
    const flow = await startDevice(command.method, signal); current(epoch); await writeSecret('device', flow);
    await chrome.storage.local.remove('error');
    await resumeAuthorization();
  } else if (command.type === 'poll-auth') {
    const flow = await readSecret<DeviceFlow>('device');
    if (flow) {
      try {
        let verified = flow.credential;
        if (verified?.expiresAt && verified.expiresAt <= Date.now() + 60000) {
          if (!verified.refreshToken || (verified.refreshExpiresAt && verified.refreshExpiresAt <= Date.now())) throw new DeviceAuthorizationEnded('GitHub authorization expired. Start a fresh sign-in.');
          const updated = await rotate(verified, signal); current(epoch);
          await writeSecret('device', { ...flow, credential: updated });
          verified = updated;
        }
        const result = verified ?? await pollDevice(flow, signal); current(epoch);
        if ('token' in result) {
          // Preserve the exchanged token before /user can fail; retry verification, not exchange.
          if (!flow.credential) await writeSecret('device', { ...flow, credential: result });
          current(epoch);
          await commitCredential(result, epoch, signal);
          // Reply with the connected state before the first (potentially slow) activity sync.
          void serial(safelyRefresh).catch(() => undefined);
        }
        else { await writeSecret('device', result); await authBadge(); }
      } catch (error) {
        current(epoch);
        if (error instanceof HttpError && error.status === 401) { await clearAuthorization('GitHub authorization was revoked or expired. Start a fresh sign-in.'); return state(epoch); }
        if (!(error instanceof DeviceAuthorizationEnded)) throw error;
        await clearAuthorization(error.message);
      }
    }
  } else if (command.type === 'connect') {
    if (await readSecret<Credential>('github')) throw new UserFacingError('Disconnect the current account before switching.');
    if (typeof command.token !== 'string' || !/^[A-Za-z0-9_]{20,512}$/.test(command.token.trim())) throw new UserFacingError('Enter a valid GitHub token.');
    await commitCredential({ token: command.token.trim(), method: 'pat' }, epoch, signal); await safelyRefresh();
  } else if (command.type === 'pull-details') {
    const access = await licenseState();
    if (['trial-ended', 'revoked'].includes(access.status)) throw new UserFacingError('Activate a license to resume GitHub monitoring.');
    const { snapshot } = await chrome.storage.local.get<{ snapshot?: Snapshot }>('snapshot');
    const item = snapshot && [...snapshot.mine, ...snapshot.reviews].find(item => item.id === command.id);
    if (!item || !snapshot || Date.now() - Date.parse(snapshot.checkedAt) > TTL) throw new UserFacingError('Refresh activity before loading this pull request.');
    if (item.details && Date.now() - item.details.checkedAt < 5 * 60000) return state(epoch);
    const credential = await activeCredential(epoch, signal);
    if (!credential) throw new UserFacingError('Reconnect GitHub to load details.');
    const details = await fetchPullDetails(credential.token, item, signal); current(epoch);
    const update = (items: Snapshot['mine']) => items.map(pull => pull.id === item.id ? { ...pull, details } : pull);
    const next = { ...snapshot, mine: update(snapshot.mine), reviews: update(snapshot.reviews) };
    if (new TextEncoder().encode(JSON.stringify(next)).length > 500_000) throw new UserFacingError('Cache limit reached. Refresh activity and try again.');
    await chrome.storage.local.set({ snapshot: next });
  } else if (command.type === 'license') {
    if (typeof command.key !== 'string' || !/^[a-z\d-]{10,200}$/i.test(command.key.trim())) throw new UserFacingError('Enter a valid license key.');
    const license = await validateLicense(command.key.trim(), signal); current(epoch);
    if (license.status !== 'licensed') throw new UserFacingError('Invalid, expired, or disabled lifetime license. Check your key or contact purchase help.');
    await writeSecret('license', license); await safelyRefresh();
  } else if (command.type === 'notifications' && typeof command.enabled === 'boolean') await chrome.storage.local.set({ notifications: command.enabled });
  else if (command.type === 'clear-cache') await chrome.storage.local.remove('snapshot');
  else if (command.type === 'refresh') {
    const { snapshot, error } = await state(epoch);
    if (error || !snapshot || snapshot.activityLoading || Date.now() - Date.parse(snapshot.checkedAt) >= 30000) await safelyRefresh();
  } else throw new UserFacingError('Invalid request.');
  current(epoch); return state(epoch);
}
chrome.runtime.onMessage.addListener((message: unknown, sender, respond: (reply: Reply) => void) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html') || !message || typeof message !== 'object' || !('type' in message)) return false;
  if (typeof message.type !== 'string' || !['state', 'refresh', 'disconnect', 'cancel-auth', 'poll-auth', 'clear-cache', 'reset-vault', 'connect', 'start-auth', 'license', 'notifications', 'pull-details'].includes(message.type)) return false;
  const command = message as Command;
  if (command.type === 'disconnect' || command.type === 'cancel-auth' || command.type === 'reset-vault') cancel();
  const epoch = generation;
  // Cached reads never wait behind GitHub. Destructive operations invalidate requests immediately,
  // then join the write queue so no late credential write can survive disconnect.
  const work = command.type === 'state' ? ready.then(() => state(epoch)) : command.type === 'notifications' && typeof command.enabled === 'boolean'
    ? ready.then(async () => { current(epoch); await chrome.storage.local.set({ notifications: command.enabled }); return state(epoch); })
    : serial(() => handle(command, epoch));
  void work.then(result => respond({ ok: true, state: result }), error => respond({ ok: false, error: error instanceof UserFacingError ? error.message : 'Could not complete this action. Check access, your key, or your connection. Your saved credentials were not reset.' }));
  return true;
});
async function ensureAlarm() {
  await ready;
  if (!(await chrome.alarms.get(ALARM))) await chrome.alarms.create(ALARM, { periodInMinutes: 5 });
}
chrome.alarms.onAlarm.addListener(alarm => {
  if ([AUTH_POLL, AUTH_EXPIRY].includes(alarm.name)) {
    void serial(() => handle({ type: 'poll-auth' }, generation)).catch(() => undefined); return;
  }
  if (alarm.name === ALARM) void serial(safelyRefresh).catch(() => undefined);
});
chrome.runtime.onStartup.addListener(() => { void ensureAlarm().then(() => serial(async () => { await resumeAuthorization(); await safelyRefresh(); })).catch(() => undefined); });
chrome.runtime.onInstalled.addListener(() => { void ensureAlarm().then(() => serial(resumeAuthorization)).catch(() => undefined); });
chrome.notifications.onClicked.addListener(id => { if (id === 'cozy-activity') void chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') }); });
void ensureAlarm().then(() => serial(resumeAuthorization)).catch(() => undefined);
