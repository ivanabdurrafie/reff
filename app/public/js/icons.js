// Inline SVG icons (22px, 2px stroke, round caps) — never text glyphs.
const S = (path) =>
  `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;

export const iconBack = S('<path d="M15 18l-6-6 6-6"/>');
export const iconForward = S('<path d="M9 18l6-6-6-6"/>');
export const iconSearch = S('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>');
export const iconDown = S('<path d="M6 9l6 6 6-6"/>');
