# Deployment Steps - Pushing a New Version

## Quick Reference

When you want to push a new version to production, follow these steps:

## Step-by-Step Process

### 1. **Make Your Changes**
```bash
# Edit your source files
# - src/**/*.ts
# - src/**/*.html
# - src/styles/**/*.css
# etc.
```

### 2. **Test Locally (Optional but Recommended)**
```bash
# Build and test locally
npm run build
npm run serve

# Or use dev mode for testing
npm run dev
```

### 3. **Build for Production**
```bash
npm run build
```

**What this does:**
- ✅ Generates new version hash (e.g., `c1561c32` → `a7f3b9e1`)
- ✅ Creates/updates `public/version.json`
- ✅ Compiles TypeScript → JavaScript
- ✅ Compiles CSS
- ✅ Compiles server code

**Output you'll see:**
```
[Version] Build version: 1.0.0-1764932359373 (c1561c32)
[Version] Build time: 2025-12-05T10:59:19.373Z
```

### 4. **Verify Build Output**
```bash
# Check version was generated
cat public/version.json

# Should show new timestamp and hash
```

### 5. **Deploy Files**

Upload/Deploy the following to your server:

**Required Files:**
```
✅ public/              (all static files)
   ├── index.html
   ├── styles.css
   ├── js/              (compiled JavaScript)
   ├── version.json     (NEW - contains version info)
   └── ...

✅ dist/                (server files)
   └── server-commonjs.js

✅ package.json
✅ node_modules/        (or run npm install on server)
```

**Optional (if using):**
```
✅ .env                 (environment variables)
✅ src/                 (if serving auth-page.html from src/)
```

### 6. **Restart Server**
```bash
# On your server
npm start

# OR if using PM2/systemd/etc
pm2 restart your-app
# or
systemctl restart your-app
```

### 7. **Verify Deployment**

**Check Server Logs:**
```
[Server] App version: a7f3b9e1  ← Should show NEW hash
[Server] Server running on http://localhost:4000
```

**Test in Browser:**
1. Visit your website
2. Open DevTools → Network tab
3. Check HTML response headers:
   - `Cache-Control: no-cache, no-store, must-revalidate` ✅
   - `ETag: "a7f3b9e1"` ✅
4. Check HTML source:
   - Asset URLs have `?v=a7f3b9e1` ✅
   - Meta tag: `<meta name="app-version" content="a7f3b9e1">` ✅

## Complete Example Workflow

```bash
# 1. Make changes to your code
vim src/app.ts
# ... make changes ...

# 2. Build new version
npm run build

# Output:
# [Version] Build version: 1.0.0-1764932450000 (a7f3b9e1)
# [Version] Build time: 2025-12-05T11:00:50.000Z

# 3. Verify version file
cat public/version.json
# Shows: "hash": "a7f3b9e1"

# 4. Deploy (example with rsync)
rsync -avz public/ dist/ package.json server:/path/to/app/

# 5. On server: Install dependencies (if needed)
ssh server
cd /path/to/app
npm install --production

# 6. Restart server
npm start
# OR
pm2 restart app

# 7. Check logs
# Should see: [Server] App version: a7f3b9e1
```

## What Happens to Users

### User with Old Version (c1561c32)
1. **Next HTML request** → Gets new HTML with `v=a7f3b9e1`
2. **Browser sees new asset URLs** → `js/app.js?v=a7f3b9e1`
3. **Fetches new assets** (old cached assets ignored)
4. **After 5 minutes** → Update prompt appears
5. **User reloads** → Gets fully updated version

### User Already on Site
1. **Background check** (every 5 minutes) detects new version
2. **Prompt appears**: "New version available. Reload?"
3. **User clicks "Yes"** → Page reloads with new version
4. **Or user switches tabs** → Check runs immediately

## Important Notes

### ✅ DO:
- Always run `npm run build` before deploying
- Deploy `public/version.json` (it's generated, not in git)
- Restart server after deployment
- Verify version in server logs

### ❌ DON'T:
- Don't skip the build step
- Don't manually edit `version.json`
- Don't forget to restart server
- Don't deploy without `version.json`

## Troubleshooting

### Version Not Updating?

**Check:**
```bash
# 1. Is version.json deployed?
cat public/version.json

# 2. Is server restarted?
# Check logs for: [Server] App version: ...

# 3. Is version.json being served?
curl http://your-site.com/api/version
```

### Users Not Getting Updates?

**Check:**
1. Server logs show new version? ✅
2. `/api/version` returns new hash? ✅
3. HTML has correct meta tag? ✅
4. Asset URLs have `?v=` parameter? ✅

### Build Fails?

```bash
# Clean and rebuild
rm -rf dist/ public/js/*.js public/version.json
npm run build
```

## Automated Deployment (Optional)

You can automate this with a script:

```bash
#!/bin/bash
# deploy.sh

echo "Building..."
npm run build

echo "Deploying..."
# Your deployment command here
# rsync, scp, git push, etc.

echo "Restarting server..."
# Your restart command here
# pm2 restart, systemctl restart, etc.

echo "Deployment complete!"
```

## Summary

**Minimum Steps:**
1. `npm run build` ← Generates new version
2. Deploy files ← Upload to server
3. Restart server ← Loads new version

That's it! The cache-busting system handles the rest automatically.

