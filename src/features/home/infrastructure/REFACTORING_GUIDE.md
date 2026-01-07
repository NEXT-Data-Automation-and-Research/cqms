# Home Main Refactoring Guide

## Current State
- `home-main.ts`: **4,297 lines** (VIOLATION - exceeds 250 line limit by 4,047 lines)
- Must be broken down into modular components

## Refactoring Plan

### Phase 1: Extract Core Modules ✅
- [x] `types.ts` - Type definitions
- [x] `date-filter-manager.ts` - Date filtering logic
- [ ] `stats-calculator.ts` - Statistics calculation (~600 lines)
- [ ] `stats-renderer.ts` - Statistics UI rendering (~150 lines)
- [ ] `audit-loader.ts` - Audit data loading (~400 lines)
- [ ] `audit-renderer.ts` - Audit UI rendering (~300 lines)
- [ ] `notification-manager.ts` - Notification handling (~400 lines)
- [ ] `event-manager.ts` - Calendar/event handling (~200 lines)
- [ ] `user-profile-manager.ts` - User profile logic (~200 lines)
- [ ] `filter-manager.ts` - Filter population and rendering (~150 lines)

### Phase 2: Extract Utilities
- [x] `utils.ts` - Already exists
- [x] `state.ts` - Already exists
- [ ] `event-listeners.ts` - Event listener setup (~200 lines)

### Phase 3: Refactor Main File
- [ ] `home-main.ts` - Orchestrator only (<250 lines)
  - Imports all modules
  - Coordinates initialization
  - Sets up event listeners
  - Delegates to modules

## Module Extraction Pattern

### Step 1: Identify Cohesive Functions
Look for functions that:
- Work with the same data
- Have related responsibilities
- Can be grouped logically

### Step 2: Create Module File
```typescript
// modules/stats-calculator.ts
import type { StatsData, PeriodDates, Audit, Scorecard } from '../types.js';
import { homeState } from '../state.js';

export class StatsCalculator {
  async calculate(period: PeriodDates): Promise<StatsData> {
    // Calculation logic
  }
}
```

### Step 3: Update home-main.ts
```typescript
// home-main.ts
import { StatsCalculator } from './modules/stats-calculator.js';

const statsCalculator = new StatsCalculator();
await statsCalculator.calculate(period);
```

## Target Structure

```
infrastructure/
├── types.ts (250 lines)
├── state.ts (60 lines)
├── utils.ts (240 lines)
├── date-filter-manager.ts (250 lines)
├── home-main.ts (200 lines) - ORCHESTRATOR ONLY
└── modules/
    ├── stats-calculator.ts (250 lines)
    ├── stats-renderer.ts (150 lines)
    ├── audit-loader.ts (250 lines)
    ├── audit-renderer.ts (250 lines)
    ├── notification-manager.ts (250 lines)
    ├── event-manager.ts (200 lines)
    ├── user-profile-manager.ts (200 lines)
    └── filter-manager.ts (150 lines)
```

## Progress Tracking

- **Total lines to extract**: ~4,047 lines
- **Target modules**: 9 modules
- **Average lines per module**: ~225 lines (within limit)

## Next Steps

1. Extract stats calculator (highest priority - largest chunk)
2. Extract audit manager (second largest)
3. Extract notification manager
4. Extract remaining modules
5. Refactor home-main.ts to be orchestrator only

