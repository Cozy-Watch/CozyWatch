// Read-only behavioral audit: runs the actual notification manager with fake OS,
// storage, and timers. Expected behavior is checked without real OS delivery.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
import { EventEmitter } from 'node:events';
import ts from 'typescript';
const sourcePath = path.resolve(scriptDirectory, '../src/mainProcess/notifications/notificationManager.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const flush = () => new Promise(resolve => setImmediate(resolve));
function harness({ save = true } = {}) {
  let history = [];
  const shown = [], timers = [], created = [];
  class Notification extends EventEmitter {
    constructor(options) { super(); this.options = options; created.push(this); }
    show() { shown.push(this.options); }
    close() { this.emit('close'); }
    static isSupported() { return true; }
  }
  const ipcMain = new EventEmitter();
  const modules = {
    electron: { Notification, ipcMain, app: { isReady: () => true } },
    'electron-log': { info() {}, warn() {}, error() {} },
    './getNotificationSettings': { getNotificationsSettings: async () => Object.fromEntries(['newReviewsNotification','reviewsUpdateNotification','ciStatusNotification','mentionsNotification','pullRequestsAddedNotification','pullRequestsRemovedNotification'].map(key => [key, { value: true }])) },
    '../licensing/licenseState': { getLicenseState: async () => ({ status: 'licensed' }) },
    '../licensing/licenseState.utils': { canUseDesktop: () => true },
    '../safeStorage/safeStorage': {
      getData: async () => history,
      storeData: async ({ data }) => { if (save) history = data; return save; },
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
    return modules[name];
  }, setInterval: () => 0, setTimeout: cb => { timers.push(cb); return cb; }, clearTimeout: cb => { const index = timers.indexOf(cb); if (index >= 0) timers.splice(index, 1); }, Date, Set, Map, Promise });
  return { setSaving: value => { save = value; }, api: exports, shown, created, ipcMain, history: () => history, async drain() {
    await flush();
    for (let limit = 100; timers.length && limit > 0; limit--) { timers.shift()(); await flush(); }
  } };
}
const alert = (body, number = 1) => ({ title: 'Review update', body, type: 'review', source: { repository: 'example/repo', pullNumber: number } });

const loadPure = (relativePath, modules = {}) => {
  const code = ts.transpileModule(fs.readFileSync(path.resolve(scriptDirectory, relativePath), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => { if (!(name in modules)) throw Error(`Unexpected module: ${name}`); return modules[name]; }, Date, Map, Set, Promise, URL });
  return exports;
};
(async () => {
  const findings = [];
  {
    const hooks = {};
    const budget = loadPure('../src/mainProcess/api/githubRequestBudget.ts', { '../../shared/repositoryKey': { repositoryKey: repo => `${repo.owner}/${repo.name}` } });
    budget.installGithubRequestBudget({ hook: { before: (_, fn) => { hooks.before = fn; }, after: (_, fn) => { hooks.after = fn; }, error: () => {} } });
    hooks.after({ url: 'https://api.github.com/rate_limit', headers: { 'x-ratelimit-resource': 'core', 'x-ratelimit-remaining': '5000', 'x-ratelimit-reset': String(Math.floor(Date.now()/1000)+3600) } }, { url: '/rate_limit' });
    hooks.after({ url: 'https://api.github.com/search/issues', headers: { 'x-ratelimit-resource': 'search', 'x-ratelimit-remaining': '29', 'x-ratelimit-reset': String(Math.floor(Date.now()/1000)+60) } }, { url: '/search/issues' });
    let blocked = false; try { hooks.before({ url: '/repos/org/repo/pulls/1/reviews' }); } catch (error) { blocked = error.status === 429; }
    findings.push({ scenario: 'Search quota must not block healthy core API requests', expected: false, actual: blocked });
  }
  {
    const h = harness(); await h.api.batchNotificationManager([alert('A'), alert('B')]); await flush();
    findings.push({ scenario: 'Accepted events are durable before native pacing / restart', expected: 2, actual: h.history().length });
    h.api.cancelPendingNotifications(); await h.drain();
    findings.push({ scenario: 'Cancelling native delivery should not erase unrelated accepted events from history', expected: 2, actual: h.history().length });
  }
  {
    const h = harness({ save: false }); h.api.batchNotificationManager([alert('retryable')]); await h.drain();
    h.setSaving(true); h.api.batchNotificationManager([alert('retryable')]); await h.drain();
    findings.push({ scenario: 'Failed persistence must allow immediate retry', expected: 1, actual: h.history().length });
  }
  {
    const { getCIStatusUpdate } = loadPure('../src/mainProcess/api/PullRequests/utils/getCIStatusUpdate.ts');
    const pr = { id: 1, number: 1, user: { id: 1 }, head: { sha: 'current-commit' } };
    const base = { name: 'build', workflow_id: 4, created_at: '2026-10-20T10:00:00Z', pull_requests: [{ id: 1, number: 1 }] };
    const old = { ...base, id: 10, head_sha: 'old-commit', conclusion: null, updated_at: '2026-10-20T10:01:00Z' };
    const current = { ...base, id: 11, head_sha: 'current-commit', conclusion: 'failure', updated_at: '2026-10-20T10:02:00Z' };
    const cache = runs => ({ pullRequestsPerRepo: { 'org/repo': { 1: [pr] } }, actionsPerRepo: { 'org/repo': runs } });
    const changes = getCIStatusUpdate({ repositoryName: 'org/repo', userId: 1, initialCache: cache([old, current]), finalCache: cache([{ ...old, conclusion: 'success', updated_at: '2026-10-20T10:03:00Z' }, current]) });
    findings.push({ scenario: 'A late old-commit success must not override current failing CI', expected: [], actual: Object.values(changes).map(change => ({ sha: change.finalRun.head_sha, conclusion: change.finalRun.conclusion })) });
  }
  if (findings.some(f => JSON.stringify(f.expected) !== JSON.stringify(f.actual))) process.exitCode = 1;
  console.log(JSON.stringify({ findings: findings.map(f => ({ ...f, passed: JSON.stringify(f.expected) === JSON.stringify(f.actual) })) }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
