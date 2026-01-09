# Audit Form Migration Guide

## Overview

The `audit-form.html` file (16,712 lines) needs to be migrated to comply with project rules. This guide outlines the violations and migration strategy.

## Current Violations

### Critical Security Violations

1. **Direct Supabase Client Access** (30 instances)
   - ❌ `window.supabaseClient.from(...)`
   - ✅ Use `getAuthenticatedSupabase()` from `authenticated-supabase.js`

2. **Unsafe Field Selection** (8 instances)
   - ❌ `.select('*')`
   - ✅ Use field whitelists from `field-whitelists.ts`

3. **XSS Vulnerabilities** (87 instances)
   - ❌ `element.innerHTML = ...`
   - ✅ Use `safeSetHTML()` from `html-sanitizer.js`

4. **Unstructured Logging** (308 instances)
   - ❌ `console.log(...)`
   - ✅ Use `logInfo()`, `logError()`, `logWarn()` from `logging-helper.js`

### Architecture Violations

1. **File Size** (16,712 lines)
   - ❌ Exceeds 250-line limit by 6,684%
   - ✅ Break into smaller modules (<250 lines each)

2. **Direct Database Access**
   - ❌ Direct Supabase queries in HTML
   - ✅ Use repository/service pattern

3. **No Error Handling**
   - ❌ No `AppError` usage
   - ✅ Use `createDatabaseError()`, `createValidationError()`, etc.

## Migration Strategy

### Phase 1: Critical Security Fixes (Immediate)

1. **Replace Supabase Client Access**
   ```javascript
   // Before
   const { data, error } = await window.supabaseClient.from('scorecards').select('*');
   
   // After
   import { getAuthenticatedSupabase } from '/js/utils/authenticated-supabase.js';
   const supabase = await getAuthenticatedSupabase();
   const { data, error } = await supabase.from('scorecards').select(SCORECARD_AUDIT_FORM_FIELDS);
   ```

2. **Replace Field Selection**
   ```javascript
   // Before
   .select('*')
   
   // After
   .select(SCORECARD_AUDIT_FORM_FIELDS)
   ```

3. **Replace innerHTML**
   ```javascript
   // Before
   element.innerHTML = '<option>...</option>';
   
   // After
   import { safeSetHTML } from '/js/utils/html-sanitizer.js';
   safeSetHTML(element, '<option>...</option>');
   ```

4. **Replace console.log**
   ```javascript
   // Before
   console.log('Loading scorecards...');
   console.error('Error:', error);
   
   // After
   import { logInfo, logError } from '/js/utils/logging-helper.js';
   logInfo('Loading scorecards...');
   logError('Error loading scorecards:', error);
   ```

### Phase 2: Extract JavaScript to Modules

1. **Create Controller Modules**
   - `presentation/controllers/scorecard-controller.ts` - Scorecard loading logic
   - `presentation/controllers/audit-controller.ts` - Audit form logic
   - `presentation/controllers/assignment-controller.ts` - Assignment loading

2. **Create Service Wrappers**
   - Use existing `AuditFormService` for business logic
   - Use existing `AuditFormRepository` for data access

### Phase 3: Break Down HTML File

1. **Extract Components**
   - Header section → `presentation/components/audit-header.html`
   - Form section → `presentation/components/audit-form.html`
   - Assignment list → `presentation/components/assignment-list.html`

2. **Extract Styles**
   - Move inline styles to `presentation/styles/audit-form.css`

## Field Whitelists Reference

### Scorecards
```typescript
import { SCORECARD_AUDIT_FORM_FIELDS } from '/js/core/constants/field-whitelists.js';
```

### Scorecard Parameters
```typescript
import { SCORECARD_PARAMETER_FIELDS } from '/js/core/constants/field-whitelists.js';
```

### Audit Assignments
```typescript
import { AUDIT_ASSIGNMENT_FIELDS } from '/js/core/constants/field-whitelists.js';
```

### Audit Form Data
```typescript
import { AUDIT_FORM_FIELDS } from '/js/core/constants/field-whitelists.js';
// Note: This is an array, join with ', ' for queries
const fields = AUDIT_FORM_FIELDS.join(', ');
```

## Helper Module

Use `utils/audit-form-helpers.ts` for common operations:

```typescript
import { 
  getSupabaseClient, 
  setSafeHTML, 
  logger,
  SCORECARD_QUERY_FIELDS 
} from './utils/audit-form-helpers.js';

// Get authenticated client
const supabase = await getSupabaseClient();

// Safe HTML setting
setSafeHTML(element, htmlString);

// Structured logging
logger.info('Message');
logger.error('Error:', error);
```

## Migration Checklist

- [ ] Replace all `window.supabaseClient` with `getAuthenticatedSupabase()`
- [ ] Replace all `.select('*')` with field whitelists
- [ ] Replace all `innerHTML =` with `safeSetHTML()`
- [ ] Replace all `console.log/error/warn` with structured logging
- [ ] Extract JavaScript to TypeScript modules
- [ ] Break HTML into smaller components
- [ ] Add proper error handling with `AppError`
- [ ] Use repository/service pattern for data access

## Priority Order

1. **Security fixes** (Phase 1) - Critical for production
2. **Architecture fixes** (Phase 2) - Important for maintainability
3. **File size reduction** (Phase 3) - Long-term refactoring

## Notes

- The file is too large to refactor in one pass
- Focus on critical security violations first
- Create helper modules to reduce duplication
- Test each section after migration
- Maintain backward compatibility during migration

