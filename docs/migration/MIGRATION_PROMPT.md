# Legacy Code Migration Prompt

**Use this prompt when migrating legacy files to the new codebase.**

---

## 🎯 Migration Prompt Template

Copy and customize this prompt for your migration:

```
I need to migrate a legacy file to the new Clean Architecture codebase following all project rules.

**Legacy File**: [path/to/legacy-file.html or .js]
**Feature Name**: [feature-name]
**Current File Size**: [X lines]

**Migration Requirements**:

1. **Architecture**: Follow Clean Architecture pattern
   - Domain layer: entities.ts, types.ts (NO dependencies)
   - Infrastructure layer: repository extending BaseRepository
   - Application layer: service extending BaseService
   - Presentation layer: HTML, loader, renderer, events

2. **File Size Limit**: ALL files must be <250 lines
   - Break down large files into smaller modules
   - Extract utilities, validators, helpers to separate files
   - Split CSS into component-specific files

3. **Security Compliance** (CRITICAL):
   - ❌ NO `innerHTML` → ✅ Use `safeSetHTML()` from `src/utils/html-sanitizer.ts`
   - ❌ NO `select('*')` → ✅ Use field whitelists from `src/core/constants/field-whitelists.ts`
   - ❌ NO direct `getSupabase()` → ✅ Use `DatabaseFactory.createClient()`
   - ✅ All user input escaped with `escapeHtml()` in templates
   - ✅ Input sanitization with `sanitizeString()` from `src/api/utils/validation.ts`
   - ✅ Generic error messages (no sensitive data)

4. **Database Access**:
   - Repository extends `BaseRepository`
   - Uses `IDatabaseClient` interface (NOT direct Supabase)
   - Uses `DatabaseFactory.createClient()` (respects RLS)
   - Uses `executeQuery()` wrapper for error handling
   - Implements cache invalidation with `invalidateCache()`
   - Field whitelists for all SELECT queries

5. **Row Level Security (RLS)**:
   - **CRITICAL**: New codebase enforces RLS at database level
   - Legacy code might have used service role or direct access (bypassed RLS)
   - Check existing RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'your_table'`
   - Create/update RLS policies if needed
   - Use `DatabaseFactory.createClient()` which respects RLS (uses authenticated helper)
   - Handle RLS errors gracefully (permission denied, empty results)
   - If service role needed, move to server-side API with admin protection

6. **Business Logic**:
   - Service extends `BaseService`
   - Uses `validateInput()` for input validation
   - Uses `executeBusinessLogic()` wrapper
   - NO direct database access
   - NO DOM manipulation

7. **Presentation Layer**:
   - HTML template (<250 lines)
   - Loader for initialization
   - Renderer for DOM manipulation (uses safeSetHTML)
   - Event handlers for user interactions
   - CSS extracted to separate files (<250 lines each)

8. **Error Handling**:
   - Uses `AppError` or helper functions (`createDatabaseError`, `createValidationError`, `createBusinessError`)
   - Proper error logging with `logError/logWarn/logInfo` from `src/utils/logging-helper.js`
   - NO `console.log`

9. **CSS Migration**:
   - Extract all `<style>` blocks to separate CSS files
   - Use `!important` for critical display properties (modals)
   - Replace inline styles with CSS classes
   - Split large CSS files by component

10. **Data Migration**:
   - Map old field names to new structure
   - Transform data formats (e.g., JSON strings to arrays)
   - Add validation for migrated data
   - Handle data structure changes

**Migration Steps**:

1. **Phase 1: Setup & RLS Analysis**
   - Create feature directory structure
   - **Check existing RLS policies** for tables used by legacy code
   - **Identify RLS requirements** (who can read/write?)
   - **Create/update RLS policies** if needed

2. **Phase 2: Domain Layer**
   - Create feature directory: `src/features/{feature-name}/`
   - Create layer directories: `domain/`, `infrastructure/`, `application/`, `presentation/`

   - Extract entities and types (NO dependencies)
   - Keep files <250 lines

3. **Phase 3: Infrastructure**
   - Create repository extending BaseRepository
   - Extract all database queries
   - Use field whitelists
   - Use `DatabaseFactory.createClient()` (respects RLS)
   - Handle RLS errors gracefully

4. **Phase 4: Application**
   - Create service extending BaseService
   - Extract business logic
   - Add input validation
   - NO database access, NO DOM manipulation

5. **Phase 5: Presentation**
   - Extract HTML template
   - Create loader for initialization
   - Create renderer (uses safeSetHTML)
   - Create event handlers
   - Extract CSS to separate files

