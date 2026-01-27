# XSS Auto-Protection Testing Guide
**Step-by-step guide to verify automatic XSS protection is working**

---

## Prerequisites

1. ✅ **Build your application**:
   ```bash
   npm run build
   ```

2. ✅ **Start your server**:
   ```bash
   npm run serve
   # OR
   npm run dev
   ```

3. ✅ **Open your app** in browser (usually `http://localhost:4000`)

---

## Test 1: Verify Protection is Enabled

### Step 1: Open Browser Console
- Press **F12** (or Right-click → Inspect)
- Go to **Console** tab

### Step 2: Look for Enable Message
You should see:
```
[Auto XSS Protection] ✅ Enabled - All innerHTML assignments will be automatically sanitized
[Auto XSS Protection] Using DOMPurify with your existing configuration
```

✅ **If you see this**: Protection is enabled!  
❌ **If you don't see it**: Check for errors (see Troubleshooting section)

---

## Test 2: Basic Sanitization Test

### In Browser Console, Run:

```javascript
// Test 1: Script tag should be removed
const test1 = document.createElement('div');
test1.innerHTML = '<script>alert("XSS Attack!")</script>';
console.log('Test 1 - Script tag:', test1.innerHTML);
// Expected: Should be empty "" (script removed)
```

**Expected Result**: `test1.innerHTML` should be empty `""` or the script tag should be removed.

---

## Test 3: Comprehensive XSS Payload Tests

### Copy and paste this entire block into console:

```javascript
console.log('=== XSS Auto-Protection Tests ===\n');

// Test 2: Image with onerror
const div2 = document.createElement('div');
div2.innerHTML = '<img src=x onerror=alert(1)>';
console.log('Test 2 - Image XSS:', div2.innerHTML);
console.log('Expected: onerror attribute removed');
console.log('');

// Test 3: SVG with onload
const div3 = document.createElement('div');
div3.innerHTML = '<svg onload=alert(1)>';
console.log('Test 3 - SVG XSS:', div3.innerHTML);
console.log('Expected: onload attribute removed');
console.log('');

// Test 4: JavaScript protocol in href
const div4 = document.createElement('div');
div4.innerHTML = '<a href="javascript:alert(1)">Click me</a>';
console.log('Test 4 - JavaScript protocol:', div4.innerHTML);
console.log('Expected: javascript: protocol removed or sanitized');
console.log('');

// Test 5: Iframe injection
const div5 = document.createElement('div');
div5.innerHTML = '<iframe src="javascript:alert(1)"></iframe>';
console.log('Test 5 - Iframe XSS:', div5.innerHTML);
console.log('Expected: iframe removed or sanitized');
console.log('');

// Test 6: Event handler in div
const div6 = document.createElement('div');
div6.innerHTML = '<div onclick="alert(1)">Click me</div>';
console.log('Test 6 - Inline event handler:', div6.innerHTML);
console.log('Expected: onclick attribute removed');
console.log('');

// Test 7: Safe HTML (should work)
const div7 = document.createElement('div');
div7.innerHTML = '<div style="color: red;">Safe HTML</div>';
console.log('Test 7 - Safe HTML:', div7.innerHTML);
console.log('Expected: Should work fine (style allowed)');
console.log('');

// Test 8: Safe link (should work)
const div8 = document.createElement('div');
div8.innerHTML = '<a href="https://example.com">Safe Link</a>';
console.log('Test 8 - Safe link:', div8.innerHTML);
console.log('Expected: Should work fine');
console.log('');

console.log('=== Tests Complete ===');
```

### Expected Results:

| Test | Input | Expected Output |
|------|-------|-----------------|
| Test 2 | `<img src=x onerror=alert(1)>` | `onerror` attribute removed |
| Test 3 | `<svg onload=alert(1)>` | `onload` attribute removed |
| Test 4 | `<a href="javascript:alert(1)">` | `javascript:` protocol removed |
| Test 5 | `<iframe src="javascript:alert(1)">` | Iframe removed or sanitized |
| Test 6 | `<div onclick="alert(1)">` | `onclick` attribute removed |
| Test 7 | `<div style="color: red;">Safe HTML</div>` | ✅ Works normally |
| Test 8 | `<a href="https://example.com">Safe Link</a>` | ✅ Works normally |

