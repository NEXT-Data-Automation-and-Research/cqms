/**
 * Navigation Helper — enables Ctrl+Click / Cmd+Click to open in new tab.
 *
 * Defines window.cqmsNav(url) which checks if Ctrl/Cmd was held on the
 * last mousedown. If so, opens in a new tab. Otherwise navigates normally.
 *
 * All window.location.href assignments should use cqmsNav(url) instead.
 * Auto-injected on all pages by the server middleware.
 */
(function () {
  'use strict';

  var ctrlHeld = false;

  document.addEventListener('mousedown', function (e) {
    ctrlHeld = e.ctrlKey || e.metaKey;
  }, true);

  document.addEventListener('keyup', function () {
    ctrlHeld = false;
  }, true);

  window.cqmsNav = function (url) {
    if (ctrlHeld) {
      ctrlHeld = false;
      window.open(url, '_blank');
    } else {
      window.location.href = url;
    }
  };
})();
