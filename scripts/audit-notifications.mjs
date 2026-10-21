// Read-only behavioral audit: runs the actual notification manager with fake OS,
// storage, and timers. Findings describe existing defects, not passing guarantees.
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
  }
  const ipcMain = new EventEmitter();
  const modules = {
    electron: { Notification, ipcMain, app: { isReady: () => true } },
    'electron-log': { info() {}, warn() {}, error() {} },
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
  }, setInterval: () => 0, setTimeout: cb => { timers.push(cb); return 0; }, Date, Set, Promise });
  return { api: exports, shown, created, ipcMain, history: () => history, async drain() {
    await flush();
    for (let limit = 100; timers.length && limit > 0; limit--) { timers.shift()(); await flush(); }
  } };
}
const alert = (body, number = 1) => ({ title: 'Review update', body, type: 'review', source: { repository: 'example/repo', pullNumber: number } });
(async () => {
  const findings = [];
  {
    const h = harness(); h.api.batchNotificationManager([alert('A'), alert('B')]); await flush();
    h.api.batchNotificationManager([alert('C')]); await h.drain();
    findings.push({ scenario: 'A second batch preserves pending alerts', expected: ['A', 'B', 'C'], actual: h.shown.map(n => n.body.split('\n').at(-1)) });
  }
  {
    const h = harness(); h.api.batchNotificationManager([alert('Same title', 1), alert('Same title', 2)]); await h.drain();
    findings.push({ scenario: 'Distinct PRs with identical copy both notify', expected: 2, actual: h.shown.length });
  }
  {
    const h = harness(); h.api.batchNotificationManager([alert('A'), alert('B')]); await flush();
    await h.api.clearNotificationsOnSignOut(); await h.drain();
    findings.push({ scenario: 'Sign-out cancels pending private alerts', expected: [], actual: h.history().map(n => n.body) });
  }
  {
    const h = harness({ save: false }); let publications = 0;
    h.ipcMain.on('dispatch-notification-update', () => publications++);
    h.api.batchNotificationManager([alert('A')]); await h.drain();
    findings.push({ scenario: 'Failed persistence is not announced as saved history', expected: 0, actual: publications, storedRecords: h.history().length });
  }
  {
    const h = harness(); h.api.batchNotificationManager([alert('A')]); await h.drain();
    findings.push({ scenario: 'Native notification failure has a handler', expected: 1, actual: h.created[0].listenerCount('failed') });
  }
  console.log(JSON.stringify({ source: path.relative(process.cwd(), sourcePath), findings: findings.map(f => ({ ...f, reproduced: JSON.stringify(f.expected) !== JSON.stringify(f.actual) })) }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
