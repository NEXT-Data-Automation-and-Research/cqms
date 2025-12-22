# Deployment Guide - How to Update Your Website

## What This Guide Is For

When you make changes to your website and want users to see them, you need to "deploy" (push) a new version. This guide shows you exactly how to do that.

## Why You Need This

Your website has a smart system that prevents users from seeing old, cached versions. Every time you update, you need to follow these steps so users get the latest version automatically.

---

## The Simple 3-Step Process

### Step 1: Build Your Changes
**What to do:** Run this command:
```bash
npm run build
```

**What it does:**
- Takes all your code changes
- Creates a new "version number" (like a timestamp)
- Prepares everything for the server
- Shows you a message like: `[Version] Build version: 1.0.0-1234567890 (abc12345)`

**When to do it:** Every time you want to deploy changes

---

### Step 2: Upload Files to Your Server
**What to do:** Copy these folders/files to your server:

**Required:**
- ✅ `public/` folder (contains all website files)
- ✅ `dist/` folder (contains server code)
- ✅ `package.json` file
- ✅ `node_modules/` folder (or run `npm install` on server)

**How to do it:**
- Use FTP, SFTP, or any file transfer tool
- Or use command line: `scp`, `rsync`, etc.
- Or use Git and pull on server

**Important:** Make sure `public/version.json` is included! (This file is created automatically when you build)

---

### Step 3: Restart Your Server
**What to do:** Restart your server application

**How to do it:**
```bash
# If using npm directly:
npm start

# If using PM2:
pm2 restart your-app-name

# If using systemd:
sudo systemctl restart your-app-name

# If using Docker:
docker restart your-container-name
```

**How to check it worked:**
Look at your server logs. You should see:
```
[Server] App version: abc12345
```
(The version number should match what you saw in Step 1)

---

## Complete Example

Let's say you just fixed a bug. Here's what you do:

```bash
# 1. Build the new version
npm run build

# Output you'll see:
# [Version] Build version: 1.0.0-1764932450000 (a7f3b9e1)
# [Version] Build time: 2025-12-05T11:00:50.000Z

# 2. Upload files (example using rsync)
rsync -avz public/ dist/ package.json user@yourserver.com:/path/to/website/

# 3. Connect to server and restart
ssh user@yourserver.com
cd /path/to/website
npm start

# 4. Check it worked - look for this in logs:
# [Server] App version: a7f3b9e1
```

---

## What Happens to Your Users

### Users Already on Your Site
1. They keep using the site normally
2. After 5 minutes, a message appears: "New version available. Reload?"
3. If they click "Yes", they get the new version
4. If they click "No", they can keep using the old version

### Users Visiting for the First Time (or After Reload)
1. They automatically get the latest version
2. No old cached files
3. Everything works with the new code

---

## Common Questions

### Q: Do I need to do this every time I make a change?
**A:** Yes, if you want users to see the change. Always run `npm run build` before deploying.

### Q: What if I forget to build?
**A:** Users won't see your changes. The old version will still be active. Always build first!

### Q: What if the build fails?
**A:** Check the error message. Common issues:
- Missing dependencies: Run `npm install`
- TypeScript errors: Fix the errors in your code
- File permissions: Make sure you can write to `public/` folder

### Q: How do I know if deployment worked?
**A:** Check three things:
1. Server logs show the new version number
2. Visit your website and check the page source
3. Look for `?v=abc12345` in JavaScript/CSS file URLs

### Q: Can I skip any steps?
**A:** No! All three steps are required:
- ❌ Skip build → Users see old version
- ❌ Skip upload → Server has old files
- ❌ Skip restart → Server still running old code

---

## Troubleshooting

### Problem: Users still see old version

**Check:**
1. Did you run `npm run build`? ✅
2. Did you upload `public/version.json`? ✅
3. Did you restart the server? ✅
4. Check server logs - does it show the new version? ✅

**Solution:**
- Rebuild: `npm run build`
- Re-upload files
- Restart server again

---

### Problem: Build command fails

**Check:**
```bash
# Are dependencies installed?
npm install

# Are there TypeScript errors?
npm run build:ts

# Check the error message - it will tell you what's wrong
```

---

### Problem: Server won't start

**Check:**
```bash
# Are all files uploaded?
ls -la public/version.json

# Are dependencies installed on server?
npm install --production

# Check server logs for errors
```

---

## Quick Checklist

Before deploying, make sure:

- [ ] I made my code changes
- [ ] I ran `npm run build` successfully
- [ ] I see a new version number in the output
- [ ] I uploaded all required files
- [ ] I restarted the server
- [ ] Server logs show the new version
- [ ] I tested the website to make sure it works

---

## Tips for Success

1. **Always build before deploying** - This is the most important step
2. **Test locally first** - Run `npm run dev` to test changes
3. **Check server logs** - They tell you if everything worked
4. **Keep backups** - In case something goes wrong
5. **Deploy during low traffic** - If possible, update when fewer users are online

---

## Summary

**The 3 steps you always need:**
1. **Build** → `npm run build`
2. **Upload** → Copy files to server
3. **Restart** → Restart your server

That's it! Follow these steps every time you want to update your website, and users will automatically get the latest version.

---

## Need Help?

If something doesn't work:
1. Check the error messages - they usually tell you what's wrong
2. Verify all files were uploaded correctly
3. Make sure the server has the right permissions
4. Check server logs for detailed error information

Remember: The system is designed to work automatically once you follow these steps correctly!

