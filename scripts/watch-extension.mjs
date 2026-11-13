import { readdirSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
let running;
let pending = false;
let timer;
let stopping = false;
function build() {
  if (stopping) return;
  if (running) { pending = true; return; }
  running = spawn(process.execPath, [vite, 'build', '--mode', 'development', '--config', 'extension/vite.config.ts'], { cwd: root, stdio: 'inherit' });
  running.on('error', error => console.error('Could not start extension build:', error.message));
  running.on('close', code => {
    running = undefined;
    if (code) console.error('Build failed. Waiting for your next edit.');
    if (pending) { pending = false; build(); }
  });
}
function changed() { clearTimeout(timer); timer = setTimeout(build, 150); }
// A small polling set avoids native watcher limits and works with atomic editor saves.
const source = new URL('../extension/', import.meta.url);
function fingerprint() {
  const files = readdirSync(source).filter(file => /\.(?:ts|css|html|json|png)$/.test(file) && !file.endsWith('.test.ts')).map(file => new URL(file, source));
  files.push(new URL('../src/mainProcess/keys.ts', import.meta.url), new URL('../src/shared/purchaseLinks.ts', import.meta.url));
  return JSON.stringify(files.map(file => { const stat = statSync(file); return [file.href, stat.mtimeMs, stat.size]; }));
}
let previous = fingerprint();
const poller = setInterval(() => {
  try { const next = fingerprint(); if (next !== previous) { previous = next; changed(); } }
  catch { /* Editors may briefly replace files. Retry on the next tick. */ }
}, 750);
function stop() { stopping = true; clearInterval(poller); clearTimeout(timer); running?.kill(); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
console.log('Watching extension files. Load out/chrome-extension-dev in Chrome.');
build();
