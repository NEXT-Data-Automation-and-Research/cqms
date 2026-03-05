# Subresource Integrity (SRI)

SRI ensures third-party scripts (e.g. CDN) have not been tampered with by requiring a cryptographic hash in the `integrity` attribute.

## How to add SRI

1. **Get the hash** of the script you want to load:
   - Download the exact script URL (same version as in your HTML).
   - Compute SHA-384: `openssl dgst -sha384 -binary script.js | openssl base64 -A`
   - Or use an online tool / `srihash.org` for the exact URL (ensure you pin the URL with version).

2. **Add to your script tag**:
   ```html
   <script
     src="https://cdn.example.com/lib@1.2.3/min.js"
     integrity="sha384-<base64-hash>"
     crossorigin="anonymous"
   ></script>
   ```

3. **Pin versions**: Always use a versioned CDN URL (e.g. `chart.js@4.4.0`) so the hash stays valid. If the CDN updates the file, update the hash.

## Scripts to consider (this project)

| Script | Typical location | Note |
|--------|------------------|------|
| Tailwind CDN | `audit-reports.html`, others | Use versioned URL; add integrity when stable. |
| Chart.js | `audit-reports.html` | e.g. `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js` — add integrity. |
| Quill, Supabase, DOMPurify | Various HTML | Import maps / ESM — add integrity to each resolved script if possible. |

## Limitation

- **Dynamic / version-changing CDNs**: If you use a URL without a version (e.g. `latest`), SRI hashes will break when the file changes. Prefer versioned URLs and update the hash when you upgrade.
- **CSP**: SRI complements CSP; both improve security.

## Example (Chart.js)

```bash
# Download and hash (replace URL with your exact versioned URL)
curl -sL "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" | openssl dgst -sha384 -binary | openssl base64 -A
```

Then in HTML:

```html
<script
  src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
  integrity="sha384-<output-from-above>"
  crossorigin="anonymous"
></script>
```

## Checklist

- [ ] Use versioned URLs for all third-party scripts.
- [ ] Add `integrity` and `crossorigin="anonymous"` for each.
- [ ] Recompute hashes when upgrading library versions.
