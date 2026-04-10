/**
 * Navigation Helper — enables Ctrl+Click / Cmd+Click to open in new tab.
 *
 * Overrides window.location.href assignment so that if Ctrl/Cmd was held
 * during the most recent click, the navigation opens in a new tab instead.
 *
 * Auto-injected on all pages by the server middleware.
 */
(function () {
  'use strict';

  // Track whether Ctrl/Meta was held on the last mousedown
  let ctrlHeld = false;

  document.addEventListener('mousedown', function (e) {
    ctrlHeld = e.ctrlKey || e.metaKey;
  }, true);

  // Reset after a short delay (in case no navigation happens)
  document.addEventListener('mouseup', function () {
    setTimeout(function () { ctrlHeld = false; }, 200);
  }, true);

  // Intercept window.location.href assignment
  const originalDescriptor = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href');
  if (originalDescriptor && originalDescriptor.set) {
    Object.defineProperty(window.location, 'href', {
      get: function () {
        return originalDescriptor.get.call(this);
      },
      set: function (url) {
        if (ctrlHeld) {
          ctrlHeld = false;
          window.open(url, '_blank');
        } else {
          originalDescriptor.set.call(this, url);
        }
      },
      configurable: true,
    });
  }
})();
