# Audit Form Feature

## Overview

The audit form feature has been refactored to follow Clean Architecture principles and project rules. The codebase is now modular, maintainable, and follows the 250-line file limit.

## Architecture

### Domain Layer (`domain/`)
- **entities.ts**: Core domain entities (AuditFormData, Scorecard, ScorecardParameter, Employee, Interaction)
- **types.ts**: Type definitions and interfaces

### Application Layer (`application/`)
- **audit-form-service.ts**: Business logic for audit form operations

### Infrastructure Layer (`infrastructure/`)
- **audit-form-repository.ts**: Data access layer using BaseRepository pattern

### Presentation Layer (`presentation/`)
- **templates/**: Template generators (header, transcript, splitter, form)
- **audit-template.ts**: Main entry point (replaces audit-template.js)

### Utilities (`utils/`)
- **date-formatter.ts**: Date formatting utilities
- **country-flags.ts**: Country flag emoji mapping
- **template-helpers.ts**: Common template helper functions

## File Structure

```
src/features/audit-form/
├── domain/
│   ├── entities.ts          (Domain entities)
│   └── types.ts             (Type definitions)
├── application/
│   └── audit-form-service.ts (Business logic)
├── infrastructure/
│   └── audit-form-repository.ts (Data access)
├── presentation/
│   ├── templates/
│   │   ├── header-template.ts
│   │   ├── transcript-template.ts
│   │   ├── splitter-template.ts
│   │   ├── form-template.ts
│   │   ├── compatibility.ts
│   │   └── index.ts
│   └── audit-template.ts    (Main entry point)
├── utils/
│   ├── date-formatter.ts
│   ├── country-flags.ts
│   └── template-helpers.ts
├── audit-form.html          (Main HTML file - to be refactored)
└── README.md
```

## Migration Notes

### From Old Structure

**Before:**
- `audit-template.js` (1,009 lines) - Single large file
- `audit-form.html` (16,671 lines) - Monolithic HTML file

**After:**
- Modular TypeScript files (all <250 lines)
- Clean Architecture separation
- Type-safe implementations
- Proper error handling

### Backward Compatibility

The new implementation maintains backward compatibility through:
- `compatibility.ts`: Exposes functions to `window` object
- Same function signatures as before
- Can be used as drop-in replacement

## Usage

### In HTML Files

```html
<!-- Old way (still works) -->
<script src="audit-template.js"></script>
<script>
  const html = window.generateAuditFormHTML({ audit: {...}, mode: 'edit' });
</script>

<!-- New way (recommended) -->
<script type="module">
  import { generateAuditFormHTML } from './presentation/audit-template.js';
  const html = generateAuditFormHTML({ audit: {...}, mode: 'edit' });
</script>
```

### In TypeScript Files

```typescript
import { generateAuditFormHTML } from './presentation/audit-template.js';
import { AuditFormService } from './application/audit-form-service.js';
import { DatabaseFactory } from '../../../infrastructure/database-factory.js';

const db = DatabaseFactory.createClient();
const repository = new AuditFormRepository(db);
const service = new AuditFormService(repository);

const audit = await service.loadAudit('fnchat_cfd_v4_0_v2', 'audit-id');
const html = generateAuditFormHTML({ audit, mode: 'view' });
```

## Security

- All HTML output uses `escapeHtml()` for XSS prevention
- Field whitelists used in all database queries
- Input validation via `sanitizeString()`
- No `innerHTML` usage - uses `safeSetHTML()` instead

## Next Steps

1. Refactor `audit-form.html` into smaller components
2. Create presentation components for error details and recommendations
3. Add unit tests for services and repositories
4. Create integration tests for template generators

