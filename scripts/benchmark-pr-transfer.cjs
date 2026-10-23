// Controlled transfer-cost benchmark; no GitHub access or user profile required.
const fs = require('node:fs');
const ts = require('typescript');
const { performance } = require('node:perf_hooks');
const { serialize } = require('node:v8');
const assert = require('node:assert/strict');
const source = fs.readFileSync('src/mainProcess/api/PullRequests/utils/rendererSnapshot.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exportsObject = {};
new Function('exports', compiled)(exportsObject);
const { rendererSnapshot } = exportsObject;
const prs = Array.from({ length: 2000 }, (_, index) => ({
  id: index + 1, number: index + 1, title: `Synthetic PR ${index + 1}`, body: 'x'.repeat(2048),
}));
const cache = {
  flatPullRequests: prs, pullRequestsPerRepo: { 'synthetic/repo': { 1: prs } },
  etagPerRepo: {}, pullRequestAddedOrRemoved: { added: [], removed: [] },
  reviewUpdateList: { newReview: [], reviewChanged: [] }, CIStatusUpdatePerRepo: {},
  mentions: {}, reviewCommentsPerRepo: {}, reviewPerRepoPerPullNumber: {}, actionsPerRepo: {},
};
function measure(project) {
  const times = [];
  let bytes;
  for (let i = 0; i < 120; i++) {
    const start = performance.now();
    const payload = project(cache);
    // Include both receiver copies, as with dashboard and menu-bar windows.
    const a = structuredClone(payload), b = structuredClone(payload);
    const elapsed = performance.now() - start;
    assert.equal(a.flatPullRequests.length, 2000);
    assert.equal(b.flatPullRequests.length, 2000);
    if (i >= 20) times.push(elapsed);
    bytes = serialize(payload).byteLength;
  }
  times.sort((a, b) => a - b);
  return { serializedBytes: bytes, medianMs: +times[50].toFixed(3), p95Ms: +times[95].toFixed(3) };
}
console.log(JSON.stringify({ node: process.version, pulls: prs.length, measuredIterations: 100,
  before: measure(value => value), after: measure(rendererSnapshot),
  limitation: 'Node structuredClone proxy for IPC copying; not Electron IPC or UI latency. Synthetic PR-heavy workload without discussions.'
}, null, 2));
