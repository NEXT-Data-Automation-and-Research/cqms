# Audit Form Rule Compliance Status

## Summary

The `audit-form.html` file (16,712 lines) has been analyzed for compliance with project rules. This document tracks the current status and migration progress.

## Critical Violations Found

### Security Violations (CRITICAL - Must Fix)

| Violation | Count | Status | Priority |
|-----------|-------|--------|----------|
| Direct `window.supabaseClient` usage | 30 | 🔴 Not Fixed | P0 |
| Unsafe `.select('*')` queries | 8 | 🔴 Not Fixed | P0 |
| XSS: `innerHTML` usage | 87 | 🔴 Not Fixed | P0 |
| Unstructured `console.log` | 308 | 🔴 Not Fixed | P1 |

### Architecture Violations

| Violation | Status | Priority |
|-----------|--------|----------|
| File exceeds 250-line limit (16,712 lines) | 🔴 Not Fixed | P2 |
| Direct database access (no repository pattern) | 🔴 Not Fixed | P1 |
| No error handling with AppError | 🔴 Not Fixed | P1 |
| Inline JavaScript (should be in modules) | 🔴 Not Fixed | P2 |

## Migration Infrastructure Created

### ✅ Completed

1. **Field Whitelists Updated**
   - Added `SCORECARD_AUDIT_FORM_FIELDS` to `field-whitelists.ts`
   - Added `SCORECARD_PARAMETER_FIELDS` to `field-whitelists.ts`

2. **Helper Module Created**
   - `utils/audit-form-helpers.ts` - Provides migration helpers
   - Functions: `getSupabaseClient()`, `setSafeHTML()`, `logger`
   - Field constants exported for easy import

3. **Migration Guide Created**
   - `MIGRATION_GUIDE.md` - Comprehensive migration instructions
   - Examples for each violation type
   - Step-by-step migration strategy

4. **CSS Paths Fixed**
   - Changed relative paths to absolute paths (`/theme.css`, `/sidebar.css`)

5. **Sidebar Loading Fixed**
   - Updated to use ES modules
   - Added authentication check before sidebar loads

## Migration Strategy

### Phase 1: Critical Security Fixes (P0)

**Estimated Time:** 2-3 days

1. Replace all `window.supabaseClient` with `getAuthenticatedSupabase()`
2. Replace all `.select('*')` with field whitelists
3. Replace all `innerHTML =` with `safeSetHTML()`
4. Replace all `console.log/error/warn` with structured logging

**Example Fix:**
```javascript
// Before (Line 1170-1172)
let query = window.supabaseClient
    .from('scorecards')
    .select('*')

// After
import { getSupabaseClient, SCORECARD_QUERY_FIELDS, logger } from '/js/features/audit-form/utils/audit-form-helpers.js';
const supabase = await getSupabaseClient();
let query = supabase
    .from('scorecards')
    .select(SCORECARD_QUERY_FIELDS)
```

### Phase 2: Architecture Improvements (P1)

**Estimated Time:** 1-2 weeks

1. Extract JavaScript functions to TypeScript modules
2. Use `AuditFormService` and `AuditFormRepository` for data access
3. Add proper error handling with `AppError`
4. Create controller modules for form logic

### Phase 3: File Size Reduction (P2)

**Estimated Time:** 2-3 weeks

1. Break HTML into smaller components
2. Extract inline styles to CSS files
3. Create presentation components
4. Each file <250 lines

## Quick Reference

### Import Helpers
```html
<script type="module">
  import { 
    getSupabaseClient, 
    setSafeHTML, 
    logger,
    SCORECARD_QUERY_FIELDS,
    SCORECARD_PARAMETER_QUERY_FIELDS,
    AUDIT_ASSIGNMENT_QUERY_FIELDS,
    AUDIT_FORM_QUERY_FIELDS
  } from '/js/features/audit-form/utils/audit-form-helpers.js';
</script>
```

### Common Patterns

**Supabase Query:**
```javascript
// ❌ Before
const { data } = await window.supabaseClient.from('table').select('*');

// ✅ After
const supabase = await getSupabaseClient();
const { data } = await supabase.from('table').select(FIELD_WHITELIST);
```

**HTML Setting:**
```javascript
// ❌ Before
element.innerHTML = '<div>...</div>';

// ✅ After
setSafeHTML(element, '<div>...</div>');
```

**Logging:**
```javascript
// ❌ Before
console.log('Message');
console.error('Error:', err);

// ✅ After
logger.info('Message');
logger.error('Error occurred:', err);
```

## Next Steps

1. **Immediate (This Week)**
   - Fix all P0 security violations
   - Test thoroughly after each fix
   - Update this document with progress

2. **Short Term (Next 2 Weeks)**
   - Complete Phase 1 migration
   - Start Phase 2 architecture improvements
   - Extract first controller module

3. **Long Term (Next Month)**
   - Complete Phase 2
   - Begin Phase 3 file breakdown
   - Create component library

## Notes

- File is too large to fix in one pass
- Focus on security violations first (P0)
- Test each section after migration
- Use helper module to reduce code duplication
- Maintain backward compatibility during migration

