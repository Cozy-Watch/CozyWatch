/// <reference types="chrome" />
// Included only in the development build. No server, extra permissions, or relaxed CSP.
interface Revision { build: string; background: string }
let previous: string | undefined;
let checking = false;
let stopped = false;
async function check() {
  if (checking || stopped) return;
  checking = true;
  try {
    const response = await fetch(chrome.runtime.getURL('dev-revision.json'), { cache: 'no-store' });
    if (!response.ok) return;
    const revision = await response.json() as Revision;
    const active = await chrome.runtime.sendMessage({ type: 'cozy-dev-revision' }) as string;
    if (active !== revision.background) { stopped = true; chrome.runtime.reload(); return; }
    if (previous && previous !== revision.build) { stopped = true; window.location.reload(); return; }
    previous = revision.build;
  } catch { /* A rebuild/reload can briefly remove the file or message receiver. Retry. */ }
  finally { checking = false; }
}
const timer = setInterval(() => void check(), 1000);
window.addEventListener('pagehide', () => { stopped = true; clearInterval(timer); });
void check();
