# Legacy Code Migration Documentation

**Complete guide for migrating legacy HTML/JavaScript files to the new Clean Architecture codebase.**

---

## 📚 Documentation Files

### 1. **[LEGACY_CODE_MIGRATION_GUIDE.md](./LEGACY_CODE_MIGRATION_GUIDE.md)** (Comprehensive Guide)
   - **Purpose**: Complete step-by-step migration guide
   - **Use When**: You need detailed instructions for migrating complex legacy files
   - **Contents**:
     - Pre-migration analysis
     - 8-phase migration process
     - Security compliance checklist
     - Architecture compliance
     - File size management
     - CSS migration
     - Data migration
     - Testing & validation
     - Common issues & solutions

### 2. **[MIGRATION_PROMPT.md](./MIGRATION_PROMPT.md)** (AI Assistant Prompt)
   - **Purpose**: Ready-to-use prompt for AI assistants
   - **Use When**: You want to use AI to help migrate legacy files
   - **Contents**:
     - Migration prompt template
     - Quick checklist version
     - Example migration
     - Common mistakes to avoid

### 3. **[MIGRATION_QUICK_REFERENCE.md](./MIGRATION_QUICK_REFERENCE.md)** (Quick Reference)
   - **Purpose**: One-page quick reference card
   - **Use When**: You need quick lookup during migration
   - **Contents**:
     - Architecture structure
     - Security rules table
     - Code patterns
     - Migration checklist
     - Common issues & solutions

---

## 🚀 Quick Start

### For First-Time Migrations

1. **Read**: Start with [LEGACY_CODE_MIGRATION_GUIDE.md](./LEGACY_CODE_MIGRATION_GUIDE.md)
2. **Use**: Copy the prompt from [MIGRATION_PROMPT.md](./MIGRATION_PROMPT.md)
3. **Reference**: Keep [MIGRATION_QUICK_REFERENCE.md](./MIGRATION_QUICK_REFERENCE.md) open

### For Quick Migrations

1. **Copy**: Use the prompt from [MIGRATION_PROMPT.md](./MIGRATION_PROMPT.md)
2. **Check**: Use checklist from [MIGRATION_QUICK_REFERENCE.md](./MIGRATION_QUICK_REFERENCE.md)
3. **Verify**: Follow security checklist

---

## 🎯 Migration Process Overview

### Phase 1: Setup
- Create feature directory structure
- Analyze legacy file

### Phase 2: Domain Layer
- Extract entities and types
- NO dependencies on other layers

### Phase 3: Infrastructure
- Create repository
- Extract database queries
- Use field whitelists

### Phase 4: Application
- Create service
- Extract business logic
- Add validation

### Phase 5: Presentation
- Create HTML template
- Create loader
- Create renderer
- Extract CSS

### Phase 6: Security
- Fix innerHTML → safeSetHTML
- Fix select('*') → field whitelists
- Fix direct Supabase → DatabaseFactory

### Phase 7: Testing
- Verify functionality
- Test security
- Check file sizes

---

## 🔒 Critical Security Rules

1. **NO `innerHTML`** → Use `safeSetHTML()` from `src/utils/html-sanitizer.ts`
2. **NO `select('*')`** → Use field whitelists from `src/core/constants/field-whitelists.ts`
3. **NO direct Supabase** → Use `DatabaseFactory.createClient()` (respects RLS)
4. **NO service role in client** → Use authenticated helper or server-side API
5. **RLS Policies** → Check/create RLS policies for all tables
6. **NO `console.log`** → Use `logInfo/logError/logWarn` from `src/utils/logging-helper.js`
7. **Escape user data** → Use `escapeHtml()` in templates
8. **Sanitize input** → Use `sanitizeString()` from `src/api/utils/validation.ts`

---

## 📏 File Size Limit

**Rule**: Maximum 250 lines per file

**How to Split**:
- Extract utilities to separate files
- Split CSS by component
- Split HTML into components
- Extract types to separate files

---

## 🏗️ Architecture Pattern

