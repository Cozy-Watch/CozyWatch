import type icons from './icons.json';
export type IconName = keyof typeof icons;
export function icon(name: IconName, className = ''): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('class', `octicon ${className}`);
  svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(svg.namespaceURI, 'use');
  use.setAttribute('href', `icons.svg#${name}`); svg.append(use);
  return svg;
}