---

## Test 4: Test in Your Application UI

### Step 1: Navigate Through Your App
1. Go to **Home page**
2. Check **Forms** (if any)
3. Check **User lists/tables**
4. Check **Any page that displays user data**

### Step 2: Visual Check
- ✅ **UI should look normal** (same as before)
- ✅ **Styling should be preserved**
- ✅ **Layout should be correct**
- ✅ **No broken elements**

### Step 3: Functionality Check
- ✅ **Buttons should work**
- ✅ **Links should work**
- ✅ **Forms should submit**
- ✅ **Data should load correctly**
- ✅ **Interactive elements should respond**

---

## Test 5: Test with Real User Input (If You Have Forms)

### If your app has forms that accept user input:

1. **Try entering XSS payloads**:
   ```
   <script>alert('XSS')</script>
   <img src=x onerror=alert(1)>
   <svg onload=alert(1)>
   ```

2. **Submit the form**

3. **Expected**: 
   - These should be **sanitized** when displayed
   - **No alert popups** should appear
   - Content should be **escaped** or **removed**

---

## Test 6: Verify Protection Status Programmatically

### In Browser Console:

```javascript
// Check if protection is enabled
// Note: This requires the module to be accessible
// If you get an error, that's okay - check console logs instead

// Alternative: Check if innerHTML setter is overridden
const testDiv = document.createElement('div');
const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML');
console.log('innerHTML descriptor:', originalDescriptor);
console.log('Protection enabled if setter is custom function');
```

---

## Test 7: Performance Test

### Check if sanitization impacts performance:

```javascript
console.time('Sanitization Performance');

// Test 1000 innerHTML assignments
for (let i = 0; i < 1000; i++) {
  const div = document.createElement('div');
  div.innerHTML = `<div>Test ${i}</div>`;
}

console.timeEnd('Sanitization Performance');
// Expected: Should complete in <100ms (negligible impact)
```

---

## Test 8: Edge Cases

### Test with special characters and edge cases:

```javascript
// Test 9: Special characters
const div9 = document.createElement('div');
div9.innerHTML = '<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>';
console.log('Test 9 - Escaped HTML:', div9.innerHTML);
console.log('Expected: Should preserve escaped content');

// Test 10: Empty string
const div10 = document.createElement('div');
div10.innerHTML = '';
console.log('Test 10 - Empty string:', div10.innerHTML);
console.log('Expected: Should handle empty string');

// Test 11: Null/undefined (should not break)
const div11 = document.createElement('div');
try {
  div11.innerHTML = null;
  console.log('Test 11 - Null:', div11.innerHTML);
} catch (e) {
  console.log('Test 11 - Null error:', e.message);
}
console.log('Expected: Should handle null gracefully');

// Test 12: Very long content
const div12 = document.createElement('div');
div12.innerHTML = '<div>' + 'A'.repeat(10000) + '</div>';
console.log('Test 12 - Long content:', div12.innerHTML.length);
console.log('Expected: Should handle long content');
```

---

## Test Checklist

Use this checklist to verify everything works:

- [ ] **Console shows "✅ Enabled" message**
- [ ] **Test 1**: Script tag is removed
- [ ] **Test 2**: Image onerror is removed
- [ ] **Test 3**: SVG onload is removed
- [ ] **Test 4**: JavaScript protocol is removed
- [ ] **Test 5**: Iframe is removed/sanitized
- [ ] **Test 6**: Inline event handlers are removed
- [ ] **Test 7**: Safe HTML works normally
- [ ] **Test 8**: Safe links work normally
- [ ] **UI looks normal** (no visual breakage)
- [ ] **Buttons/links work** (functionality preserved)
- [ ] **Forms work** (can submit)
- [ ] **Data loads correctly** (no data loss)
- [ ] **Performance is acceptable** (<100ms for 1000 operations)

---

## Troubleshooting

### Issue: Console shows errors

**Error**: `Failed to load module` or `Cannot find module`

