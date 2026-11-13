/// <reference types="chrome" />
import { LICENSE_URL, CUSTOMER_ORDERS_URL, PURCHASE_HELP_URL, OPEN_SOURCE_CONTACT_URL } from '../src/shared/purchaseLinks';
import { icon, type IconName } from './icons';
import { githubUrl, type Command, type PublicState, type Reply, type PullSummary, type Activity } from './model';

type View = 'home' | 'settings' | 'license' | 'pat';
type Feed = 'reviews' | 'mine' | 'mentions';
const root = document.getElementById('root')!;
let state: PublicState = { connected: false, notifications: false };
let view: View = 'home';
let feed: Feed = 'reviews';
const openDetails = new Set<number>();
const loadingDetails = new Set<number>();
let busy = false;
let notice = '';
let timer: ReturnType<typeof setTimeout> | undefined;
let polling = false;
let stateRevision = 0;
let sessionRevision = 0;
let stateRead: Promise<void> | undefined;
let pendingActions = 0;
let stateUpdateRequested = false;
let refreshingState = false;
let renderedScreen = '';
function visualState(value: PublicState) {
  return JSON.stringify([value.connected, value.notifications, value.error, value.license, value.auth, value.snapshot]);
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}
function button(text: string, action: () => void, className = 'button') {
  const node = element('button', text, className);
  node.type = 'button'; node.disabled = busy;
  node.addEventListener('click', action);
  return node;
}
function link(text: string, url: string, className = 'text-link') {
  const node = element('a', text, className);
  node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer';
  return node;
}
function navigate(next: View) { view = next; notice = ''; document.body.scrollTop = 0; document.documentElement.scrollTop = 0; render(); }
function hero(title: string, description: string) {
  const section = element('div', '', 'hero');
  section.append(element('h2', title), element('p', description, 'secondary'));
  return section;
}
function row(...nodes: HTMLElement[]) {
  const node = element('div', '', 'row'); node.append(...nodes); return node;
}
function footer(...nodes: HTMLElement[]) {
  const node = element('footer'); node.append(...nodes); return node;
}
function back(label: string, next: View) { const control = button(label, () => navigate(next), 'text-link back'); control.prepend(icon('back')); return control; }
function daysLeft() { return Math.max(0, Math.ceil(((state.license?.trialEnd ?? Date.now()) - Date.now()) / 86400000)); }

