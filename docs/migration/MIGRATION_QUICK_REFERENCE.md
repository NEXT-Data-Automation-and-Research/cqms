# Legacy Code Migration - Quick Reference Card

**One-page reference for migrating legacy files**

---

## 🏗️ Architecture Structure

```
src/features/{feature-name}/
├── domain/
│   ├── entities.ts      # Domain entities (NO dependencies)
│   └── types.ts         # Types (NO dependencies)
├── infrastructure/
│   └── {feature}-repository.ts  # Data access (extends BaseRepository)
├── application/
│   ├── {feature}-service.ts     # Business logic (extends BaseService)
│   └── {feature}-state.ts       # State management (optional)
└── presentation/
    ├── {feature}.html           # HTML template (<250 lines)
    ├── {feature}-loader.ts      # Initialization
    ├── {feature}-renderer.ts    # DOM rendering (optional)
    ├── {feature}-events.ts      # Event handlers (optional)
    ├── components/              # UI components (optional)
    └── styles/
        └── {feature}.css        # CSS (<250 lines each)
```

---

## 🔒 Security Rules (CRITICAL)

| ❌ WRONG | ✅ CORRECT |
|----------|-----------|
| `element.innerHTML = html` | `safeSetHTML(element, html)` |
| `select('*')` | `select(FIELD_WHITELIST.join(','))` |
| `getSupabase()` | `DatabaseFactory.createClient()` |
| `console.log()` | `logInfo/logError/logWarn()` |
| `<div>${userData}</div>` | `<div>${escapeHtml(userData)}</div>` |
| Direct Supabase access | Use DatabaseFactory (authenticated) |

**Files**:
- HTML Sanitization: `src/utils/html-sanitizer.ts`
- Field Whitelists: `src/core/constants/field-whitelists.ts`
- Input Validation: `src/api/utils/validation.ts`
- Logging: `src/utils/logging-helper.js`

---

## 📏 File Size Limit

**Rule**: Maximum 250 lines per file

**How to Split**:
- Extract utilities → `{feature}-utils.ts`
- Extract validators → `{feature}-validators.ts`
- Extract types → `types.ts`
- Split CSS by component → `{feature}-table.css`, `{feature}-modal.css`
- Split HTML into components → `components/header.html`, `components/table.html`

---

## 🔐 Row Level Security (RLS) Migration

**CRITICAL**: New codebase enforces RLS at database level. Legacy code might bypass RLS.

### RLS Differences

| Legacy Code | New Codebase |
|-------------|--------------|
| Direct Supabase (might bypass RLS) | `DatabaseFactory.createClient()` (respects RLS) |
| Service role key (bypasses ALL RLS) | Authenticated helper (RLS enforced) |
| No RLS policies | RLS policies on all tables |

### RLS Migration Steps

1. **Check Existing Policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'your_table';
   ```

2. **Create/Update Policies** (if needed):
   ```sql
   ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Authenticated users can read"
   ON your_table FOR SELECT
   USING (auth.role() = 'authenticated');
   ```

3. **Use Authenticated Access**:
   ```typescript
   // ✅ Uses authenticated helper (respects RLS)
   const db = DatabaseFactory.createClient();
   const result = await db.from('table').select('*').execute();
   ```

4. **Handle RLS Errors**:
   ```typescript
   try {
     const result = await db.from('table').select('*').execute();
   } catch (error: any) {
     if (error.code === '42501') {
       // RLS blocked access - handle gracefully
       return [];
     }
   }
   ```

### Common RLS Issues

| Issue | Solution |
|-------|----------|
| Permission denied | Check/create RLS policies |
| Empty results | Policy too restrictive - adjust conditions |
| Service role needed | Move to server-side API with admin check |

---

## 🗄️ Database Access Pattern

```typescript
// infrastructure/{feature}-repository.ts
import { BaseRepository } from '../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import { FEATURE_FIELDS } from '../../../core/constants/field-whitelists.js';

export class FeatureRepository extends BaseRepository {
  constructor(db: IDatabaseClient) {
    super(db, 'table_name');
  }

  async findAll(): Promise<Entity[]> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from(this.getTableName())
          .select(FEATURE_FIELDS.join(',')) // ✅ Field whitelist
          .execute<Entity[]>();
        return result || [];
      },
      'Failed to fetch entities'
    );
  }

  async create(data: Entity): Promise<Entity> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from(this.getTableName())
          .insert(data)
          .select(FEATURE_FIELDS.join(','))
          .single()
          .execute<Entity>();
        this.invalidateCache('entities_list'); // ✅ Cache invalidation
        return result;
      },
      'Failed to create entity'
    );
  }
}
```

---

## 💼 Service Pattern

```typescript
// application/{feature}-service.ts
import { BaseService } from '../../../core/service/base-service.js';
import { FeatureRepository } from '../infrastructure/feature-repository.js';
import { createValidationError } from '../../../core/errors/app-error.js';