```
src/features/{feature-name}/
├── domain/              # Entities & types (NO dependencies)
├── infrastructure/       # Repository (data access)
├── application/         # Service (business logic)
└── presentation/        # UI (HTML, loader, renderer)
```

**Layer Rules**:
- Domain: NO imports from other layers
- Infrastructure: Can import from domain
- Application: Can import from domain & infrastructure
- Presentation: Can import from all layers

---

## 📚 Reference Files

### Base Classes
- `src/core/repository/base-repository.ts` - Base repository class
- `src/core/service/base-service.ts` - Base service class

### Security Utilities
- `src/utils/html-sanitizer.ts` - HTML sanitization
- `src/core/constants/field-whitelists.ts` - Database field whitelists
- `src/api/utils/validation.ts` - Input validation

### Documentation
- `docs/security/SECURITY_RULES.md` - Complete security rules
- `.cursorrules` - Architecture rules and patterns

### Examples
- `src/features/settings/scorecards/` - Migrated scorecard feature
- `src/features/audit-form/CONVERSION_SUMMARY.md` - Example conversion

---

## ✅ Migration Checklist

### Pre-Migration
- [ ] Analyzed legacy file
- [ ] Identified components
- [ ] **Checked existing RLS policies** for tables used
- [ ] **Identified RLS requirements** (who can read/write?)
- [ ] Created feature directory

### Domain Layer
- [ ] `entities.ts` (<250 lines, NO dependencies)
- [ ] `types.ts` (<250 lines, NO dependencies)

### Infrastructure Layer
- [ ] Repository extends `BaseRepository`
- [ ] Uses `IDatabaseClient`
- [ ] Uses `DatabaseFactory.createClient()` (respects RLS)
- [ ] Uses field whitelists
- [ ] Uses `executeQuery()`
- [ ] Handles RLS errors gracefully
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

### Security & RLS
- [ ] No `innerHTML` → `safeSetHTML()`
- [ ] No `select('*')` → field whitelists
- [ ] No direct Supabase → `DatabaseFactory` (respects RLS)
- [ ] No service role in client → authenticated helper or server API
- [ ] RLS policies created/updated for tables
- [ ] RLS tested with different user roles
- [ ] Input sanitization
- [ ] User data escaped

### Testing
- [ ] Functionality works
- [ ] Security tested (XSS, SQL injection)
- [ ] **RLS tested** (regular user, admin, unauthenticated)
- [ ] File sizes verified

---

## 🐛 Common Issues

| Issue | Solution |
|------|----------|
| Modal not displaying | Add `display: flex !important` |
| Data not loading | Check field names, whitelist, auth |
| Form not submitting | Check event listeners, service call |
| CSS not applied | Verify path, check specificity |
| TypeScript errors | Check types, imports |
| Security violations | Replace innerHTML, select('*'), Supabase |

---

## 🎓 Learning Path

1. **Start Here**: Read [LEGACY_CODE_MIGRATION_GUIDE.md](./LEGACY_CODE_MIGRATION_GUIDE.md) Phase 1-2
2. **Practice**: Migrate a small legacy file (<500 lines)
3. **Reference**: Use [MIGRATION_QUICK_REFERENCE.md](./MIGRATION_QUICK_REFERENCE.md) during migration
4. **Advanced**: Migrate large files (>1000 lines) using the full guide

---

## 💡 Tips

1. **Start Small**: Migrate one component at a time
2. **Test Often**: Test after each phase
3. **Use Examples**: Reference migrated features for patterns
4. **Security First**: Fix security violations immediately
5. **File Size**: Break down files as you go (don't wait until the end)

---

## 📞 Need Help?

1. Check the [LEGACY_CODE_MIGRATION_GUIDE.md](./LEGACY_CODE_MIGRATION_GUIDE.md) Common Issues section
2. Review example migrations in `src/features/`
3. Check security rules in `docs/security/SECURITY_RULES.md`
4. Review architecture patterns in `.cursorrules`

---

**Remember**: Migration is iterative. Start with one component, test it, then move to the next. Don't try to migrate everything at once.

