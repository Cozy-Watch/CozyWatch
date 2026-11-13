// Reuse the desktop's MIT-licensed Octicons as static paths, without shipping React.
import { createRequire } from 'node:module';
import { writeFileSync, copyFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const octicons = require('@primer/octicons-react');
const names = { settings: 'GearIcon', close: 'XIcon', github: 'MarkGithubIcon', app: 'AppsIcon', key: 'KeyIcon', chevron: 'ChevronRightIcon', back: 'ArrowLeftIcon', refresh: 'SyncIcon', pull: 'GitPullRequestIcon', draft: 'GitPullRequestDraftIcon', mention: 'MentionIcon', reply: 'ReplyIcon', check: 'CheckCircleIcon', comment: 'CommentIcon' };
const icons = Object.fromEntries(Object.entries(names).map(([name, component]) => {
  const svg = renderToStaticMarkup(React.createElement(octicons[component], { size: 16 }));
  const paths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(match => match[1]);
  if (!paths.length) throw new Error(`No paths for ${component}`);
  return [name, { viewBox: svg.match(/viewBox="([^"]+)"/)[1], paths }];
}));
writeFileSync(new URL('../extension/icons.json', import.meta.url), JSON.stringify(icons, null, 2) + '\n');
copyFileSync(new URL('../node_modules/@primer/octicons-react/LICENSE', import.meta.url), new URL('../extension/icons.LICENSE', import.meta.url));
