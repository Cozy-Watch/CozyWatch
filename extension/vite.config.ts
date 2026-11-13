import { defineConfig } from 'vite';
import icons from './icons.json';
import { fileURLToPath } from 'node:url';
import { copyFileSync, readdirSync, statSync, writeFileSync, renameSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig(({ mode }) => {
  const development = mode === 'development';
  const output = fileURLToPath(new URL(`../out/chrome-extension${development ? '-dev' : ''}/`, import.meta.url));
  let background = '';
  return {
    root, base: './', publicDir: false, plugins: [{
      name: 'extension-assets',
      transformIndexHtml: development ? { order: 'pre', handler: () => [{ tag: 'script', attrs: { type: 'module', src: './dev-reload.ts' }, injectTo: 'body' as const }] } : undefined,
      renderChunk(code, chunk) {
        if (!development || chunk.facadeModuleId?.replaceAll('\\', '/') !== `${root}worker.ts`.replaceAll('\\', '/')) return null;
        background = createHash('sha256').update(code).digest('hex');
        return { code: `${code}\nchrome.runtime.onMessage.addListener((message,sender,reply)=>{if(sender.id===chrome.runtime.id&&sender.url===chrome.runtime.getURL('popup.html')&&message?.type==='cozy-dev-revision'){reply(${JSON.stringify(background)});return false;}});`, map: null };
      },
      writeBundle() {
        const bytes = readdirSync(output, { recursive: true }).filter(file => String(file).endsWith('.js')).reduce((sum, file) => sum + statSync(`${output}${file}`).size, 0);
        if (bytes > (development ? 52_000 : 50_000)) throw new Error(`Extension JavaScript budget exceeded: ${bytes} bytes`);
        copyFileSync(`${root}manifest.json`, `${output}manifest.json`);
        copyFileSync(`${root}icons.LICENSE`, `${output}THIRD_PARTY_NOTICES.txt`);
        const symbols = Object.entries(icons).map(([name, data]) => `<symbol id="${name}" viewBox="${data.viewBox}">${data.paths.map(d => `<path d="${d}"/>`).join('')}</symbol>`).join('');
        writeFileSync(`${output}icons.svg`, `<svg xmlns="http://www.w3.org/2000/svg">${symbols}</svg>`);
        for (const size of [16, 32, 48, 128]) copyFileSync(`${root}assets/icon${size}.png`, `${output}icon${size}.png`);
        copyFileSync(`${root}assets/icon128.png`, `${output}icon.png`);
        if (development) {
          // Publish the marker last and atomically: never reload a partially written bundle.
          writeFileSync(`${output}dev-revision.tmp`, JSON.stringify({ build: randomUUID(), background }));
          renameSync(`${output}dev-revision.tmp`, `${output}dev-revision.json`);
        }
      },
    }],
    build: { outDir: output, emptyOutDir: true, sourcemap: false,
      rollupOptions: { input: { popup: `${root}popup.html`, worker: `${root}worker.ts` },
        output: { entryFileNames: '[name].js', chunkFileNames: 'assets/[name]-[hash].js' } },
    },
  };
});
