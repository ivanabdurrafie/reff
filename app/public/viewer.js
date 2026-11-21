// Lyrics viewer: line layout, focus hierarchy, auto-scroll.
// Layout values follow the Mochy Music lyric screen (32/40sp ratio, single weight,
// opacity + transform-scale focus) with the opacity floor raised to keep WCAG AA.

const FOCUS_SELECTOR = '.lyric-line';

function lineLook(el, center) {
  const r = el.getBoundingClientRect();
  return Math.abs((r.top + r.bottom) / 2 - center);
}

function markFocus(container) {
  const lines = container.querySelectorAll(FOCUS_SELECTOR);
  if (!lines.length) return;
  const center = window.innerHeight * 0.42;
  let best = lines[0];
  let bestD = Infinity;
  for (const el of lines) {
    const d = lineLook(el, center);
    if (d < bestD) {
      bestD = d;
      best = el;
    }
  }
  for (const el of lines) el.classList.toggle('is-focus', el === best);
}

function sectionLabel(text) {
  return /^\[[^\]]+\]$/.test(text.trim());
}

/** Render a song's lyrics into `container`. Returns cleanup fn. */
export function renderLyrics(container, song) {
  container.replaceChildren();
  container.setAttribute('aria-live', 'off');
  const frag = document.createDocumentFragment();
  const lines = String(song.lyrics || '').split(/\r?\n/);
  let lastWasBlank = true;
  for (const raw of lines) {
    const text = raw.trim();
    if (!text) {
      lastWasBlank = true;
      continue;
    }
    const el = document.createElement(sectionLabel(text) ? 'p' : 'p');
    if (sectionLabel(text)) {
      el.className = 'lyric-section';
      el.textContent = text.slice(1, -1);
    } else {
      el.className = 'lyric-line';
      el.textContent = text;
      if (!lastWasBlank) el.classList.add('lyric-cont');
      lastWasBlank = false;
    }
    frag.append(el);
  }
  if (!frag.childNodes.length) {
    const empty = document.createElement('p');
    empty.className = 'lyric-empty';
    empty.textContent = 'This pack has no lyric text for this song yet.';
    frag.append(empty);
  }
  // Scroll headroom as inner spacers, not CSS padding: flexbox cannot shrink
  // padding, so padded boxes overflow the viewer column (see styles.css).
  const headStart = document.createElement('div');
  headStart.className = 'lyric-headroom';
  const headEnd = document.createElement('div');
  headEnd.className = 'lyric-headroom-end';
  frag.prepend(headStart);
  frag.append(headEnd);
  container.append(frag);
  // Open with the first line already at the focus anchor (42% of the viewport)
  // instead of a full spacer of dead space above it. Clamps to 0 when the
  // content is shorter than the box.
  const first = container.querySelector('.lyric-line');
  if (first) {
    const r = first.getBoundingClientRect();
    container.scrollTop += (r.top + r.bottom) / 2 - window.innerHeight * 0.42;
  }
  markFocus(container);

  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      markFocus(container);
    });
  };
  container.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  return () => {
    container.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    if (raf) cancelAnimationFrame(raf);
  };
}

/**
 * Auto-scroll over `scroller`. Manual scroll (wheel/touch/keys) suspends until Resume.
 * Returns { start, pause, resume, stop, getState }. State: stopped | running | paused.
 */
export function createAutoScroll(scroller, { onStateChange } = {}) {
  let raf = 0;
  let last = 0;
  let speed = 30; // px/s
  let state = 'stopped';

  function setState(next) {
    if (state === next) return;
    state = next;
    onStateChange?.(state);
  }

  function step(ts) {
    if (state !== 'running') return;
    if (!last) last = ts;
    const dt = Math.min(0.064, (ts - last) / 1000);
    last = ts;
    scroller.scrollTop += speed * dt;
    const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    if (atEnd) {
      stop();
      return;
    }
    raf = requestAnimationFrame(step);
  }

  function start() {
    if (state === 'running') return;
    if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1) {
      scroller.scrollTop = 0;
    }
    last = 0;
    setState('running');
    raf = requestAnimationFrame(step);
  }

  function pause() {
    if (state !== 'running') return;
    cancelAnimationFrame(raf);
    raf = 0;
    setState('paused');
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    setState('stopped');
  }

  // Manual interaction suspends auto-scroll (PRD F8), not the programmatic scroll event.
  const suspend = () => {
    if (state === 'running') pause();
  };
  scroller.addEventListener('wheel', suspend, { passive: true });
  scroller.addEventListener('touchstart', suspend, { passive: true });
  scroller.addEventListener('keydown', suspend);

  return {
    start,
    pause,
    stop,
    resume: start,
    getState: () => state,
    setSpeed(pxPerSec) {
      speed = pxPerSec;
    },
    getSpeed: () => speed,
    destroy() {
      stop();
      scroller.removeEventListener('wheel', suspend);
      scroller.removeEventListener('touchstart', suspend);
      scroller.removeEventListener('keydown', suspend);
    },
  };
}

/** Font scale 0.75–1.5 of the root size, persisted. */
export function getFontScale() {
  const v = Number(localStorage.getItem('reff.fontScale'));
  return Number.isFinite(v) && v >= 0.75 && v <= 1.5 ? v : 1;
}

export function setFontScale(v) {
  const clamped = Math.min(1.5, Math.max(0.75, Math.round(v * 100) / 100));
  localStorage.setItem('reff.fontScale', String(clamped));
  applyFontScale(clamped);
  return clamped;
}

export function applyFontScale(scale = getFontScale()) {
  document.documentElement.style.setProperty('--font-scale', String(scale));
}
