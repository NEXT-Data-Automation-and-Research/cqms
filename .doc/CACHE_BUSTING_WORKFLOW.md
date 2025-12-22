# Cache Busting Workflow

## Overview

This system ensures users always see the latest version of your website without browser cache conflicts. It uses a multi-layer approach combining HTTP headers, versioned URLs, and automatic update detection.

## How It Works

### 1. **Build-Time Version Generation**

When you run `npm run build`, the system:

1. **Generates a unique version** (`src/utils/version.ts`):
   - Combines package version + timestamp
   - Creates a short hash (8 characters) for URLs
   - Saves to `public/version.json`

2. **Example version.json**:
   ```json
   {
     "version": "1.0.0-1764932285112",
     "timestamp": 1764932285112,
     "hash": "bab7635d",
     "buildTime": "2025-12-05T10:58:05.112Z",
     "packageVersion": "1.0.0"
   }
   ```

### 2. **HTML Processing**

The server automatically:

1. **Injects version into HTML** (`src/utils/html-processor.ts`):
   - Adds version query parameter to all JS/CSS files
   - Example: `js/app.js` → `js/app.js?v=bab7635d`
   - Adds `<meta name="app-version">` tag to HTML

2. **Cache headers**:
   - **HTML files**: `no-cache, no-store, must-revalidate` (always fresh)
   - **Static assets**: `max-age=31536000, immutable` (cached forever with version)

### 3. **Client-Side Update Detection**

The browser automatically:

1. **Checks for updates** every 5 minutes
2. **Checks when tab becomes visible** (user returns)
3. **Prompts user** to reload if new version detected
4. **Uses `/api/version` endpoint** to compare versions

## Workflow Steps

### Development Workflow

```bash
# 1. Make changes to your code
# Edit files in src/

# 2. Build (generates new version automatically)
npm run build

# 3. Start server
npm run serve

# OR use dev mode (auto-rebuilds on changes)
npm run dev
```

### Deployment Workflow

```bash
# 1. Build for production
npm run build

# 2. Deploy the following:
#    - public/ (all static files)
#    - dist/ (server files)
#    - package.json
#    - node_modules/ (or install on server)

# 3. Start server
npm start
```

### What Happens on Each Build

1. **Version Generation**:
   ```
   [Version] Build version: 1.0.0-1764932285112 (bab7635d)
   [Version] Build time: 2025-12-05T10:58:05.112Z
   ```

2. **Version File Created**: `public/version.json`

3. **HTML Files Updated**:
   - Asset URLs get `?v=bab7635d` appended
   - Meta tag added: `<meta name="app-version" content="bab7635d">`

4. **Server Loads Version**: Logs `App version: bab7635d` on startup

## User Experience

### First Visit
- User loads page → Gets latest HTML with versioned assets
- Browser caches assets with version in URL
- Version stored in meta tag

### Subsequent Visits
- HTML always fetched fresh (no-cache headers)
- Assets loaded from cache (if version matches) or fetched new
- Background check for updates every 5 minutes

### When You Deploy Update
1. **New build** generates new version hash
2. **User's next HTML request** gets new version
3. **Asset URLs change** (different `?v=` parameter)
4. **Browser fetches new assets** (old ones stay cached but unused)
5. **Update prompt** appears after 5 minutes or when tab becomes visible

## File Structure

```
migration/
├── src/
│   ├── utils/
│   │   ├── version.ts          # Generates version on build
│   │   └── html-processor.ts   # Injects version into HTML
│   └── server-commonjs.ts       # Server with cache headers
├── public/
│   ├── version.json            # Generated version info
│   ├── index.html              # Gets version injected
│   └── js/                     # Assets get versioned URLs
└── package.json                # Build scripts
```

## API Endpoints

### `GET /api/version`
Returns current app version information:
```json
{
  "version": "1.0.0-1764932285112",
  "timestamp": 1764932285112,
  "hash": "bab7635d",
  "buildTime": "2025-12-05T10:58:05.112Z",
  "packageVersion": "1.0.0"
}
```

## Cache Strategy Summary

| File Type | Cache Headers | Strategy |
|-----------|--------------|----------|
| HTML | `no-cache, no-store` | Always fetch fresh |
| JS/CSS | `max-age=31536000, immutable` | Cache forever (versioned URLs) |
| Images | `max-age=31536000, immutable` | Cache forever (versioned URLs) |
| API | `no-cache` | Always fetch fresh |

## Benefits

✅ **No stale content** - HTML always fresh  
✅ **Fast loading** - Assets cached efficiently  
✅ **Automatic updates** - Users notified of new versions  
✅ **Zero manual intervention** - Works automatically  
✅ **Version tracking** - Easy to see what's deployed  

## Troubleshooting

### Version not updating?
- Check `public/version.json` exists and has new timestamp
- Verify server restarted after build
- Check browser console for version check errors

### Assets not loading?
- Check version query parameter is in URLs
- Verify cache headers are set correctly
- Check browser network tab for 404 errors

### Update prompt not appearing?
- Check `/api/version` endpoint works
- Verify meta tag exists in HTML
- Check browser console for JavaScript errors

