// Hash router: #/ , #/pack/:id , #/song/:id
// Unknown hashes fall back to home (never 404 on GitHub Pages).

export function parseHash(hash) {
  const h = String(hash || '').replace(/^#\/?/, '');
  if (!h) return { name: 'home', params: {} };
  const parts = h.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'pack' && parts[1]) {
    return { name: 'setlist', params: { id: parts[1] } };
  }
  if (parts[0] === 'song' && parts[1]) {
    return { name: 'lyrics', params: { id: parts[1] } };
  }
  return { name: 'home', params: {} };
}

export function navigate(to) {
  const next = to.startsWith('#') ? to : `#${to}`;
  if (location.hash === next) {
    // same hash — still notify (idempotent re-entry)
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  location.hash = next;
}

export function onRoute(handler) {
  const run = () => handler(parseHash(location.hash));
  addEventListener('hashchange', run);
  run();
}