**Solution**:
1. Make sure you ran `npm run build`
2. Check if `public/js/utils/auto-xss-protection.js` exists
3. Check browser console for specific error message
4. Verify import path in `index.html` is correct

---

### Issue: Protection not working (XSS executes)

**Symptoms**: Alert popups appear, scripts execute

**Check**:
1. Is protection enabled? (check console for enable message)
2. Is DOMPurify loaded? (check Network tab)
3. Are there any console errors?

**Solution**:
1. Verify `enableAutoXSSProtection()` is called in `index.html`
2. Check if DOMPurify is in import map
3. Reload page (hard refresh: Ctrl+Shift+R)

---

### Issue: UI looks broken

**Symptoms**: Styles missing, layout broken, elements not rendering

**Check**:
1. Are styles preserved? (check Test 7)
2. Are event handlers working?
3. Is data loading correctly?

**Solution**:
1. Check console for warnings
2. Test specific pages that look broken
3. Temporarily disable protection to compare:
   ```javascript
   // In console
   import { disableAutoXSSProtection } from './js/utils/auto-xss-protection.js';
   disableAutoXSSProtection();
   // Reload page and compare
   ```

---

### Issue: Performance is slow

**Symptoms**: Page loads slowly, interactions lag

**Check**:
1. Run Test 7 (Performance Test)
2. Check browser DevTools → Performance tab

**Solution**:
- DOMPurify is fast (<1ms per sanitization)
- If slow, check for other performance issues
- Consider excluding specific elements if needed

---

## Success Criteria

✅ **Protection is working correctly if**:

1. ✅ Console shows enable message
2. ✅ XSS payloads are sanitized (script tags removed)
3. ✅ Safe HTML works normally
4. ✅ UI looks normal (no visual breakage)
5. ✅ Functionality works (buttons, forms, etc.)
6. ✅ Performance is acceptable
7. ✅ No console errors

---

## What to Report

If you find issues, report:

1. **Test number** that failed
2. **Expected vs Actual** result
3. **Console errors** (if any)
4. **Browser** and version
5. **Page/feature** where issue occurs
6. **Screenshots** (if UI is broken)

---

## Next Steps After Testing

### If All Tests Pass ✅:
1. ✅ **Deploy to staging**
2. ✅ **Test thoroughly in staging**
3. ✅ **Monitor for any issues**
4. ✅ **Deploy to production**

### If Issues Found ⚠️:
1. **Document the issue** (use checklist above)
2. **Check Troubleshooting** section
3. **Consider disabling temporarily** if critical
4. **Fix issues** before deploying

---

## Quick Test Script

Copy this entire script into browser console for quick testing:

```javascript
(async function() {
  console.log('🧪 Starting XSS Auto-Protection Tests...\n');
  
  const tests = [
    { name: 'Script tag', html: '<script>alert(1)</script>', expectEmpty: true },
    { name: 'Image onerror', html: '<img src=x onerror=alert(1)>', expectEmpty: false },
    { name: 'SVG onload', html: '<svg onload=alert(1)>', expectEmpty: false },
    { name: 'JavaScript protocol', html: '<a href="javascript:alert(1)">Link</a>', expectEmpty: false },
    { name: 'Safe HTML', html: '<div style="color: red;">Safe</div>', expectEmpty: false },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const div = document.createElement('div');
    div.innerHTML = test.html;
    const result = div.innerHTML;
    
    const isSafe = test.expectEmpty 
      ? result === '' || !result.includes('<script')
      : !result.includes('onerror') && !result.includes('onload') && !result.includes('javascript:');
    
    if (isSafe) {
      console.log(`✅ ${test.name}: PASSED`);
      passed++;
    } else {
      console.log(`❌ ${test.name}: FAILED`);
      console.log(`   Input: ${test.html}`);
      console.log(`   Output: ${result}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '🎉 All tests passed!' : '⚠️ Some tests failed - check output above');
})();
```

---

**Questions?** Check:
- `docs/security/XSS_AUTO_PROTECTION_SOLUTION.md` - Detailed documentation
- `docs/security/XSS_AUTO_PROTECTION_QUICK_START.md` - Quick start guide
- `docs/security/XSS_TESTING_GUIDE.md` - Original testing guide