6. **Phase 6: Security & RLS**
   - Replace all innerHTML with safeSetHTML()
   - Replace select('*') with field whitelists
   - Replace direct Supabase with DatabaseFactory (respects RLS)
   - Replace service role access with authenticated helper or server-side API
   - Add input sanitization
   - Escape all user data in templates
   - Test RLS policies with different user roles

7. **Phase 7: Testing**
   - Verify functionality works
   - Test security (XSS, SQL injection)
   - **Test RLS policies** (regular user, admin, unauthenticated)
   - Verify file sizes <250 lines
   - Check TypeScript types

**Please start with Phase 1 and work through each phase systematically.**
```

---

## 📋 Quick Checklist Version

For quick reference, use this checklist:

```
Migrate legacy file: [file-path]

✅ Architecture:
  [ ] Domain layer (entities.ts, types.ts)
  [ ] Infrastructure layer (repository)
  [ ] Application layer (service)
  [ ] Presentation layer (HTML, loader, renderer)

✅ File Size:
  [ ] All files <250 lines
  [ ] Large files split into modules
  [ ] CSS extracted to separate files

✅ Security:
  [ ] No innerHTML → safeSetHTML()
  [ ] No select('*') → field whitelists
  [ ] No direct Supabase → DatabaseFactory
  [ ] Input sanitization added
  [ ] User data escaped in templates

✅ Database:
  [ ] Repository extends BaseRepository
  [ ] Uses IDatabaseClient interface
  [ ] Uses executeQuery() wrapper
  [ ] Field whitelists for SELECT

✅ Business Logic:
  [ ] Service extends BaseService
  [ ] Uses validateInput()
  [ ] Uses executeBusinessLogic()
  [ ] No direct DB access
  [ ] No DOM manipulation

✅ Error Handling:
  [ ] Uses AppError helpers
  [ ] Uses logging helper (no console.log)
  [ ] Generic error messages

✅ CSS:
  [ ] Extracted to separate files
  [ ] Critical properties use !important
  [ ] Files <250 lines each

✅ Testing:
  [ ] Functionality verified
  [ ] Security tested
  [ ] File sizes checked
```

---

## 🔧 Example: Migrating Scorecard Feature

**Legacy File**: `src/features/settings/scorecards/legacy-scorecard.html` (3284 lines)

**Migration Steps**:

1. **Analyze**: Identify components (stats, table, modals, forms)
2. **Domain**: Extract Scorecard entity, ScorecardParameter entity, types
3. **Infrastructure**: Create ScorecardRepository with CRUD operations
4. **Application**: Create ScorecardService with business logic
5. **Presentation**: 
   - Create scorecard.html (main template)
   - Create scorecard-loader.ts (initialization)
   - Create scorecard-controller.ts (orchestration)
   - Create scorecard-renderer.ts (UI rendering)
   - Create scorecard-events.ts (event handlers)
   - Extract CSS to scorecard.css, scorecard-table.css, scorecard-modal.css
6. **Security**: Fix all innerHTML, select('*'), direct Supabase access
7. **Testing**: Verify all functionality works

**Result**: Multiple small, focused files (<250 lines each) following Clean Architecture.

---

## 🚨 Common Mistakes to Avoid

1. **Don't skip security fixes** - innerHTML, select('*'), direct Supabase are critical violations
2. **Don't create files >250 lines** - Break them down immediately
3. **Don't mix layers** - Domain can't import from infrastructure/application/presentation
4. **Don't use direct Supabase** - Always use DatabaseFactory
5. **Don't forget field whitelists** - Never use select('*')
6. **Don't use console.log** - Use logging helper
7. **Don't expose sensitive data** - Generic error messages only
8. **Don't forget CSS extraction** - Move styles to separate files

---

## 📚 Reference Files

- **Migration Guide**: `docs/migration/LEGACY_CODE_MIGRATION_GUIDE.md`
- **Security Rules**: `docs/security/SECURITY_RULES.md`
- **Architecture**: `.cursorrules` (Feature Architecture section)
- **Example**: `src/features/settings/scorecards/` (migrated scorecard feature)
- **Base Classes**: 
  - `src/core/repository/base-repository.ts`
  - `src/core/service/base-service.ts`
- **Security Utils**:
  - `src/utils/html-sanitizer.ts`
  - `src/core/constants/field-whitelists.ts`
  - `src/api/utils/validation.ts`

---

**Remember**: Migration is iterative. Start with one component, test it, then move to the next.

