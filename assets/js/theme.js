(function () {
  'use strict';

  var root = document.documentElement;
  var media = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

  function preference() {
    return root.dataset.themePreference || 'system';
  }

  function syncGiscus() {
    var theme = root.dataset.theme;
    var script = document.querySelector('script[src="https://giscus.app/client.js"]');
    if (script) script.dataset.theme = theme;
    document.querySelectorAll('iframe.giscus-frame').forEach(function (frame) {
      if (frame.contentWindow) {
        frame.contentWindow.postMessage({ giscus: { setConfig: { theme: theme } } }, 'https://giscus.app');
      }
    });
  }

  function apply(value, save) {
    var chosen = value === 'light' || value === 'dark' ? value : 'system';
    var resolved = chosen === 'system' ? (media && media.matches ? 'dark' : 'light') : chosen;
    root.dataset.themePreference = chosen;
    root.dataset.theme = resolved;
    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      var currentName = chosen === 'system' ? button.dataset.themeSystem :
        chosen === 'dark' ? button.dataset.themeDark : button.dataset.themeLight;
      var nextName = resolved === 'dark' ? button.dataset.themeLight : button.dataset.themeDark;
      var label = button.dataset.themeLabel + ': ' + currentName + ' · ' + button.dataset.themeAction + ' ' + nextName;
      button.setAttribute('aria-label', label);
      button.title = label;
    });
    if (save) {
      try {
        if (chosen === 'system') localStorage.removeItem('site-theme');
        else localStorage.setItem('site-theme', chosen);
      } catch (_) {}
    }
    syncGiscus();
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
    button.addEventListener('click', function () {
      apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    });
  });
  apply(preference(), false);

  if (media) {
    var onSystemChange = function () {
      if (preference() === 'system') apply('system', false);
    };
    if (media.addEventListener) media.addEventListener('change', onSystemChange);
    else if (media.addListener) media.addListener(onSystemChange);
  }

  var comments = document.getElementById('giscus-comments');
  if (comments && window.MutationObserver) {
    new MutationObserver(syncGiscus).observe(comments, { childList: true, subtree: true });
  }
}());
