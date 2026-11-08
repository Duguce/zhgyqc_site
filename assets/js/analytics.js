/* The published site alone sends page visits; previews stay uncounted. */
(() => {
  const script = document.currentScript;
  if (!script || location.hostname !== script.dataset.analyticsHost) return;
  try {
    if (localStorage.getItem('site-analytics-opt-out') === 'true') return;
  } catch (_) { /* Storage may be disabled; counting still works without it. */ }
  let site;
  try { site = new URL(script.dataset.analyticsSite); } catch (_) { return; }
  if (site.protocol !== 'https:' || !/^[a-z0-9-]+\.goatcounter\.com$/.test(site.hostname)) return;
  const tracker = document.createElement('script');
  tracker.async = true;
  tracker.src = 'https://gc.zgo.at/count.js';
  tracker.dataset.goatcounter = `${site.origin}/count`;
  document.head.appendChild(tracker);
})();
