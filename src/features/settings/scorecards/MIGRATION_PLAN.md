# Scorecard Parameter Management Migration Plan

## Overview
Migrating parameter management logic from `legacy-scorecard.html` to modular TypeScript components following our architectural rules.

## Features to Migrate

### 1. Parameter Table Management ✅
- [x] Parameter utilities (toSnakeCase, validation helpers)
- [x] Parameter row component
- [ ] Parameter table component (refactor to <250 lines)
- [ ] Event handlers for parameter rows

### 2. Channel Selection ✅
- [x] Channel checkbox component with Select All
- [ ] Default channels selection UI
- [ ] Channel management modal

### 3. Parameter Features
- [ ] Field ID auto-generation from parameter name
- [ ] Scoring type restrictions (deductive/additive/hybrid)
- [ ] Field type restrictions (counter/radio based on scoring type)
- [ ] AI audit checkbox with prompt field toggle
- [ ] Parameter validation

### 4. Bulk Import
- [ ] CSV parsing
- [ ] Template download
- [ ] Import preview
- [ ] Parameter import

### 5. Template Loading
- [ ] Load deductive scorecard template
- [ ] Pre-configured error parameters

### 6. Modal Updates
- [ ] Update create modal with full parameter management
- [ ] Update edit modal with full parameter management
- [ ] Form submission with parameters

## File Structure

```
src/features/settings/scorecards/presentation/modals/
├── components/
│   ├── parameter-table.ts (refactor to <250 lines)
│   ├── parameter-row.ts ✅
│   ├── channel-checkboxes.ts ✅
│   └── bulk-import-modal.ts (to be created)
├── utils/
│   └── parameter-utils.ts ✅
├── create-modal.ts (update)
├── edit-modal.ts (update)
└── modal-initializer.ts (update)
```

## Implementation Steps

1. ✅ Create parameter utilities
2. ✅ Create parameter row component
3. ✅ Create channel checkboxes component
4. Refactor parameter-table.ts to use utilities (<250 lines)
5. Create event handlers module
6. Update create modal
7. Update edit modal
8. Create bulk import modal
9. Add template loading
10. Test and remove legacy file