function send(command: Command, quiet = false): Promise<void> {
  if (command.type !== 'state') return performSend(command, quiet);
  if (stateRead) return stateRead;
  stateRead = performSend(command, quiet).finally(() => { stateRead = undefined; });
  return stateRead;
}
async function performSend(command: Command, quiet: boolean) {
  if (command.type === 'poll-auth' && polling) return;
  if (['disconnect', 'reset-vault', 'cancel-auth'].includes(command.type)) sessionRevision++;
  const session = sessionRevision;
  const isPoll = command.type === 'poll-auth';
  if (isPoll) polling = true;
  const revision = stateRevision;
  const before = visualState(state);
  if (!quiet) { pendingActions++; busy = true; notice = ''; render(); }
  try {
    const reply = await chrome.runtime.sendMessage<Command, Reply>(command);
    if (session !== sessionRevision) return;
    if (!reply.ok) throw new Error(reply.error);
    // A delayed cached read must not restore the code screen after auth has completed.
    if (command.type === 'state' && revision !== stateRevision) return;
    if (command.type !== 'state') stateRevision++;
    state = reply.state;
    if ((command.type === 'connect' || command.type === 'poll-auth') && state.connected) view = 'home';
    if (command.type === 'disconnect' || command.type === 'reset-vault') view = 'home';
    if (command.type === 'license' && state.license?.status === 'licensed') notice = 'Your lifetime license is active.';
    if (command.type === 'clear-cache') notice = 'Cached activity cleared. Your connection and license are unchanged.';
  } catch (error) {
    if (session !== sessionRevision) return;
    if (command.type === 'state' && revision !== stateRevision) return;
    state = { ...state, error: error instanceof Error ? error.message : 'Extension unavailable. Try reopening Cozy Watch.' };
  } finally {
    if (isPoll) polling = false;
    if (!quiet) pendingActions--;
    busy = pendingActions > 0;
    if (!quiet || before !== visualState(state) || !root.childElementCount) render();
    schedule();
  }
}
function schedule() {
  if (!state.auth || state.connected) { clearTimeout(timer); timer = undefined; return; }
  if (timer || polling) return;
  // Keep the deadline stable: unrelated storage updates must not postpone sign-in polling.
  timer = setTimeout(() => { timer = undefined; void send({ type: 'poll-auth' }, true); }, Math.max(5000, state.auth.interval));
}
function inputForm(labelText: string, placeholder: string, submitText: string, submit: (value: string) => void) {
  const form = element('form', '', 'stack');
  const label = element('label', labelText, 'field');
  const input = element('input');
  input.type = 'password'; input.placeholder = placeholder; input.autocomplete = 'off';
  input.spellcheck = false; input.required = true; input.maxLength = 512;
  label.append(input);
  const submitButton = element('button', submitText, 'button primary');
  submitButton.type = 'submit'; submitButton.disabled = busy;
  form.append(label, submitButton);
  form.addEventListener('submit', event => {
    event.preventDefault(); const value = input.value; input.value = ''; submit(value);
  });
  return form;
}
function header() {
  const node = element('header');
  const brand = element('div', '', 'brand');
  const brandIcon = element('img'); brandIcon.src = 'icon.png'; brandIcon.alt = ''; brandIcon.width = 23; brandIcon.height = 23;
  brand.append(brandIcon, element('h1', 'Cozy Watch'));
  const isHome = view === 'home';
  const control = button('', () => navigate(isHome ? 'settings' : 'home'), 'icon-button');
  control.setAttribute('aria-label', isHome ? 'Settings' : 'Back to your day');
  control.append(icon(isHome ? 'settings' : 'close'));
  node.append(brand, control);
  return node;
}
function connectScreen() {
  root.append(hero('See what needs you. Then get back to work.', 'Reviews, replies, and your pull requests. One quiet place in your toolbar.'));
  const options = element('div', '', 'connection-options');
  const option = (title: string, description: string, glyph: IconName, action: () => void) => {
    const control = button('', action, 'connection-option');
    const symbol = icon(glyph, 'option-symbol');
    const copy = element('span', '', 'option-copy'); copy.append(element('strong', title), element('span', description, 'secondary'));
    const arrow = icon('chevron', 'chevron');
    control.append(symbol, copy, arrow);
    return control;
  };
  options.append(
    option('Connect with GitHub', 'Quick setup with your GitHub account.', 'github', () => void send({ type: 'start-auth', method: 'oauth' })),
    option('GitHub App', 'Choose which repositories to share.', 'app', () => void send({ type: 'start-auth', method: 'github-app' })),
    option('Personal access token', 'Use a token you manage yourself.', 'key', () => navigate('pat')),
  );
  root.append(options, footer(
    element('p', '14 days free · No card required', 'muted'),
    button('Already bought Cozy Watch? Enter your key', () => navigate('license'), 'text-link'),
    element('p', 'Windows, macOS and Linux · No desktop app required', 'muted'),
    element('p', 'Credentials encrypted in this Chrome profile.', 'muted'),
  ));
}
function tokenScreen() {
  root.append(back('Connection options', 'home'), hero('Your token. Your repository access.', 'Paste a GitHub token with read access to the repositories you want to follow.'));
  root.append(inputForm('Personal access token', 'github_pat_…', 'Connect GitHub', token => void send({ type: 'connect', token })));
  const details = element('details');
  details.append(element('summary', 'Which permissions do I need?'), element('p', 'Read access to pull requests, issues, and repository metadata. A classic token needs repo access for private repositories. Organization approval may be required.', 'secondary'));
  root.append(details, link('Create a token on GitHub ↗', 'https://github.com/settings/personal-access-tokens'), footer(element('p', 'Encrypted locally. Never sent to a Cozy Watch server.', 'muted')));
}
function authScreen() {
  const auth = state.auth!;
  if (auth.verifying) {
    root.append(hero('GitHub approved your sign-in.', 'Finishing your account verification. Your authorization is saved securely; you do not need another code.'), button('Retry verification', () => void send({ type: 'poll-auth' })), button('Cancel sign-in', () => void send({ type: 'cancel-auth' }), 'text-link'));
    return;
  }
  root.append(hero('One last step on GitHub.', 'Copy this code, then enter it on GitHub to connect your account.'));
  root.append(element('p', 'The CODE badge means sign-in is waiting. Reopen Cozy Watch anytime to find your code.', 'muted'));
  const code = element('div', '', 'verification-code');
  code.append(element('strong', auth.userCode), button('Copy code', () => {
    void navigator.clipboard.writeText(auth.userCode).then(() => { notice = 'Code copied.'; render(); }, () => { notice = 'Copy unavailable. Select the code and copy it manually.'; render(); });
  }, 'text-link'));
  const steps = element('ol', '', 'steps');
  steps.append(element('li', 'Check you’re signed into the right GitHub account.'), element('li', 'Paste the code and approve access.'));
  root.append(code, link('Continue on GitHub ↗', 'https://github.com/login/device', 'button primary'), steps,
    footer(element('p', `Waiting for authorization · expires ${new Date(auth.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 'muted'), button('Cancel sign-in', () => void send({ type: 'cancel-auth' }), 'text-link')));
}
function licenseScreen() {
  root.append(back('Settings', 'settings'), hero('One purchase. Desktop and browser.', 'Already have a lifetime license? Use the same key here.'));
  const license = state.license;
  const panel = element('div', '', `license-status${license?.status === 'licensed' ? ' success' : ''}`);
  let title = '14-day full-feature trial';
  let description = 'Starts when GitHub connects successfully.';
  if (license?.status === 'licensed') { title = 'Lifetime license active'; description = 'Desktop + browser. No renewal.'; }
  if (license?.status === 'trial' && license.trialEnd) { title = `${daysLeft()} days left in your trial`; description = `All features available until ${new Date(license.trialEnd).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}.`; }
  if (license?.status === 'revoked') { title = 'License disabled'; description = 'Enter another key or contact purchase help.'; }
  if (license?.status === 'trial-ended') { title = 'Your trial has ended'; description = 'Buy or activate a lifetime license to resume monitoring.'; }
  panel.append(element('strong', title), element('p', description, 'secondary'));
  root.append(panel);
  const form = () => inputForm('License key', 'Paste your lifetime key', 'Activate license', key => void send({ type: 'license', key }));
  if (license?.status === 'licensed') {
    const replace = element('details'); replace.append(element('summary', 'Use another license key'), form()); root.append(replace);
  } else root.append(form());
  root.append(element('hr'), row(element('p', 'Don’t have a license yet?', 'secondary'), link('Buy Cozy Watch ↗', LICENSE_URL, 'button subtle')),
    row(link('Find my purchase', CUSTOMER_ORDERS_URL), link('Purchase help', PURCHASE_HELP_URL)),
    footer(element('p', 'Browser use doesn’t consume a Mac activation.', 'muted'), link('Working on open source? Let’s talk.', OPEN_SOURCE_CONTACT_URL)));
}
function trialEndedScreen() {
  root.append(element('p', 'Your trial has ended', 'eyebrow'), hero('Keep your next move within reach.', 'Get a lifetime license to resume GitHub monitoring in your toolbar.'));
  root.append(element('p', 'Your GitHub connection and preferences are saved. Nothing needs setting up again.', 'notice'));
  root.append(link('Buy Cozy Watch · $29 ↗', LICENSE_URL, 'button primary'), button('Enter an existing license key', () => navigate('license')),
    footer(element('p', 'Pay once · Personal and commercial use', 'muted'), element('p', 'Desktop + Chrome · Future desktop updates included', 'muted'), link('Need help with a purchase?', PURCHASE_HELP_URL)));
}
function setting(title: string, description: string, control: HTMLElement) {
  const node = element('div', '', 'setting');
  const copy = element('div'); copy.append(element('strong', title), element('p', description, 'muted'));
  node.append(copy, control); return node;
}
async function downloadDiagnostics() {
  await send({ type: 'state' }, true);
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: chrome.runtime.getManifest().version, events: state.diagnostics ?? [] }, null, 2)], { type: 'application/json' }));
  const download = element('a'); download.href = url; download.download = 'cozy-watch-diagnostics.json'; download.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function settingsScreen() {
  root.append(row(element('h2', 'Settings'), back('Your day', 'home')));
  const alerts = element('section'); alerts.append(element('h3', 'Alerts', 'section-label'));
  alerts.append(setting('Review badge', 'Reviews waiting for you in the toolbar.', element('span', 'Always on', 'muted')));
  const label = element('label', '', 'setting');
  const copy = element('span'); copy.append(element('strong', 'Desktop notifications'), element('span', 'Optional alerts. Private details stay hidden.', 'muted'));
  const check = element('input'); check.type = 'checkbox'; check.checked = state.notifications; check.disabled = busy;
  check.addEventListener('change', () => void send({ type: 'notifications', enabled: check.checked }));
  label.append(copy, check); alerts.append(label); root.append(alerts);
  const account = element('section'); account.append(element('h3', 'Account & license', 'section-label'));
  if (state.connected) {
    const disconnect = element('details', '', 'disconnect'); disconnect.append(element('summary', 'Disconnect'),
      element('p', 'Remove local GitHub credentials and cached activity? Your license stays in place. Access on GitHub is not revoked.', 'secondary'),
      button('Disconnect GitHub', () => void send({ type: 'disconnect' }), 'button subtle'));
    account.append(setting(state.snapshot ? `@${state.snapshot.login}` : 'GitHub connected', 'Credentials encrypted in this Chrome profile.', disconnect));
  }
  const title = state.license?.status === 'licensed' ? 'Lifetime license' : state.license?.status === 'trial' && state.license.trialEnd ? `${daysLeft()} trial days left` : 'License options';
  account.append(setting(title, 'Desktop + browser extension', button('Manage ›', () => navigate('license'), 'text-link'))); root.append(account);
  const storage = element('details'); storage.append(element('summary', 'Storage & diagnostics'),
    element('p', 'Clear activity without signing out. Diagnostics contain timestamps and fixed event codes only. Review before sharing; nothing is uploaded automatically.', 'secondary'),
    button('Clear cached activity', () => void send({ type: 'clear-cache' }), 'button subtle'), button('Download diagnostics', downloadDiagnostics, 'text-link'));
  const recovery = element('details'); recovery.append(element('summary', 'Secure storage recovery'),
    element('p', 'Only use if secure storage cannot be unlocked. This removes locally saved GitHub and license credentials. Your trial date stays in place. Reconnect and enter your license again.', 'secondary'),
    button('Reset secure storage', () => void send({ type: 'reset-vault' }), 'button subtle'));
  storage.append(recovery); root.append(storage, footer(link('Manage GitHub access ↗', 'https://github.com/settings/applications'), element('p', 'Your data stays in this Chrome profile.', 'muted')));
}
function age(value: string) {
  const elapsed = Date.now() - Date.parse(value);
  if (!Number.isFinite(elapsed)) return '';
  const minutes = Math.max(0, Math.floor(elapsed / 60000));
  return minutes < 1 ? 'Just updated' : minutes < 60 ? `Updated ${minutes}m ago` : minutes < 1440 ? `Updated ${Math.floor(minutes / 60)}h ago` : `Updated ${Math.floor(minutes / 1440)}d ago`;
}
function pullRow(item: PullSummary) {
  const url = githubUrl(item.url); if (!url) return null;
  const card = element('article', '', 'pull-card');
  card.append(row(element('span', `${item.repository} · #${item.number}`, 'muted repository'), element('span', age(item.updatedAt), 'muted updated')));
  const heading = link('', url, 'task');
  const copy = element('span', '', 'task-copy'); copy.append(element('strong', item.title));
  heading.append(icon(item.draft ? 'draft' : 'pull', 'task-symbol'), copy); card.append(heading);
  const metadata = element('div', '', 'card-metadata');
  if (item.author) metadata.append(element('span', `@${item.author}`, 'muted'));
  const discussionComments = item.details?.discussionComments ?? item.comments;
  const reviewComments = item.details?.reviewComments;
  const completeCount = item.details?.discussionComments !== undefined && reviewComments !== undefined;
  if (discussionComments !== undefined) {
    const total = completeCount ? discussionComments + reviewComments : discussionComments;
    const label = `${total} ${completeCount ? '' : 'discussion '}${total === 1 ? 'comment' : 'comments'}`;
    const count = element('span', label, 'muted comment-count');
    count.title = completeCount ? `${discussionComments} discussion ${discussionComments === 1 ? 'comment' : 'comments'} and ${reviewComments} inline review ${reviewComments === 1 ? 'comment' : 'comments'}.` : 'Discussion comments only. Open Details to include inline review comments.';
    count.setAttribute('aria-label', `${label}. ${count.title}`);
    count.prepend(icon('comment')); metadata.append(count);
  }
  const statuses = element('div', '', 'card-statuses');
  if (item.draft) statuses.append(element('span', 'Draft', 'status-chip'));
  if (feed === 'reviews') statuses.append(element('span', 'Your review requested', 'status-chip'));
  for (const label of item.labels ?? []) statuses.append(element('span', label, 'status-chip'));
  if (item.details) {
    if (item.details.mergeConflict === true) {
      const warning = element('span', 'Merge conflicts', 'status-chip'); warning.dataset.conflict = 'true'; statuses.append(warning);
    }
    const ciLabels = { passing: 'CI passing', failed: 'CI failed', pending: 'CI running', none: 'No CI reported', unavailable: 'CI unavailable' };
    const chip = element('span', ciLabels[item.details.ci], 'status-chip'); chip.dataset.ci = item.details.ci; statuses.append(chip);
    if (item.details.approvals !== undefined) statuses.append(element('span', `${item.details.approvals} ${item.details.approvals === 1 ? 'approval' : 'approvals'}${item.details.reviewsPartial ? ' (partial)' : ''}`, 'status-chip'));
    if (item.details.changesRequested) statuses.append(element('span', `${item.details.changesRequested} changes requested`, 'status-chip'));
  }
  card.append(metadata, statuses);
  const expanded = openDetails.has(item.id);
  const toggle = button(loadingDetails.has(item.id) ? 'Loading details…' : expanded ? 'Hide details' : 'Details', () => {
    if (openDetails.has(item.id)) { openDetails.delete(item.id); render(); return; }
    openDetails.add(item.id);
    if (item.details && Date.now() - item.details.checkedAt < 5 * 60000) { render(); return; }
    loadingDetails.add(item.id); render();
    void send({ type: 'pull-details', id: item.id }, true).finally(() => { loadingDetails.delete(item.id); render(); });
  }, 'text-link details-toggle');
  toggle.setAttribute('aria-expanded', String(expanded)); toggle.setAttribute('aria-controls', `pull-${item.id}-details`);
  toggle.disabled = loadingDetails.has(item.id);
  card.append(toggle);
  if (expanded) {
    const details = element('div', '', 'pull-details'); details.id = `pull-${item.id}-details`;
    if (item.details) {
      const data = item.details;
      details.append(element('p', `${data.head} → ${data.base}`, 'branch-line'), element('p', `${data.files} ${data.files === 1 ? 'file' : 'files'} · +${data.additions} / −${data.deletions}`, 'muted'));
      if (data.mergeConflict === true) details.append(element('p', 'Resolve merge conflicts on GitHub before merging.', 'secondary'));
      else if (data.mergeConflict !== false) details.append(element('p', 'Merge-conflict status unavailable. Check GitHub before merging.', 'muted'));
      if (data.reviewers.length) details.append(element('p', `Review requested: ${data.reviewers.join(', ')}`, 'muted'));
      if (data.reviewsPartial) details.append(element('p', 'Some reviews could not be checked. Review counts may be incomplete.', 'muted'));
      details.append(element('p', age(new Date(data.checkedAt).toISOString()), 'muted'));
    } else details.append(element('p', loadingDetails.has(item.id) ? 'Fetching PR details from GitHub…' : 'Details unavailable. Close and reopen to retry.', 'muted'));
    card.append(details);
  }
  return card;
}
function activityRow(item: Activity) {
  const url = githubUrl(item.url); if (!url) return null;
  const node = link('', url, 'activity');
  const avatar = element('span', '', 'avatar'); avatar.append(icon(item.reason === 'mention' ? 'mention' : 'reply'));
  node.append(avatar, element('span', item.title));
  return node;
}
function activityScreen() {
  const snapshot = state.snapshot;
  if (!snapshot) {
    root.append(hero('GitHub connected.', state.error ? 'Try refreshing to load your activity.' : 'Your activity will appear as soon as the first sync finishes.'), button('Refresh activity', () => void send({ type: 'refresh' }), 'button primary')); return;
  }
  const reviewComplete = snapshot.reviewsTruncated === false || (!snapshot.truncated && !snapshot.reviewsTruncated);
  const cleared = !snapshot.reviews.length && reviewComplete && !state.error && Date.now() - Date.parse(snapshot.checkedAt) < 5 * 60000;
  root.append(row(element('h2', feed === 'mine' ? 'Your pull requests.' : feed === 'mentions' ? 'Mentions for you.' : cleared ? 'You have some breathing room.' : 'Here’s what needs you.'), button('', () => void send({ type: 'refresh' }), 'icon-button refresh')));
  root.querySelector('.refresh')?.append(icon('refresh'));
  root.querySelector('.refresh')?.setAttribute('aria-label', 'Refresh activity');
  const tabs = element('div', '', 'tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'GitHub activity');
  const mentions = snapshot.activity.filter(item => item.reason === 'mention');
  const entries: [Feed, string, number][] = [['reviews', 'Review', snapshot.reviews.length], ['mine', 'My PRs', snapshot.mine.length], ['mentions', 'Mentions', mentions.length]];
  for (const [value, label, count] of entries) {
    const tab = button('', () => { feed = value; render(); root.querySelector<HTMLButtonElement>(`[data-feed="${value}"]`)?.focus(); }, 'tab');
    tab.id = `tab-${value}`; tab.dataset.feed = value;
    tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(feed === value)); tab.setAttribute('aria-controls', 'activity-feed');
    tab.append(element('span', label), element('span', String(count), 'count')); tabs.append(tab);
  }
  tabs.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = entries.findIndex(([value]) => value === feed);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
    feed = entries[next][0]; render(); root.querySelector<HTMLButtonElement>(`[data-feed="${feed}"]`)?.focus();
  });
  root.append(tabs);
  const panel = element('section'); panel.id = 'activity-feed'; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', `tab-${feed}`);
  if (feed === 'reviews' && cleared) {
    const success = element('div', '', 'quiet-success'); success.append(icon('check', 'success-mark'), element('h3', 'Your review queue is clear.'), element('p', 'No one is waiting on your review.', 'secondary')); panel.append(success);
  }
  if (feed === 'mentions') {
    for (const item of mentions) { const node = activityRow(item); if (node) panel.append(node); }
    if (!mentions.length) panel.append(element('p', snapshot.activityLoading && !state.error ? 'Checking conversations for mentions…' : state.error ? 'Mentions could not be updated. Try refreshing.' : snapshot.truncated ? 'No mentions in the available sample. Some conversations were not checked.' : 'No mentions in the conversations checked.', 'secondary'));
  } else {
    const items = feed === 'mine' ? snapshot.mine : snapshot.reviews;
    for (const item of items) { const node = pullRow(item); if (node) panel.append(node); }
    if (!items.length && !(feed === 'reviews' && cleared)) panel.append(element('p', feed === 'reviews' ? 'No review requests in the last available results.' : state.error || snapshot.truncated ? 'No items in the last available results.' : 'No open pull requests.', 'secondary'));
  }
  root.append(panel);
  const conversations = element('section'); conversations.append(element('h3', 'Recent conversations', 'section-label'));
  if (snapshot.activityLoading && !state.error) conversations.append(element('p', 'Updating conversations…', 'muted'));
  for (const item of snapshot.activity.slice(0, 4)) { const node = activityRow(item); if (node) conversations.append(node); }
  if (!snapshot.activity.length && !snapshot.activityLoading) conversations.append(element('p', state.error ? 'Conversations could not be updated. Try refreshing.' : snapshot.truncated ? 'No conversations in the available sample.' : 'No new mentions or replies in the conversations checked.', 'secondary'));
  if (feed !== 'mentions') root.append(element('hr'), conversations);
  const updated = new Date(snapshot.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  root.append(footer(element('p', `@${snapshot.login} · Updated ${updated}`, 'muted'),
    ...(snapshot.truncated ? [element('p', 'Showing a limited activity sample. Some conversations may be missing.', 'muted')] : []),
    ...(state.license?.status === 'trial' ? [button(`${daysLeft()} trial days left · License options`, () => navigate('license'), 'text-link')] : [])));
}
function render() {
  const screen = JSON.stringify([view, state.connected, state.license?.status, state.auth?.userCode]);
  const active = document.activeElement instanceof HTMLInputElement ? document.activeElement : undefined;
  const form = !busy && screen === renderedScreen ? active?.closest('form') : undefined;
  const selection = active && form ? [active.selectionStart, active.selectionEnd] : undefined;
  renderedScreen = screen;
  const scroll = document.documentElement.scrollTop || document.body.scrollTop;
  root.replaceChildren(header()); root.setAttribute('aria-busy', String(busy));
  if (busy || notice) { const status = element('p', busy ? 'Working…' : notice, 'status'); status.setAttribute('role', 'status'); root.append(status); }
  if (state.error) { const alert = element('p', state.error, 'error'); alert.setAttribute('role', 'alert'); root.append(alert); }
  if (view === 'settings') settingsScreen();
  else if (view === 'license') licenseScreen();
  else if (state.connected && state.license?.status === 'trial-ended') trialEndedScreen();
  else if (state.connected && state.license?.status === 'revoked') licenseScreen();
  else if (state.connected) activityScreen();
  else if (state.auth) authScreen();
  else if (view === 'pat') tokenScreen();
  else connectScreen();
  if (form && active) {
    const replacement = root.querySelector('form');
    if (replacement) {
      replacement.replaceWith(form); active.focus({ preventScroll: true });
      if (selection) active.setSelectionRange(selection[0], selection[1]);
    }
  }
  document.body.scrollTop = scroll;
}
void send({ type: 'state' }, true).then(() => {
  if (state.auth && !state.connected) void send({ type: 'poll-auth' }, true);
  else if (state.connected) void send({ type: 'refresh' }, true);
});
async function refreshPublicState() {
  stateUpdateRequested = true;
  if (refreshingState) return;
  refreshingState = true;
  try {
    while (stateUpdateRequested) {
      stateUpdateRequested = false;
      await send({ type: 'state' }, true);
    }
  } finally { refreshingState = false; }
}
chrome.storage?.onChanged?.addListener((changes, area) => {
  if (area === 'local' && ['snapshot', 'notifications', 'error', 'trialEnd'].some(key => key in changes)) void refreshPublicState();
});
window.addEventListener('pagehide', () => clearTimeout(timer));