export class FeatureService extends BaseService {
  constructor(private repository: FeatureRepository) {
    super();
  }

  async createEntity(data: Entity): Promise<Entity> {
    // ✅ Input validation
    this.validateInput(data.name, (name) => 
      !name ? 'Name is required' : null
    );

    // ✅ Business logic with error handling
    return this.executeBusinessLogic(
      async () => {
        // Business rules here
        return await this.repository.create(data);
      },
      'Failed to create entity'
    );
  }
}
```

---

## 🎨 Presentation Pattern

```typescript
// presentation/{feature}-loader.ts
import { DatabaseFactory } from '../../../infrastructure/database-factory.js';
import { FeatureRepository } from '../infrastructure/feature-repository.js';
import { FeatureService } from '../application/feature-service.js';
import { FeatureController } from './feature-controller.js';

async function init(): Promise<void> {
  const db = DatabaseFactory.createClient();
  const repository = new FeatureRepository(db);
  const service = new FeatureService(repository);
  const controller = new FeatureController(service);
  await controller.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

```typescript
// presentation/{feature}-renderer.ts
import { safeSetHTML, escapeHtml } from '../../../utils/html-sanitizer.js';

export class FeatureRenderer {
  render(data: Entity[]): void {
    const html = data.map(item => 
      `<div>${escapeHtml(item.name)}</div>` // ✅ Escape user data
    ).join('');
    safeSetHTML(this.container, html); // ✅ Safe HTML
  }
}
```

---

## 🎨 CSS Migration

**Extract inline styles**:
```html
<!-- ❌ Before -->
<style>
  .container { ... }
</style>

<!-- ✅ After -->
<link rel="stylesheet" href="/presentation/styles/feature.css">
```

**Critical display properties**:
```css
.modal.active {
  display: flex !important; /* ✅ Force display */
  z-index: 1000;
}
```

---

## ✅ Migration Checklist

### Pre-Migration
- [ ] Analyze legacy file structure
- [ ] Identify components
- [ ] Create feature directory

### Domain Layer
- [ ] `entities.ts` (<250 lines, NO dependencies)
- [ ] `types.ts` (<250 lines, NO dependencies)

### Infrastructure Layer
- [ ] Repository extends `BaseRepository`
- [ ] Uses `IDatabaseClient`
- [ ] Uses field whitelists
- [ ] Uses `executeQuery()`
- [ ] Cache invalidation
- [ ] File <250 lines

### Application Layer
- [ ] Service extends `BaseService`
- [ ] Uses `validateInput()`
- [ ] Uses `executeBusinessLogic()`
- [ ] NO database access
- [ ] NO DOM manipulation
- [ ] File <250 lines

### Presentation Layer
- [ ] HTML template (<250 lines)
- [ ] Loader for initialization
- [ ] Renderer (uses `safeSetHTML`)
- [ ] Event handlers
- [ ] CSS extracted (<250 lines each)

### Security
- [ ] No `innerHTML` → `safeSetHTML()`
- [ ] No `select('*')` → field whitelists
- [ ] No direct Supabase → `DatabaseFactory`
- [ ] Input sanitization
- [ ] User data escaped

### Testing
- [ ] Functionality works
- [ ] Security tested
- [ ] File sizes verified

---

## 🚨 Common Issues

| Issue | Solution |
|------|----------|
| Modal not displaying | Add `display: flex !important` |
| Data not loading | Check field names, whitelist, auth |
| Form not submitting | Check event listeners, service call |
| CSS not applied | Verify path, check specificity |
| TypeScript errors | Check types, imports |
| Security violations | Replace innerHTML, select('*'), Supabase |

---

## 📚 Key Files

- **Migration Guide**: `docs/migration/LEGACY_CODE_MIGRATION_GUIDE.md`
- **Security Rules**: `docs/security/SECURITY_RULES.md`
- **Base Repository**: `src/core/repository/base-repository.ts`
- **Base Service**: `src/core/service/base-service.ts`
- **HTML Sanitizer**: `src/utils/html-sanitizer.ts`
- **Field Whitelists**: `src/core/constants/field-whitelists.ts`

---

**Remember**: Start small, test often, iterate!

