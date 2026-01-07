# Home Dashboard Modules

This directory contains modular components extracted from `home-main.ts` to enforce the 250-line file limit rule.

## Module Structure

### Core Modules
- `types.ts` - Type definitions and interfaces
- `date-filter-manager.ts` - Date filtering and week navigation
- `stats-calculator.ts` - Statistics calculation logic
- `stats-renderer.ts` - Statistics UI rendering
- `audit-loader.ts` - Audit data loading
- `audit-renderer.ts` - Audit UI rendering
- `notification-manager.ts` - Notification handling
- `event-manager.ts` - Calendar/event handling
- `user-profile-manager.ts` - User profile dashboard logic

### Utility Modules
- `utils.ts` - Common utility functions (already exists)
- `state.ts` - State management (already exists)

## Refactoring Pattern

When extracting from `home-main.ts`:
1. Identify a cohesive set of related functions
2. Create a new module file (max 250 lines)
3. Export functions/classes from the module
4. Import and use in `home-main.ts`
5. Update `home-main.ts` to be an orchestrator (coordination only)

## Example

**Before:**
```typescript
// home-main.ts (4000+ lines)
function calculateStats() { /* 200 lines */ }
function renderStats() { /* 150 lines */ }
```

**After:**
```typescript
// stats-calculator.ts (200 lines)
export class StatsCalculator {
  async calculate() { /* ... */ }
}

// stats-renderer.ts (150 lines)
export class StatsRenderer {
  render() { /* ... */ }
}

// home-main.ts (orchestrator, <250 lines)
import { StatsCalculator } from './modules/stats-calculator.js';
import { StatsRenderer } from './modules/stats-renderer.js';
```

