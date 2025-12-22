# Home Main Refactoring Plan

## Current State
- **File**: `home-main.ts` (~4160 lines)
- **Issues**: 
  - Too long and hard to maintain
  - Mixed concerns (data fetching, UI rendering, state management)
  - Difficult to test and reuse

## Proposed Structure

### 1. **types.ts** ✅ Created
- All TypeScript interfaces and type definitions
- Global Window interface declarations

### 2. **state.ts** ✅ Created
- Centralized state management
- HomeState class with all state variables
- Initialize and reset methods

### 3. **date-filter.ts** ✅ Created
- DateFilterManager class
- All date filtering logic
- Week navigation
- Date range handling

### 4. **utils.ts** ✅ Created
- Utility functions (formatTimestamp, escapeHtml, etc.)
- Helper functions (getInitials, formatAgentName)
- Status chip generators
- Navigation functions

### 5. **data-service.ts** (To Create)
- All data fetching functions
- Supabase queries
- Data transformation
- Functions:
  - `loadAllUsers()`
  - `loadRecentUpdates()`
  - `loadAssignedAudits()`
  - `loadNotifications()`
  - `loadUpcomingEvents()`
  - `fetchAndCacheStats()`
  - `fetchAndCacheFilters()`

### 6. **ui-renderer.ts** (To Create)
- All UI rendering functions
- DOM manipulation
- Functions:
  - `renderRecentUpdatesFromData()`
  - `renderAssignedAudits()`
  - `renderStatsFromData()`
  - `renderFiltersFromData()`
  - `renderNotifications()`
  - `renderEventsList()`
  - `updateUserAvatar()`
  - `populatePremiumDashboard()`

### 7. **event-handlers.ts** (To Create)
- Event listener setup
- Click handlers
- Modal handlers
- Functions:
  - `setupEventListeners()`
  - `handleNotificationClick()`
  - `showNotifications()`
  - `hideNotifications()`
  - `showCalendar()`
  - `hideCalendar()`
  - `showGrid()`
  - `hideGrid()`

### 8. **home-main.ts** (Refactored)
- Main orchestrator file (~200-300 lines)
- Imports all modules
- Initializes dashboard
- Coordinates between modules

## Benefits

1. **Maintainability**: Each module has a single responsibility
2. **Testability**: Functions can be tested in isolation
3. **Reusability**: Modules can be used in other pages
4. **Readability**: Smaller, focused files are easier to understand
5. **Collaboration**: Multiple developers can work on different modules

## Migration Strategy

1. ✅ Extract types to `types.ts`
2. ✅ Extract state to `state.ts`
3. ✅ Extract date filter logic to `date-filter.ts`
4. ✅ Extract utilities to `utils.ts`
5. Extract data services to `data-service.ts`
6. Extract UI rendering to `ui-renderer.ts`
7. Extract event handlers to `event-handlers.ts`
8. Refactor `home-main.ts` to use all modules
9. Update imports in `home-page.html`

## File Size Targets

- `types.ts`: ~200 lines
- `state.ts`: ~80 lines
- `date-filter.ts`: ~300 lines
- `utils.ts`: ~250 lines
- `data-service.ts`: ~800 lines
- `ui-renderer.ts`: ~600 lines
- `event-handlers.ts`: ~300 lines
- `home-main.ts`: ~200-300 lines

**Total**: ~2800 lines (vs 4160 original)
**Reduction**: ~33% fewer lines due to better organization

