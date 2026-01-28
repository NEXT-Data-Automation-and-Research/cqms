# Console Logs – Silencing Without Code Changes

Console output across the app is silenced by a **global stub** instead of removing `console.log` (and similar) from source files. This avoids touching 60+ files and 2500+ calls, and prevents accidental breakage.

## How It Works

1. **`/public/js/console-stub.js`** – A small script that runs first on every app page. It replaces `console.log`, `console.debug`, `console.info`, `console.warn`, and `console.error` with no-op functions so nothing is printed.
2. **First script in `<head>`** – Each app HTML page includes this script as the first script in `<head>`, so it runs before any other script (including inline and modules). All later code sees the stubbed `console`.

No page or feature code was changed; only one new file and one `<script>` line per HTML page were added.

## Re-enabling Console for Debugging

To see console output again (e.g. while debugging):

- **URL:** Add `?debug=true` to the page URL (e.g. `https://yourapp.com/home?debug=true`).
- **Persistent:** In the browser console (or any script), run:  
  `localStorage.setItem('CQMS_DEBUG', '1')`  
  then reload. To turn off: `localStorage.removeItem('CQMS_DEBUG')`.

When either condition is true, the stub does nothing and the real `console` is used.

## Scope

- **Browser only** – The stub runs in the browser. Server-side code (Node/API) is unchanged; use your normal logging (e.g. `logger`, env level) there.
- **All app pages** – Any HTML page that loads the app (auth-checker, feature pages, etc.) includes the stub so console is silenced everywhere.

## Removing Logs from Source (Optional)

If you later want to remove `console.*` calls from the codebase (e.g. via a build step or gradual cleanup), you can do that independently. The stub will continue to silence any remaining calls until then.
