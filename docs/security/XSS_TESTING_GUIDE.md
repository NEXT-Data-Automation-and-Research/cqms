# Testing Guide: Automatic XSS Protection
**Quick steps to verify the protection is working**

---

## Step 1: Build and Start Your App

Make sure your app is built and running:

```bash
npm run build
npm run serve
# OR
npm run dev
```

---

## Step 2: Open Browser Console

1. Open your app in the browser (usually `http://localhost:4000`)
2. Open Developer Tools (F12 or Right-click → Inspect)
3. Go to the **Console** tab

---

## Step 3: Check if Protection is Enabled

Look for this message in the console:

```
[Auto XSS Protection] ✅ Enabled - All innerHTML assignments will be automatically sanitized
[Auto XSS Protection] Using DOMPurify with your existing configuration
```

✅ **If you see this**: Protection is enabled!  
❌ **If you don't see it**: Check for errors in the console

---

## Step 4: Test Basic Sanitization

In the browser console, run this test:

```javascript
// Test 1: Create a div and try to set malicious HTML
const testDiv = document.createElement('div');
testDiv.innerHTML = '<script>alert("XSS Attack!")</script>';
console.log('Result:', testDiv.innerHTML);
// Expected: Should be empty or sanitized (script tag removed)
```

**Expected Result**: The `innerHTML` should be empty or the script tag should be removed.

---

## Step 5: Test with Various XSS Payloads

Run these tests in the console:

```javascript
// Test 2: Image with onerror
const div1 = document.createElement('div');
div1.innerHTML = '<img src=x onerror=alert(1)>';
console.log('Test 2 - Image XSS:', div1.innerHTML);
// Expected: onerror attribute should be removed

// Test 3: SVG with onload
const div2 = document.createElement('div');
div2.innerHTML = '<svg onload=alert(1)>';
console.log('Test 3 - SVG XSS:', div2.innerHTML);
// Expected: onload attribute should be removed

// Test 4: Safe HTML (should work)
const div3 = document.createElement('div');
div3.innerHTML = '<div style="color: red;">Safe HTML</div>';
console.log('Test 4 - Safe HTML:', div3.innerHTML);
// Expected: Should work fine (style attribute allowed)
```

**Expected Results**:
- Test 2 & 3: Malicious attributes (`onerror`, `onload`) should be removed
- Test 4: Safe HTML should work normally

---

## Step 6: Test Your Application UI

1. **Navigate through your app**:
   - Home page
   - Forms
   - Lists/Tables
   - Any page that displays user data

2. **Check visually**:
   - ✅ UI should look the same as before
   - ✅ Styling should be preserved
   - ✅ Interactive elements should work

3. **Test functionality**:
   - ✅ Buttons should work
   - ✅ Forms should submit
   - ✅ Data should load correctly
   - ✅ Links should work

---

## Step 7: Test with Real User Input (Optional)

If you have forms that accept user input:

1. Try entering XSS payloads:
   ```
   <script>alert('XSS')</script>
   <img src=x onerror=alert(1)>
   <svg onload=alert(1)>
   ```

2. **Expected**: These should be sanitized and not execute

---

## Step 8: Verify Protection Status

Check if protection is enabled programmatically:

```javascript
// In browser console
import { isAutoXSSProtectionEnabled } from './js/utils/auto-xss-protection.js';
isAutoXSSProtectionEnabled().then(enabled => {
  console.log('Protection enabled:', enabled);
});
```

Or check the console logs for the enable message.

---

## Troubleshooting

### Issue: Console shows errors

**Check**:
1. Is DOMPurify loaded? Check Network tab for `dompurify` requests
2. Is the module path correct? Check `./js/utils/auto-xss-protection.js` exists
3. Are there any import errors?

**Solution**: Check browser console for specific error messages

---

### Issue: Protection not working

**Check**:
1. Is the enable script running before other scripts?
2. Is DOMPurify in the import map?
3. Are there any console errors?

**Solution**: Make sure the enable script is placed **before** other module scripts in `index.html`

---

### Issue: UI looks broken

**Check**:
1. Are styles preserved?
2. Are event handlers working?
3. Is data loading correctly?

**Solution**: 
- Check console for warnings
- Test specific pages that look broken
- If needed, temporarily disable protection to compare:
  ```javascript
  import { disableAutoXSSProtection } from './js/utils/auto-xss-protection.js';
  disableAutoXSSProtection();
  ```

---

## Quick Test Checklist

- [ ] Console shows "✅ Enabled" message
- [ ] Test 1: Script tag is removed
- [ ] Test 2: Image onerror is removed
- [ ] Test 3: SVG onload is removed
- [ ] Test 4: Safe HTML works
- [ ] UI looks normal
- [ ] Buttons/links work
- [ ] Forms work
- [ ] Data loads correctly

---

## Success Criteria

✅ **Protection is working if**:
1. Console shows enable message
2. XSS payloads are sanitized (script tags removed)
3. UI looks normal
4. Functionality works

✅ **You're ready to deploy if**:
- All tests pass
- No console errors
- UI works normally
- No functionality broken

---

## Next Steps

If everything works:
1. ✅ Deploy to staging
2. ✅ Test thoroughly in staging
3. ✅ Monitor for any issues
4. ✅ Deploy to production

If issues occur:
1. Check console errors
2. Test specific pages
3. Consider disabling temporarily
4. Use manual migration as backup

---

**Questions?** Check the detailed docs:
- `docs/security/XSS_AUTO_PROTECTION_SOLUTION.md`
- `docs/security/XSS_AUTO_PROTECTION_QUICK_START.md`
